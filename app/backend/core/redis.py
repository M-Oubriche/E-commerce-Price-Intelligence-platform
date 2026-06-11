import asyncio
import json
import logging
from concurrent.futures import ThreadPoolExecutor
import redis as sync_redis
from core.config import settings

logger = logging.getLogger(__name__)

_redis_client: sync_redis.Redis | None = None
_redis_executor = ThreadPoolExecutor(max_workers=2)


def get_redis() -> sync_redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = sync_redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=0,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
            max_connections=10,
        )
    return _redis_client


async def redis_get(key: str) -> str | None:
    loop = asyncio.get_running_loop()
    try:
        return await loop.run_in_executor(
            _redis_executor, lambda: get_redis().get(key)
        )
    except Exception as e:
        logger.warning(f"Redis GET {key} failed: {e}")
        return None


async def redis_set(key: str, value: str, ttl: int = 300) -> bool:
    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(
            _redis_executor, lambda: get_redis().set(key, value, ex=ttl)
        )
        return True
    except Exception as e:
        logger.warning(f"Redis SET {key} failed: {e}")
        return False


async def redis_ping() -> bool:
    loop = asyncio.get_running_loop()
    try:
        return await loop.run_in_executor(_redis_executor, lambda: get_redis().ping())
    except Exception as e:
        logger.warning(f"Redis PING failed: {e}")
        return False
