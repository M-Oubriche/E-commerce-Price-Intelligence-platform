from fastapi import APIRouter, Query
from core.bigquery import cached_bq_query
from core.config import settings

router = APIRouter()

CACHE_TTL = 3600

BQ_PROJECT = settings.BIGQUERY_PROJECT_ID
BQ_DATASET = settings.BIGQUERY_DATASET


@router.get("/kpis", summary="Get Market KPIs")
async def get_market_kpis(days_back: int = Query(30, ge=1, le=365)):
    query = f"SELECT * FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_market_kpis` LIMIT 1"
    return await cached_bq_query("kpis", query, CACHE_TTL, days_back)


@router.get("/trends", summary="Get Category Trends")
async def get_category_trends(days_back: int = Query(30, ge=1, le=365)):
    query = f"SELECT * FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_category_trends` ORDER BY product_count DESC"
    return await cached_bq_query("trends", query, CACHE_TTL, days_back)


@router.get("/price-drops", summary="Get Daily Price Drops")
async def get_daily_price_drops():
    query = f"SELECT * FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_daily_price_drops` ORDER BY absolute_drop_usd DESC LIMIT 50"
    return await cached_bq_query("price-drops", query, CACHE_TTL)


@router.get("/deal-analysis", summary="Get Deal Analysis")
async def get_deal_analysis(days_back: int = Query(30, ge=1, le=365)):
    query = f"""WITH product_meta AS (
    SELECT 
        product_unified_id,
        ROUND(AVG(avg_rating), 1) AS avg_rating,
        SUM(review_count) AS total_reviews,
        COUNT(DISTINCT source) AS total_platforms,
        COUNT(DISTINCT CASE WHEN in_stock THEN source END) AS platforms_in_stock,
        MAX(scraped_at) AS last_updated
    FROM (
        SELECT product_unified_id, source, avg_rating, review_count, in_stock, scraped_at,
            ROW_NUMBER() OVER(PARTITION BY product_unified_id, source ORDER BY scraped_at DESC) AS rn
        FROM `{BQ_PROJECT}.{BQ_DATASET}.stg_raw_prices`
    )
    WHERE rn = 1
    GROUP BY product_unified_id
)
SELECT d.*,
    ROUND(SAFE_DIVIDE((avg_price_30d - current_price), avg_price_30d) * 100, 1) AS discount_percent,
    pm.avg_rating, pm.total_reviews, pm.total_platforms, pm.platforms_in_stock, pm.last_updated
FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_deal_analysis` d
LEFT JOIN product_meta pm ON d.product_unified_id = pm.product_unified_id
ORDER BY d.deal_score DESC LIMIT 100"""
    return await cached_bq_query("deal-analysis", query, CACHE_TTL, days_back)


@router.get("/flash-deals", summary="Get Flash Deals — biggest daily price drops")
async def get_flash_deals():
    query = f"""SELECT d.*, pm.avg_rating, pm.total_reviews, pm.total_platforms, pm.platforms_in_stock, pm.last_updated
FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_daily_price_drops` d
LEFT JOIN (
    SELECT 
        product_unified_id,
        ROUND(AVG(avg_rating), 1) AS avg_rating,
        SUM(review_count) AS total_reviews,
        COUNT(DISTINCT source) AS total_platforms,
        COUNT(DISTINCT CASE WHEN in_stock THEN source END) AS platforms_in_stock,
        MAX(scraped_at) AS last_updated
    FROM (
        SELECT product_unified_id, source, avg_rating, review_count, in_stock, scraped_at,
            ROW_NUMBER() OVER(PARTITION BY product_unified_id, source ORDER BY scraped_at DESC) AS rn
        FROM `{BQ_PROJECT}.{BQ_DATASET}.stg_raw_prices`
    )
    WHERE rn = 1
    GROUP BY product_unified_id
) pm ON d.product_unified_id = pm.product_unified_id
ORDER BY d.drop_percentage DESC LIMIT 6"""
    return await cached_bq_query("flash-deals", query, CACHE_TTL)


