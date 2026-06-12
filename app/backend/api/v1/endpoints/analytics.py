from fastapi import APIRouter, Query, BackgroundTasks, Depends, HTTPException, status
from core.bigquery import cached_bq_query
from core.config import settings
from core.redis import redis_get, redis_set
import asyncio
import json
import logging
from concurrent.futures import ThreadPoolExecutor

from api import deps
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy.future import select
from models.users import User
from models.reseller import SellerProduct
import scipy.stats
import numpy as np

from services.advanced_stats import run_advanced_statistics

logger = logging.getLogger(__name__)
_stats_executor = ThreadPoolExecutor(max_workers=2)

router = APIRouter()

CACHE_TTL = 3600

BQ_PROJECT = settings.BIGQUERY_PROJECT_ID
BQ_DATASET = settings.BIGQUERY_DATASET


@router.get("/kpis", summary="Get Market KPIs")
async def get_market_kpis(
    days_back: int = Query(30, ge=1, le=365),
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db)
):
    from sqlalchemy import func
    from models.reseller import SellerStatus
    
    # 1. Get raw KPI data from BigQuery
    query = f"SELECT * FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_market_kpis` LIMIT 1"
    bq_result = await cached_bq_query("kpis", query, CACHE_TTL, days_back)
    
    if not bq_result or len(bq_result) == 0:
        return []
        
    kpi_data = dict(bq_result[0])
    
    # 2. Get User's Active Products from Postgres
    my_items_count = await db.scalar(
        select(func.count()).where(
            SellerProduct.user_id == current_user.id, 
            SellerProduct.status == SellerStatus.ACTIVE
        )
    )
    my_items_count = my_items_count or 0
    
    # 3. Calculate accurate Market Visibility
    total_market = kpi_data.get('total_market_items', 1)
    if total_market == 0: total_market = 1
    
    kpi_data['my_market_visibility_pct'] = round((my_items_count / total_market) * 100, 2)
    kpi_data['my_active_items'] = my_items_count
    
    return [kpi_data]


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
        FROM `{BQ_PROJECT}.{BQ_DATASET}.int_clean_prices`
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
        FROM `{BQ_PROJECT}.{BQ_DATASET}.int_clean_prices`
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
        FROM `{BQ_PROJECT}.{BQ_DATASET}.int_clean_prices`
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
    query = f"SELECT * FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_platform_performance` ORDER BY competitiveness_score DESC"
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
        FROM `{BQ_PROJECT}.{BQ_DATASET}.int_clean_prices`
        WHERE product_unified_id = '{product_id}'
    )
    WHERE rn = 1
    GROUP BY product_unified_id
),
source_info AS (
    SELECT product_unified_id, source, source_url, in_stock,
        ROW_NUMBER() OVER(PARTITION BY product_unified_id, source ORDER BY scraped_at DESC) AS rn
    FROM `{BQ_PROJECT}.{BQ_DATASET}.int_clean_prices`
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
    result = await cached_bq_query(f"product:{product_id}", query, CACHE_TTL)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    return result


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
        FROM `{BQ_PROJECT}.{BQ_DATASET}.int_clean_prices`
        WHERE product_unified_id = '{product_id}'
    )
    WHERE rn = 1
    GROUP BY product_unified_id
),
source_info AS (
    SELECT product_unified_id, source, source_url, in_stock,
        ROW_NUMBER() OVER(PARTITION BY product_unified_id, source ORDER BY scraped_at DESC) AS rn
    FROM `{BQ_PROJECT}.{BQ_DATASET}.int_clean_prices`
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
    result = await cached_bq_query(f"product:{product_id}", query, CACHE_TTL)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    return result


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
async def search_products(q: str = "", category: str = ""):
    # Normalize spaces: replace non-breaking spaces (\xa0) and zero-width chars with regular space
    normalized = q.replace('\u00a0', ' ').replace('\u200b', '').strip()
    search_term = normalized.lower()
    
    if not search_term and not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a search term or category."
        )
    # Also normalize non-breaking spaces in stored BigQuery product names
    nb_sp = '\u00a0'
    
    where_clauses = []
    if search_term:
        where_clauses.append(f"(LOWER(REPLACE(product_name, '{nb_sp}', ' ')) LIKE '%{search_term}%' OR LOWER(product_category) LIKE '%{search_term}%')")
    if category and category.lower() != 'all':
        cat = category.replace("'", "''").lower()
        where_clauses.append(f"LOWER(product_category) = '{cat}'")
        
    where_sql = ""
    if where_clauses:
        where_sql = "WHERE " + " AND ".join(where_clauses)

    query = f"""
        SELECT * FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_deal_analysis`
        {where_sql}
        ORDER BY deal_score DESC
        LIMIT 500
    """
    return await cached_bq_query(f"search:{search_term}:{category}", query, CACHE_TTL)


