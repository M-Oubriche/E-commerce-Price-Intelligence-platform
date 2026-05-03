import httpx
import json
import logging
from typing import Optional, Any
from core.config import settings
from core.redis import redis_client

logger = logging.getLogger(__name__)

class AnalyticsProxy:
    """
    Service to proxy requests to the Data Analyst's Analytics API.
    Includes Redis caching for expensive analytical queries.
    """
    
    @staticmethod
    async def get_analytics_data(endpoint: str, params: dict = None, cache_ttl: int = 1800):
        """
        Generic GET proxy with caching.
        Default TTL: 30 minutes.
        """
        # 1. Generate Cache Key
        cache_key = f"analytics:{endpoint}:{hash(frozenset(params.items()) if params else '')}"
        
        # 2. Check Cache
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            logger.info(f"Cache Hit for {endpoint}")
            return json.loads(cached_data)
        
        # 3. Call External API
        async with httpx.AsyncClient() as client:
            try:
                # In real scenario, we use ANALYTICS_API_URL
                # For now we might mock it or expect it to be in settings
                url = f"{settings.ANALYTICS_API_URL}/api/v1/{endpoint}"
                headers = {"Authorization": f"Bearer {settings.ANALYTICS_API_KEY}"}
                
                response = await client.get(url, params=params, headers=headers, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                
                # 4. Store in Cache
                await redis_client.set(cache_key, json.dumps(data), ex=cache_ttl)
                
                return data
            except Exception as e:
                logger.error(f"Analytics API Error: {str(e)}")
                # If API is down, maybe return a partial mock or error
                raise

    @staticmethod
    async def search_products(query: str, platform: str = None):
        return await AnalyticsProxy.get_analytics_data("search", {"q": query, "platform": platform})

    @staticmethod
    async def get_trending_deals():
        return await AnalyticsProxy.get_analytics_data("deals/trending")

    @staticmethod
    async def get_price_history(product_id: str):
        return await AnalyticsProxy.get_analytics_data(f"products/{product_id}/history")