@router.get("/trending", summary="Get Trending Deals — best deals weighted by score and rating")
async def get_trending_deals():
    query = f"""WITH product_meta AS (
    SELECT 
        product_unified_id,
        ROUND(AVG(avg_rating), 1) AS avg_rating,
        SUM(review_count) AS total_reviews,
        COUNT(DISTINCT source) AS total_platforms,
        COUNT(DISTINCT CASE WHEN in_stock THEN source END) AS platforms_in_stock,
        MAX(scraped_at) AS last_updated
    FROM (
        SELECT product_unified_id, source, avg_rating, review_count, in_stock, scraped_at,
            ROW_NUMBER() OVER(PARTITION BY product_unified_id, source ORDER BY scraped_at DESC) AS rn
        FROM `{BQ_PROJECT}.{BQ_DATASET}.stg_raw_prices`
    )
    WHERE rn = 1
    GROUP BY product_unified_id
)
SELECT d.*,
    ROUND(SAFE_DIVIDE((avg_price_30d - current_price), avg_price_30d) * 100, 1) AS discount_percent,
    ROUND(d.deal_score * 0.6 + COALESCE(pm.avg_rating, 0) * 0.4, 1) AS trending_score,
    pm.avg_rating, pm.total_reviews, pm.total_platforms, pm.platforms_in_stock, pm.last_updated
FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_deal_analysis` d
LEFT JOIN product_meta pm ON d.product_unified_id = pm.product_unified_id
ORDER BY trending_score DESC LIMIT 12"""
    return await cached_bq_query("trending", query, CACHE_TTL)


@router.get("/platform-performance", summary="Get Platform Performance")
async def get_platform_performance(days_back: int = Query(30, ge=1, le=365)):
    query = f"SELECT * FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_platform_performance` ORDER BY catalog_size DESC"
    return await cached_bq_query("platform-performance", query, CACHE_TTL, days_back)


@router.get("/platform-category-avg", summary="Get Platform Category Averages")
async def get_platform_category_avg(days_back: int = Query(30, ge=1, le=365)):
    query = f"SELECT * FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_platform_category_avg` ORDER BY platform, product_category"
    return await cached_bq_query("platform-category-avg", query, CACHE_TTL, days_back)


@router.get("/shopper-insights", summary="Get Shopper Insights")
async def get_shopper_insights():
    query = f"SELECT * FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_shopper_insights` LIMIT 100"
    return await cached_bq_query("shopper-insights", query, CACHE_TTL)


@router.get("/product-correlation", summary="Get Product Correlation Data")
async def get_product_correlation(days_back: int = Query(30, ge=1, le=365)):
    query = f"SELECT * FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_product_correlation_data` LIMIT 100"
    return await cached_bq_query("product-correlation", query, CACHE_TTL, days_back)


@router.get("/product-by-id", summary="Get Product Details by ID (query param)")
async def get_product_detail_by_id(product_id: str):
    query = f"""WITH product_meta AS (
    SELECT 
        product_unified_id,
        ROUND(AVG(avg_rating), 1) AS avg_rating,
        SUM(review_count) AS total_reviews,
        COUNT(DISTINCT source) AS total_platforms,
        COUNT(DISTINCT CASE WHEN in_stock THEN source END) AS platforms_in_stock,
        MAX(scraped_at) AS last_updated
    FROM (
        SELECT product_unified_id, source, avg_rating, review_count, in_stock, scraped_at,
            ROW_NUMBER() OVER(PARTITION BY product_unified_id, source ORDER BY scraped_at DESC) AS rn
        FROM `{BQ_PROJECT}.{BQ_DATASET}.stg_raw_prices`
        WHERE product_unified_id = '{product_id}'
    )
    WHERE rn = 1
    GROUP BY product_unified_id
),
source_info AS (
    SELECT product_unified_id, source, source_url, in_stock,
        ROW_NUMBER() OVER(PARTITION BY product_unified_id, source ORDER BY scraped_at DESC) AS rn
    FROM `{BQ_PROJECT}.{BQ_DATASET}.stg_raw_prices`
    WHERE product_unified_id = '{product_id}'
)
SELECT d.*,
    ROUND(SAFE_DIVIDE((avg_price_30d - current_price), avg_price_30d) * 100, 1) AS discount_percent,
    COUNT(*) OVER(PARTITION BY d.product_unified_id) AS total_platforms_tracked,
    pm.avg_rating, pm.total_reviews, pm.total_platforms, pm.platforms_in_stock, pm.last_updated,
    si.source_url, si.in_stock
FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_deal_analysis` d
LEFT JOIN product_meta pm ON d.product_unified_id = pm.product_unified_id
LEFT JOIN source_info si ON d.product_unified_id = si.product_unified_id AND d.source = si.source AND si.rn = 1
WHERE d.product_unified_id = '{product_id}'
ORDER BY d.current_price ASC"""
    return await cached_bq_query(f"product:{product_id}", query, CACHE_TTL)


@router.get("/product-by-id/history", summary="Get Product Price History by ID (query param)")
async def get_product_history_by_id(product_id: str):
    query = f"""
        SELECT price_date as date, daily_lowest_price_usd as price 
        FROM `{BQ_PROJECT}.{BQ_DATASET}.int_price_history` 
        WHERE product_unified_id = '{product_id}'
        ORDER BY price_date ASC
    """
    return await cached_bq_query(f"history:{product_id}", query, CACHE_TTL)


