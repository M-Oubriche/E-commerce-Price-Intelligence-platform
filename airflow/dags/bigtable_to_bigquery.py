"""
bigtable_to_bigquery.py
========================
Pipeline Stage: Bigtable → BigQuery → dbt

This DAG is the bridge between the real-time / batch ingestion layers (NiFi/Airflow)
and the analytics layer (dbt → BigQuery marts → Backend API).

Flow:
  1. export_bigtable_to_bigquery  — scan Bigtable, flatten wide-column rows, append
                                    new records into BigQuery `raw_ecommerce_prices`
                                    (uses WRITE_APPEND + dedup to preserve history)
  2. trigger_dbt_run              — runs `dbt run` inside the price_dbt container
                                    to materialize all staging, cleaned, and mart models
  3. trigger_dbt_test             — runs `dbt test` to catch data quality regressions

Schedule: @daily (can be manually triggered any time)
"""
import os
import logging
import json
from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# DAG defaults
# ---------------------------------------------------------------------------
default_args = {
    "owner": "data-engineering",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=3),
}

# ---------------------------------------------------------------------------
# Helper: decode a single Bigtable cell value
# ---------------------------------------------------------------------------
def _cell(row, family: str, col: str, default=None):
    """Return the latest cell value as a decoded UTF-8 string."""
    cells = row.cells.get(family, {}).get(col.encode("utf-8"), [])
    return cells[0].value.decode("utf-8") if cells else default


def _safe_float(val):
    try:
        return float(val) if val is not None else None
    except (ValueError, TypeError):
        return None


def _safe_int(val):
    try:
        return int(float(val)) if val is not None else None
    except (ValueError, TypeError):
        return None


def _safe_bool(val):
    if val is None:
        return None
    return str(val).lower() in ("true", "1", "yes")


