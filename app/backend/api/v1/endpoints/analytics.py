"""
analytics.py — BigQuery Mart Analytics Endpoint
=================================================
Connects to GCP BigQuery and queries the dbt-materialized mart tables.
This is the final step in the pipeline: dbt Marts → Backend API.

Endpoints:
  GET /api/v1/analytics/price-summary?category=&source=&limit=
  GET /api/v1/analytics/category-trends
  GET /api/v1/analytics/cross-platform?product_id=
  GET /api/v1/analytics/brand-comparison?category=
  GET /api/v1/analytics/price-drops

All results are cached in Redis (30 min TTL) to avoid hammering BigQuery.
"""
import json
import logging
import os
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from google.cloud import bigquery
from google.oauth2 import service_account

from core.redis import redis_client

log = logging.getLogger(__name__)
router = APIRouter()

# ---------------------------------------------------------------------------
# BigQuery client factory (uses the same service account as dbt/Airflow)
# ---------------------------------------------------------------------------
_bq_client: Optional[bigquery.Client] = None


def get_bq_client() -> bigquery.Client:
    global _bq_client
    if _bq_client is None:
        creds_path = os.environ.get(
            "GOOGLE_APPLICATION_CREDENTIALS",
            "/secrets/bigquery-service-account.json"
        )
        project = os.environ.get("BIGQUERY_PROJECT_ID", "price-intelligence-2026")
        try:
            credentials = service_account.Credentials.from_service_account_file(creds_path)
            _bq_client = bigquery.Client(project=project, credentials=credentials)
            log.info("BigQuery client initialized for project=%s", project)
        except Exception as exc:
            log.error("Failed to init BigQuery client: %s", exc)
            raise HTTPException(status_code=503, detail="Analytics service unavailable")
    return _bq_client


BQ_PROJECT = os.environ.get("BIGQUERY_PROJECT_ID", "price-intelligence-2026")
BQ_DATASET = os.environ.get("BIGQUERY_DATASET", "price_intelligence")
CACHE_TTL = 1800  # 30 minutes


async def _cached_query(cache_key: str, sql: str) -> list:
    """Run a BigQuery query with Redis caching."""
    # 1. Check cache
    cached = await redis_client.get(cache_key)
    if cached:
        log.debug("Cache hit: %s", cache_key)
        return json.loads(cached)

    # 2. Run BigQuery query
    try:
        client = get_bq_client()
        rows = [dict(row) for row in client.query(sql).result()]
        # Serialize — convert non-JSON-serializable types
        for row in rows:
            for k, v in row.items():
                if hasattr(v, "isoformat"):
                    row[k] = v.isoformat()
        await redis_client.set(cache_key, json.dumps(rows), ex=CACHE_TTL)
        return rows
    except HTTPException:
        raise
    except Exception as exc:
        log.error("BigQuery query failed: %s | SQL: %s", exc, sql[:200])
        raise HTTPException(status_code=502, detail=f"Analytics query failed: {exc}")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/price-summary",
    summary="Price statistics per product from mart_price_analytics",
    tags=["analytics"],
)
async def price_summary(
    category: Optional[str] = Query(None, description="Filter by product category (GPU, CPU, RAM, SSD…)"),
    source: Optional[str] = Query(None, description="Filter by source platform (jumia, bestbuy…)"),
    limit: int = Query(50, ge=1, le=500),
):
    """
    Returns avg/min/max price and volatility per product per source.
    Powered by dbt mart: `mart_price_analytics`.
    """
    where_clauses = []
    if category:
        where_clauses.append(f"LOWER(product_category) = LOWER('{category}')")
    if source:
        where_clauses.append(f"LOWER(source) = LOWER('{source}')")

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
    sql = f"""
        SELECT
            product_external_id,
            product_name,
            product_brand,
            product_category,
            source,
            total_scrapes,
            ROUND(avg_price_usd, 2)       AS avg_price_usd,
            ROUND(min_price_usd, 2)       AS min_price_usd,
            ROUND(max_price_usd, 2)       AS max_price_usd,
            ROUND(price_volatility_usd, 2) AS price_volatility_usd,
            last_scraped_at
        FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_price_analytics`
        {where_sql}
        ORDER BY total_scrapes DESC
        LIMIT {limit}
    """
    cache_key = f"analytics:price-summary:{category}:{source}:{limit}"
    return {"data": await _cached_query(cache_key, sql)}