@router.get("/product-by-id/similar", summary="Get Similar Products by ID (query param)")
async def get_similar_products_by_id(product_id: str):
    query = f"""
        WITH current_prod AS (
            SELECT product_category FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_deal_analysis`
            WHERE product_unified_id = '{product_id}'
            LIMIT 1
        )
        SELECT * FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_deal_analysis`
        WHERE product_category = (SELECT product_category FROM current_prod)
        AND product_unified_id != '{product_id}'
        ORDER BY deal_score DESC
        LIMIT 4
    """
    return await cached_bq_query(f"similar:{product_id}", query, CACHE_TTL)


@router.get("/product/{product_id}", summary="Get Product Details")
async def get_product_detail(product_id: str):
    query = f"""WITH product_meta AS (
    SELECT 
        product_unified_id,
        ROUND(AVG(avg_rating), 1) AS avg_rating,
        SUM(review_count) AS total_reviews,
        COUNT(DISTINCT source) AS total_platforms,
        COUNT(DISTINCT CASE WHEN in_stock THEN source END) AS platforms_in_stock,
        MAX(scraped_at) AS last_updated
    FROM (
        SELECT product_unified_id, source, avg_rating, review_count, in_stock, scraped_at,
            ROW_NUMBER() OVER(PARTITION BY product_unified_id, source ORDER BY scraped_at DESC) AS rn
        FROM `{BQ_PROJECT}.{BQ_DATASET}.stg_raw_prices`
        WHERE product_unified_id = '{product_id}'
    )
    WHERE rn = 1
    GROUP BY product_unified_id
),
source_info AS (
    SELECT product_unified_id, source, source_url, in_stock,
        ROW_NUMBER() OVER(PARTITION BY product_unified_id, source ORDER BY scraped_at DESC) AS rn
    FROM `{BQ_PROJECT}.{BQ_DATASET}.stg_raw_prices`
    WHERE product_unified_id = '{product_id}'
)
SELECT d.*,
    ROUND(SAFE_DIVIDE((avg_price_30d - current_price), avg_price_30d) * 100, 1) AS discount_percent,
    COUNT(*) OVER(PARTITION BY d.product_unified_id) AS total_platforms_tracked,
    pm.avg_rating, pm.total_reviews, pm.total_platforms, pm.platforms_in_stock, pm.last_updated,
    si.source_url, si.in_stock
FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_deal_analysis` d
LEFT JOIN product_meta pm ON d.product_unified_id = pm.product_unified_id
LEFT JOIN source_info si ON d.product_unified_id = si.product_unified_id AND d.source = si.source AND si.rn = 1
WHERE d.product_unified_id = '{product_id}'
ORDER BY d.current_price ASC"""
    return await cached_bq_query(f"product:{product_id}", query, CACHE_TTL)


@router.get("/product/{product_id}/history", summary="Get Product Price History")
async def get_product_history(product_id: str):
    # This queries the int_price_history cleaned table for historical points
    query = f"""
        SELECT price_date as date, daily_lowest_price_usd as price 
        FROM `{BQ_PROJECT}.{BQ_DATASET}.int_price_history` 
        WHERE product_unified_id = '{product_id}'
        ORDER BY price_date ASC
    """
    return await cached_bq_query(f"history:{product_id}", query, CACHE_TTL)


@router.get("/product/{product_id}/similar", summary="Get Similar Products")
async def get_similar_products(product_id: str):
    # This queries for products in the same category, excluding the current product
    # We first find the category of the given product, then find others
    query = f"""
        WITH current_prod AS (
            SELECT product_category FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_deal_analysis`
            WHERE product_unified_id = '{product_id}'
            LIMIT 1
        )
        SELECT * FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_deal_analysis`
        WHERE product_category = (SELECT product_category FROM current_prod)
        AND product_unified_id != '{product_id}'
        ORDER BY deal_score DESC
        LIMIT 4
    """
    return await cached_bq_query(f"similar:{product_id}", query, CACHE_TTL)


@router.get("/search", summary="Search Products")
async def search_products(q: str = ""):
    # Normalize spaces: replace non-breaking spaces (\xa0) and zero-width chars with regular space
    normalized = q.replace('\u00a0', ' ').replace('\u200b', '').strip()
    search_term = normalized.lower()
    # Also normalize non-breaking spaces in stored BigQuery product names
    nb_sp = '\u00a0'
    query = f"""
        SELECT * FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_deal_analysis`
        WHERE LOWER(REPLACE(product_name, '{nb_sp}', ' ')) LIKE '%{search_term}%'
           OR LOWER(product_category) LIKE '%{search_term}%'
        ORDER BY deal_score DESC
        LIMIT 50
    """
    return await cached_bq_query(f"search:{search_term}", query, CACHE_TTL)
