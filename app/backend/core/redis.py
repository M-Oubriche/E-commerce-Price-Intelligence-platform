import redis.asyncio as redis
from core.config import settings

redis_client = redis.from_url(
    f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/0",
    encoding="utf-8",
    decode_responses=True
)

async def get_redis():
    return redis_client