@router.get(
    "/category-trends",
    summary="Weekly price trends per category from mart_category_trends",
    tags=["analytics"],
)
async def category_trends(
    category: Optional[str] = Query(None),
    weeks: int = Query(12, ge=1, le=52),
):
    """
    Returns weekly avg/min/max price per product category for the last N weeks.
    Powered by dbt mart: `mart_category_trends`.
    """
    where_sql = f"WHERE LOWER(product_category) = LOWER('{category}')" if category else ""
    sql = f"""
        SELECT
            scrape_week,
            product_category,
            unique_products,
            total_observations,
            ROUND(avg_price_usd, 2)       AS avg_price_usd,
            ROUND(min_price_usd, 2)       AS min_price_usd,
            ROUND(max_price_usd, 2)       AS max_price_usd,
            ROUND(price_volatility_usd, 2) AS price_volatility_usd
        FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_category_trends`
        {where_sql}
        ORDER BY scrape_week DESC
        LIMIT {weeks * 10}
    """
    cache_key = f"analytics:category-trends:{category}:{weeks}"
    return {"data": await _cached_query(cache_key, sql)}


@router.get(
    "/cross-platform",
    summary="Compare prices for a product across all platforms",
    tags=["analytics"],
)
async def cross_platform(
    product_id: Optional[str] = Query(None, description="Filter to a specific product_external_id"),
    category: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
):
    """
    Shows the same product's latest price on each scraped platform, with
    the spread vs. the cheapest option highlighted.
    Powered by dbt mart: `mart_cross_platform`.
    """
    where_clauses = []
    if product_id:
        where_clauses.append(f"product_external_id = '{product_id}'")
    if category:
        where_clauses.append(f"LOWER(product_category) = LOWER('{category}')")
    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    sql = f"""
        SELECT
            product_external_id,
            product_name,
            product_brand,
            product_category,
            source,
            ROUND(converted_price_usd, 2)       AS price_usd,
            ROUND(avg_cross_platform_price, 2)  AS avg_cross_platform_price,
            ROUND(min_cross_platform_price, 2)  AS min_cross_platform_price,
            ROUND(max_cross_platform_price, 2)  AS max_cross_platform_price,
            ROUND(price_above_minimum, 2)        AS price_above_minimum,
            last_scraped_at
        FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_cross_platform`
        {where_sql}
        ORDER BY price_usd ASC
        LIMIT {limit}
    """
    cache_key = f"analytics:cross-platform:{product_id}:{category}:{limit}"
    return {"data": await _cached_query(cache_key, sql)}


@router.get(
    "/brand-comparison",
    summary="Price and rating comparison across brands",
    tags=["analytics"],
)
async def brand_comparison(
    category: Optional[str] = Query(None, description="Filter by product category"),
):
    """
    Returns average price, average rating, and total review count per brand.
    Powered by dbt mart: `mart_brand_comparison`.
    """
    where_sql = f"WHERE LOWER(product_category) = LOWER('{category}')" if category else ""
    sql = f"""
        SELECT
            product_category,
            product_brand,
            total_products,
            ROUND(avg_price_usd, 2) AS avg_price_usd,
            ROUND(avg_rating, 2)    AS avg_rating,
            total_reviews
        FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_brand_comparison`
        {where_sql}
        ORDER BY total_products DESC
    """
    cache_key = f"analytics:brand-comparison:{category}"
    return {"data": await _cached_query(cache_key, sql)}


@router.get(
    "/price-drops",
    summary="Recent price drops detected by NiFi real-time ingestion",
    tags=["analytics"],
)
async def price_drops(
    min_drop_pct: float = Query(5.0, description="Minimum drop percentage to include"),
    limit: int = Query(50, ge=1, le=200),
):
    """
    Returns recently ingested rows where NiFi flagged a price drop ≥ min_drop_pct%.
    Pulled from BigQuery `raw_ecommerce_prices` (populated by the export DAG).
    """
    sql = f"""
        SELECT
            row_key,
            product_name,
            product_brand,
            product_category,
            source,
            ROUND(converted_price_usd, 2)  AS current_price_usd,
            ROUND(price_drop_percent, 2)   AS drop_percent,
            scraped_at
        FROM `{BQ_PROJECT}.{BQ_DATASET}.raw_ecommerce_prices`
        WHERE is_price_drop = TRUE
          AND price_drop_percent >= {min_drop_pct}
        ORDER BY scraped_at DESC
        LIMIT {limit}
    """
    cache_key = f"analytics:price-drops:{min_drop_pct}:{limit}"
    return {"data": await _cached_query(cache_key, sql)}
