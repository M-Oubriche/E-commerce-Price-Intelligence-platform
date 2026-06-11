import os
import json
import uuid
import shutil
from pathlib import Path
from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator
from airflow.operators.trigger_dagrun import TriggerDagRunOperator
from google.cloud import bigtable

# Default args for the DAG
default_args = {
    'owner': 'data-engineering',
    'depends_on_past': False,
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=1),
}


def process_raw_files_to_bigtable():
    """
    Reads all .jsonl files in /data/raw/, parses them,
    pushes rows to Bigtable using the schema rules,
    and moves processed files to /data/archive/.
    """
    raw_dir = Path("/data/raw")
    archive_dir = Path("/data/archive")
    
    # Initialize Bigtable Client
    project_id  = os.environ.get("BIGTABLE_PROJECT_ID")
    instance_id = os.environ.get("BIGTABLE_INSTANCE_ID")
    if not project_id or not instance_id:
        raise EnvironmentError(
            "BIGTABLE_PROJECT_ID and BIGTABLE_INSTANCE_ID must be set. "
            "Check your .env file and docker-compose.yml."
        )
    table_id = "ecommerce_prices"
    
    client = bigtable.Client(project=project_id, admin=True)
    instance = client.instance(instance_id)
    table = instance.table(table_id)

    # find all jsonl files
    files = list(raw_dir.glob("**/*.jsonl"))
    if not files:
        print("No raw data files found to process.")
        return

    archive_dir.mkdir(parents=True, exist_ok=True)
    
    total_processed = 0

    for file_path in files:
        print(f"Processing {file_path}...")
        
        # We will collect mutations
        rows = []
        
        with open(file_path, 'r', encoding='utf-8') as f:
            for line_no, line in enumerate(f, start=1):
                if not line.strip():
                    continue
                try:
                    record = json.loads(line)
                    
                    # Row Key Format: {category}#{brand}#{product_id}#{source}#{timestamp}
                    category = record.get('product', {}).get('category', 'Unknown').upper()
                    brand = record.get('product', {}).get('brand', 'Unknown').replace(" ", "_")
                    product_id = record.get('product', {}).get('external_id', 'Unknown')
                    source = record.get('source', 'Unknown')
                    
                    scraped_at = record.get('scraped_at', datetime.utcnow().isoformat())
                    # Convert timestamp format safely for row key (e.g. 2026-03-01T10:00:00Z -> 20260301100000)
                    try:
                        dt = datetime.fromisoformat(scraped_at.replace('Z', '+00:00'))
                        ts_str = dt.strftime("%Y%m%d%H%M%S")
                    except ValueError:
                        ts_str = "00000000000000"
                    
                    row_key = f"{category}#{brand}#{product_id}#{source}#{ts_str}".encode('utf-8')
                    
                    # Create Bigtable row
                    row = table.direct_row(row_key)
                    
                    # 1. Ingestion CF
                    row.set_cell("ingestion_cf", b"raw_id", record.get("raw_id", str(uuid.uuid4())).encode('utf-8'))
                    row.set_cell("ingestion_cf", b"ingestion_type", b"batch")
                    row.set_cell("ingestion_cf", b"scraped_at", scraped_at.encode('utf-8'))
                    
                    # 2. Metadata CF
                    prod = record.get("product", {})
                    row.set_cell("metadata_cf", b"name", prod.get("name", "").encode('utf-8'))
                    row.set_cell("metadata_cf", b"brand", prod.get("brand", "").encode('utf-8'))
                    row.set_cell("metadata_cf", b"category", prod.get("category", "").encode('utf-8'))
                    row.set_cell("metadata_cf", b"source", source.encode('utf-8'))
                    row.set_cell("metadata_cf", b"source_url", record.get("source_url", "").encode('utf-8'))
                    row.set_cell("metadata_cf", b"external_id", prod.get("external_id", "Unknown").encode('utf-8')) # FIX: Bug 1
                    
                    model_number = prod.get("model_number")
                    if model_number:
                        row.set_cell("metadata_cf", b"model_number", model_number.encode('utf-8'))
                    
                    if prod.get("description") is not None:
                        row.set_cell("metadata_cf", b"description", prod.get("description").encode('utf-8')) # FIX: Bug 3

                    image_url = prod.get("image_url")
                    if image_url:
                        row.set_cell("metadata_cf", b"image_url", image_url.encode('utf-8'))
                        
                    # 3. Price CF
                    pricing = record.get("pricing", {})
                    for p_field in ["raw_price", "converted_price_usd", "original_price_usd", "discount_percent", "conversion_rate_used"]: # FIX: Bug 2
                        if pricing.get(p_field) is not None:
                            row.set_cell("price_cf", p_field.encode('utf-8'), str(pricing.get(p_field)).encode('utf-8')) # FIX: Bug 2
                    
                    raw_currency = pricing.get("raw_currency")
                    if raw_currency:
                        row.set_cell("price_cf", b"raw_currency", raw_currency.encode('utf-8'))

                    # 4. Availability CF
                    avail = record.get("availability", {})
                    row.set_cell("availability_cf", b"in_stock", str(avail.get("in_stock", False)).encode('utf-8'))
                    
                    if avail.get("quantity") is not None:
                         row.set_cell("availability_cf", b"quantity", str(avail.get("quantity")).encode('utf-8'))
                    if avail.get("shipping_available") is not None:
                        row.set_cell("availability_cf", b"shipping_available", str(avail.get("shipping_available")).encode('utf-8')) # FIX: Bug 4
                    
                    # 5. Seller CF
                    seller = record.get("seller", {})
                    if seller.get("seller_name"):
                        row.set_cell("seller_cf", b"seller_name", seller.get("seller_name").encode('utf-8'))
                    if seller.get("seller_type"):
                        row.set_cell("seller_cf", b"seller_type", seller.get("seller_type").encode('utf-8')) # FIX: Bug 5
                    if seller.get("seller_rating") is not None:
                        row.set_cell("seller_cf", b"seller_rating", str(seller.get("seller_rating")).encode('utf-8'))
                    if seller.get("seller_location"):
                        row.set_cell("seller_cf", b"seller_location", seller.get("seller_location").encode('utf-8')) # FIX: Bug 5
                        
                    # 6. Ratings CF
                    ratings = record.get("ratings", {})
                    if ratings.get("avg_rating") is not None:
                        row.set_cell("ratings_cf", b"avg_rating", str(ratings.get("avg_rating")).encode('utf-8'))
                    if ratings.get("review_count") is not None:
                        row.set_cell("ratings_cf", b"review_count", str(ratings.get("review_count")).encode('utf-8'))
                        
                    # 7. Specs CF
                    specs = record.get("specs", {})
                    if specs:
                        valid_categories = {
                            "GPU", "CPU", "RAM", "SSD", "HDD", "Monitor", "Keyboard",
                            "Mouse", "PSU", "Case", "Cooling", "Motherboard", "Laptop",
                            "Desktop", "Mobile", "Peripheral", "Other"
                        }
                        if isinstance(specs, dict) and all(
                            k in valid_categories and (v is None or isinstance(v, dict))
                            for k, v in specs.items()
                        ):
                            row.set_cell("specs_cf", b"json_blob", json.dumps(specs).encode('utf-8'))
                        else:
                            import sys
                            print(f"WARNING: Malformed specs on line {line_no} in {file_path}. Skipping.", file=sys.stderr)

                    rows.append(row)

                except Exception as e:
                    print(f"Error parsing line {line_no} in {file_path}: {e}")
                    
            # Mutate rows in batch (max 100k per batch, our files are small enough)
            if rows:
                print(f"Writing {len(rows)} rows to Bigtable...")
                # Note: table.mutate_rows handles batch operations
                response = table.mutate_rows(rows)
                # Check for errors
                failed = sum(1 for status in response if status.code != 0)
                if failed > 0:
                    print(f"WARNING: {failed} mutations failed.")
                total_processed += (len(rows) - failed)

        # Archive file after processing
        dest_dir = archive_dir / datetime.now().strftime("%Y-%m-%d")
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_file = dest_dir / file_path.name
        
        print(f"Archiving {file_path} -> {dest_file}")
        shutil.move(str(file_path), str(dest_file))
        
    print(f"Ingestion completed. {total_processed} rows pushed to Bigtable.")


