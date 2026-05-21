from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from google.cloud import bigquery
from core.bigquery import get_bq_client
from core.config import settings
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

def execute_bq_query(client: bigquery.Client, query: str) -> List[Dict[str, Any]]:
    try:
        query_job = client.query(query)
        results = query_job.result()
        return [dict(row) for row in results]
    except Exception as e:
        logger.error(f"BigQuery Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error querying data warehouse")

@router.get("/kpis", summary="Get Market KPIs")
def get_market_kpis(client: bigquery.Client = Depends(get_bq_client)):
    """Fetch high-level market KPIs from the Gold layer."""
    query = f"""
        SELECT *
        FROM `{settings.BIGQUERY_PROJECT_ID}.{settings.BIGQUERY_DATASET}.mart_market_kpis`
        LIMIT 1
    """
    return execute_bq_query(client, query)

@router.get("/trends", summary="Get Category Trends")
def get_category_trends(client: bigquery.Client = Depends(get_bq_client)):
    """Fetch price trends and average discounts by category."""
    query = f"""
        SELECT *
        FROM `{settings.BIGQUERY_PROJECT_ID}.{settings.BIGQUERY_DATASET}.mart_category_trends`
        ORDER BY total_tracked_products DESC
    """
    return execute_bq_query(client, query)

@router.get("/cross-platform", summary="Get Cross-Platform Comparisons")
def get_cross_platform_deals(client: bigquery.Client = Depends(get_bq_client)):
    """Fetch products matched across multiple platforms to find the best deals."""
    query = f"""
        SELECT *
        FROM `{settings.BIGQUERY_PROJECT_ID}.{settings.BIGQUERY_DATASET}.mart_cross_platform`
        ORDER BY max_price_usd - min_price_usd DESC
        LIMIT 100
    """
    return execute_bq_query(client, query)

@router.get("/price-drops", summary="Get Daily Price Drops")
def get_daily_price_drops(client: bigquery.Client = Depends(get_bq_client)):
    """Fetch products that dropped in price today."""
    query = f"""
        SELECT *
        FROM `{settings.BIGQUERY_PROJECT_ID}.{settings.BIGQUERY_DATASET}.mart_daily_price_drops`
        ORDER BY price_drop_amount DESC
        LIMIT 50
    """
    return execute_bq_query(client, query)

@router.get("/deal-analysis", summary="Get Deal Analysis")
def get_deal_analysis(client: bigquery.Client = Depends(get_bq_client)):
    """Fetch deep analysis of active deals."""
    query = f"""
        SELECT *
        FROM `{settings.BIGQUERY_PROJECT_ID}.{settings.BIGQUERY_DATASET}.mart_deal_analysis`
        ORDER BY discount_percent DESC
        LIMIT 100
    """
    return execute_bq_query(client, query)

@router.get("/platform-performance", summary="Get Platform Performance")
def get_platform_performance(client: bigquery.Client = Depends(get_bq_client)):
    """Fetch overall performance metrics by e-commerce platform."""
    query = f"""
        SELECT *
        FROM `{settings.BIGQUERY_PROJECT_ID}.{settings.BIGQUERY_DATASET}.mart_platform_performance`
        ORDER BY total_products DESC
    """
    return execute_bq_query(client, query)

@router.get("/platform-category-avg", summary="Get Platform Category Averages")
def get_platform_category_avg(client: bigquery.Client = Depends(get_bq_client)):
    """Fetch average pricing and stock metrics per platform and category."""
    query = f"""
        SELECT *
        FROM `{settings.BIGQUERY_PROJECT_ID}.{settings.BIGQUERY_DATASET}.mart_platform_category_avg`
        ORDER BY platform, category
    """
    return execute_bq_query(client, query)

@router.get("/price-analytics", summary="Get General Price Analytics")
def get_price_analytics(client: bigquery.Client = Depends(get_bq_client)):
    """Fetch statistical analytics on pricing (min, max, avg, percentiles)."""
    query = f"""
        SELECT *
        FROM `{settings.BIGQUERY_PROJECT_ID}.{settings.BIGQUERY_DATASET}.mart_price_analytics`
        LIMIT 100
    """
    return execute_bq_query(client, query)

@router.get("/shopper-insights", summary="Get Shopper Insights")
def get_shopper_insights(client: bigquery.Client = Depends(get_bq_client)):
    """Fetch aggregated shopper interest and availability insights."""
    query = f"""
        SELECT *
        FROM `{settings.BIGQUERY_PROJECT_ID}.{settings.BIGQUERY_DATASET}.mart_shopper_insights`
        LIMIT 100
    """
    return execute_bq_query(client, query)

@router.get("/product-correlation", summary="Get Product Correlation Data")
def get_product_correlation(client: bigquery.Client = Depends(get_bq_client)):
    """Fetch correlation data between price, ratings, and stock."""
    query = f"""
        SELECT *
        FROM `{settings.BIGQUERY_PROJECT_ID}.{settings.BIGQUERY_DATASET}.mart_product_correlation_data`
        LIMIT 100
    """
    return execute_bq_query(client, query)