@router.get("/advanced-stats", summary="Get Advanced Statistical Analysis (T-Tests, Regression, Correlation)")
async def get_advanced_stats(
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db)
):
    cache_key = "analytics:advanced-stats"
    result = None
    
    # 1. Try to fetch from Redis first
    try:
        cached = await asyncio.wait_for(redis_get(cache_key), timeout=5.0)
        if cached is not None:
            logger.info("Advanced stats served from Redis cache.")
            result = json.loads(cached)
    except Exception as e:
        logger.warning(f"Failed to read advanced stats from Redis: {e}")

    # 2. If not in cache, run the heavy Python math in a background thread
    if result is None:
        logger.info("Cache miss for advanced stats. Running pandas math...")
        loop = asyncio.get_running_loop()
        try:
            # run_advanced_statistics takes 1-3 seconds, so we run it in an executor to avoid blocking FastAPI
            result = await loop.run_in_executor(_stats_executor, run_advanced_statistics)
            
            # 3. Save the calculated result back to Redis for 1 hour (3600 seconds)
            try:
                await asyncio.wait_for(redis_set(cache_key, json.dumps(result), 3600), timeout=5.0)
            except Exception as e:
                logger.warning(f"Failed to save advanced stats to Redis: {e}")
        except Exception as e:
            logger.error(f"Failed to compute advanced stats: {e}")
            return {"error": "Failed to compute advanced statistics."}

    # 4. Calculate User-Specific T-Test (Postgres My Prices vs BQ Market Avg)
    try:
        stmt = select(SellerProduct).where(SellerProduct.user_id == current_user.id)
        db_result = await db.execute(stmt)
        user_products = db_result.scalars().all()
        
        user_category_prices = {}
        for p in user_products:
            if p.category:
                if p.category not in user_category_prices:
                    user_category_prices[p.category] = []
                user_category_prices[p.category].append(float(p.my_price))
                
        # Get market averages
        market_trends_query = f"SELECT product_category, mean_price FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_category_trends`"
        market_trends = await cached_bq_query("trends_for_ttest", market_trends_query, CACHE_TTL)
        market_avg_map = {row['product_category']: float(row['mean_price']) for row in market_trends}
        
        custom_ttest = []
        for cat, prices in user_category_prices.items():
            market_avg = market_avg_map.get(cat)
            if market_avg is None:
                continue
                
            my_avg = sum(prices) / len(prices)
            gap = my_avg - market_avg
            
            # 1-sample t-test (user prices vs market mean)
            if len(prices) > 1:
                try:
                    t_stat, p_val = scipy.stats.ttest_1samp(prices, market_avg)
                    p_val = float(p_val) if not np.isnan(p_val) else 0.5
                except:
                    p_val = 0.5
            else:
                p_val = 0.05 if abs(gap) > (market_avg * 0.1) else 0.5
                
            custom_ttest.append({
                "category": cat,
                "platform": "My Store",
                "my_price": round(my_avg, 2),
                "market_avg": round(market_avg, 2),
                "gap": round(gap, 2),
                "p_value": round(p_val, 3),
                "significant": p_val < 0.05
            })
            
        result["ttest_results"] = custom_ttest
    except Exception as e:
        logger.error(f"Failed to compute user-specific T-Test: {e}")
        
    return result