with DAG(
    'ingest_ecommerce_prices',
    default_args=default_args,
    description='Stage 1+2: Run scrapers → ingest JSONL files into Bigtable, then trigger export to BigQuery',
    schedule_interval='@daily',
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=['scraping', 'ingestion', 'pipeline'],
) as dag:

    # Task 1: Ensure /data/archive exists
    ensure_archive = BashOperator(
        task_id='ensure_archive_dir',
        bash_command='mkdir -p /data/archive',
    )

    # Task 2: Trigger the existing scraper docker container
    run_scrapers = BashOperator(
        task_id='run_scrapers_container',
        bash_command='docker exec -w /app/scrapers price_scraper python main.py'
    )

    # Task 3: Process the resulting files → push to Bigtable
    ingest_to_bigtable = PythonOperator(
        task_id='push_to_bigtable',
        python_callable=process_raw_files_to_bigtable
    )

    # Task 4: Trigger the export DAG (Bigtable → BigQuery → dbt)
    # This creates the end-to-end chain without coupling the two DAGs into one
    trigger_export = TriggerDagRunOperator(
        task_id='trigger_bigquery_export_and_dbt',
        trigger_dag_id='bigtable_to_bigquery_export',
        wait_for_completion=False,  # Fire-and-forget; export DAG has its own retries
        reset_dag_run=True,
    )

    ensure_archive >> run_scrapers >> ingest_to_bigtable >> trigger_export