# ---------------------------------------------------------------------------
# Task 1: Bigtable → BigQuery (incremental append with dedup)
# ---------------------------------------------------------------------------
def export_bigtable_to_bigquery(**context):
    """
    Full table scan of Bigtable `ecommerce_prices`, flattens all column families
    into a flat record, and appends only *new* rows into BigQuery
    `raw_ecommerce_prices` (deduplication is done via the row_key field).

    Strategy:
      - WRITE_APPEND so historical snapshots are never lost.
      - We fetch the set of row_keys already in BigQuery and skip those.
      - This is safe for our data volumes (< 1 M rows). For very large tables,
        switch to a streaming insert filtered by max(scraped_at).
    """
    from google.cloud import bigtable as bt
    from google.cloud import bigquery

    project_id  = os.environ["BIGTABLE_PROJECT_ID"]
    instance_id = os.environ["BIGTABLE_INSTANCE_ID"]
    bq_project  = os.environ.get("BIGQUERY_PROJECT_ID", project_id)
    bq_dataset  = os.environ.get("BIGQUERY_DATASET", "price_intelligence")
    table_id    = f"{bq_project}.{bq_dataset}.raw_ecommerce_prices"

    log.info("Connecting to Bigtable project=%s instance=%s", project_id, instance_id)
    bt_client = bt.Client(project=project_id, admin=True)
    instance  = bt_client.instance(instance_id)
    table     = instance.table("ecommerce_prices")

    if not table.exists():
        log.warning("Bigtable table 'ecommerce_prices' does not exist – nothing to export.")
        return

    # ---- 1. Read all rows from Bigtable ----
    log.info("Scanning Bigtable rows…")
    all_rows = list(table.read_rows())
    log.info("Read %d rows from Bigtable.", len(all_rows))
    if not all_rows:
        return

    # ---- 2. Fetch existing row_keys from BigQuery to avoid duplicates ----
    bq_client = bigquery.Client(project=bq_project)
    existing_keys: set = set()
    try:
        query = f"SELECT DISTINCT row_key FROM `{table_id}`"
        existing_keys = {row.row_key for row in bq_client.query(query).result()}
        log.info("Found %d existing row_keys in BigQuery.", len(existing_keys))
    except Exception as exc:
        # Table might not exist yet on the very first run – that's fine.
        log.info("Could not fetch existing keys (first run?): %s", exc)

    # ---- 3. Parse & filter ----
    new_records = []
    for row in all_rows:
        row_key_str = row.row_key.decode("utf-8")
        if row_key_str in existing_keys:
            continue  # already exported

        parts = row_key_str.split("#")
        category_key  = parts[0] if len(parts) > 0 else None
        brand_key     = parts[1] if len(parts) > 1 else None
        product_id_key = parts[2] if len(parts) > 2 else None
        source_key    = parts[3] if len(parts) > 3 else None
        timestamp_key = parts[4] if len(parts) > 4 else None

        scraped_at_str = _cell(row, "ingestion_cf", "scraped_at")
        if not scraped_at_str and timestamp_key:
            try:
                dt = datetime.strptime(timestamp_key, "%Y%m%d%H%M%S")
                scraped_at_str = dt.isoformat() + "Z"
            except Exception:
                pass

        # Compute is_price_drop from current vs original price (no historical lookup)
        _conv_price = _safe_float(_cell(row, "price_cf", "converted_price_usd"))
        _orig_price = _safe_float(_cell(row, "price_cf", "original_price_usd"))
        if _conv_price is not None and _orig_price is not None and _orig_price > 0 and _conv_price < _orig_price:
            _is_drop = True
            _drop_pct = round((_orig_price - _conv_price) / _orig_price * 100, 2)
        else:
            _is_drop = None
            _drop_pct = None

        # Combine all column families into one flat dict
        record = {
            "row_key":             row_key_str,
            "raw_id":              _cell(row, "ingestion_cf", "raw_id"),
            "ingestion_type":      _cell(row, "ingestion_cf", "ingestion_type", "unknown"),
            "is_price_drop":       _is_drop,
            "price_drop_percent":  _drop_pct,
            "source":              _cell(row, "metadata_cf", "source", source_key),
            "source_url":          _cell(row, "metadata_cf", "source_url"),
            "scraped_at":          scraped_at_str,
            "product_external_id": product_id_key,
            "product_name":        _cell(row, "metadata_cf", "name"),
            "product_brand":       _cell(row, "metadata_cf", "brand", brand_key),
            "product_category":    _cell(row, "metadata_cf", "category", category_key),
            "product_image_url":   _cell(row, "metadata_cf", "image_url"),
            "raw_price":           _safe_float(_cell(row, "price_cf", "raw_price")),
            "raw_currency":        _cell(row, "price_cf", "raw_currency"),
            "converted_price_usd": _safe_float(_cell(row, "price_cf", "converted_price_usd")),
            "original_price_usd":  _safe_float(_cell(row, "price_cf", "original_price_usd")),
            "discount_percent":    _safe_float(_cell(row, "price_cf", "discount_percent")),
            "conversion_rate":     _safe_float(_cell(row, "price_cf", "conversion_rate_used")),
            "in_stock":            _safe_bool(_cell(row, "availability_cf", "in_stock")),
            "quantity":            _safe_int(_cell(row, "availability_cf", "quantity")),
            "seller_name":         _cell(row, "seller_cf", "seller_name"),
            "seller_rating":       _safe_float(_cell(row, "seller_cf", "seller_rating")),
            "avg_rating":          _safe_float(_cell(row, "ratings_cf", "avg_rating")),
            "review_count":        _safe_int(_cell(row, "ratings_cf", "review_count")),
            "specs_json":          _cell(row, "specs_cf", "json_blob"),
        }
        new_records.append(record)

    log.info("%d new rows to insert into BigQuery.", len(new_records))
    if not new_records:
        log.info("All rows already present in BigQuery – nothing to do.")
        return

    # ---- 4. Define schema (BigQuery auto-creates the table on first run) ----
    schema = [
        bigquery.SchemaField("row_key",             "STRING",    mode="REQUIRED"),
        bigquery.SchemaField("raw_id",              "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("ingestion_type",      "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("is_price_drop",       "BOOLEAN",   mode="NULLABLE"),
        bigquery.SchemaField("price_drop_percent",  "FLOAT",     mode="NULLABLE"),
        bigquery.SchemaField("source",              "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("source_url",          "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("scraped_at",          "TIMESTAMP", mode="NULLABLE"),
        bigquery.SchemaField("product_external_id", "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("product_name",        "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("product_brand",       "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("product_category",    "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("product_image_url",   "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("raw_price",           "FLOAT",     mode="NULLABLE"),
        bigquery.SchemaField("raw_currency",        "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("converted_price_usd", "FLOAT",     mode="NULLABLE"),
        bigquery.SchemaField("original_price_usd",  "FLOAT",     mode="NULLABLE"),
        bigquery.SchemaField("discount_percent",    "FLOAT",     mode="NULLABLE"),
        bigquery.SchemaField("conversion_rate",     "FLOAT",     mode="NULLABLE"),
        bigquery.SchemaField("in_stock",            "BOOLEAN",   mode="NULLABLE"),
        bigquery.SchemaField("quantity",            "INTEGER",   mode="NULLABLE"),
        bigquery.SchemaField("seller_name",         "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("seller_rating",       "FLOAT",     mode="NULLABLE"),
        bigquery.SchemaField("avg_rating",          "FLOAT",     mode="NULLABLE"),
        bigquery.SchemaField("review_count",        "INTEGER",   mode="NULLABLE"),
        bigquery.SchemaField("specs_json",          "STRING",    mode="NULLABLE"),
    ]

    job_config = bigquery.LoadJobConfig(
        schema=schema,
        write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
    )

    log.info("Loading %d rows into %s…", len(new_records), table_id)
    load_job = bq_client.load_table_from_json(new_records, table_id, job_config=job_config)
    load_job.result()  # blocks until done
    log.info("BigQuery load completed. rows_inserted=%d", len(new_records))

    # Push metrics to XCom for downstream visibility
    context["ti"].xcom_push(key="rows_exported", value=len(new_records))


# ---------------------------------------------------------------------------
# DAG definition
# ---------------------------------------------------------------------------
with DAG(
    dag_id="bigtable_to_bigquery_export",
    default_args=default_args,
    description=(
        "Stage 3/3: Export Bigtable → BigQuery (incremental), "
        "then run dbt to materialize marts consumed by the Backend API."
    ),
    schedule_interval="@daily",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["export", "bigquery", "dbt", "pipeline"],
) as dag:

    # Task 1: Bigtable → BigQuery
    export_task = PythonOperator(
        task_id="export_bigtable_to_bigquery",
        python_callable=export_bigtable_to_bigquery,
    )

    # Task 2: dbt run — materialise all 14 models (staging views + mart tables)
    # We call `docker exec` on the already-running price_dbt container.
    # The container has credentials + profiles.yml mounted, so dbt just works.
    dbt_run_task = BashOperator(
        task_id="dbt_run",
        bash_command="docker exec -w /dbt price_dbt dbt run --profiles-dir /root/.dbt",
    )

    # Task 3: dbt test — fail the DAG run if data quality regressions detected
    dbt_test_task = BashOperator(
        task_id="dbt_test",
        bash_command="docker exec -w /dbt price_dbt dbt test --profiles-dir /root/.dbt",
    )

    # Task 4: regenerate dbt docs so the lineage graph stays current
    dbt_docs_task = BashOperator(
        task_id="dbt_docs_generate",
        bash_command="docker exec -w /dbt price_dbt dbt docs generate --profiles-dir /root/.dbt",
        # Don't fail the DAG if docs generation fails (non-critical)
        trigger_rule="all_done",
    )

    export_task >> dbt_run_task >> dbt_test_task >> dbt_docs_task
