import time
from fastapi import HTTPException, Request
from core.redis import get_redis

async def sliding_window_rate_limit(
    request: Request,
    key: str,
    max_requests: int,
    window_seconds: int
):
    try:
        redis = get_redis()
        now = time.time()
        window_start = now - window_seconds
        
        pipe = redis.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        pipe.zadd(key, {str(now): now})
        pipe.expire(key, window_seconds)
        results = pipe.execute()
        
        request_count = results[1]
        
        if request_count >= max_requests:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": f"Too many requests. Max {max_requests} per {window_seconds} seconds.",
                        "status": 429
                    }
                }
            )
    except HTTPException:
        raise
    except Exception:
        # Redis unavailable — skip rate limiting
        pass

# Reusable dependency factories
async def rate_limit_auth(request: Request):
    ip = request.client.host
    await sliding_window_rate_limit(
        request,
        key=f"ratelimit:auth:{ip}",
        max_requests=10,
        window_seconds=60
    )

async def rate_limit_login(request: Request):
    ip = request.client.host
    await sliding_window_rate_limit(
        request,
        key=f"ratelimit:login:{ip}",
        max_requests=20,
        window_seconds=900  # 15 min
    )

async def rate_limit_register(request: Request):
    ip = request.client.host
    await sliding_window_rate_limit(
        request,
        key=f"ratelimit:register:{ip}",
        max_requests=20,
        window_seconds=3600  # 1 hour
    )

async def rate_limit_api(request: Request):
    # Use user_id if authenticated, fallback to IP
    user_id = request.headers.get("X-User-ID", request.client.host)
    await sliding_window_rate_limit(
        request,
        key=f"ratelimit:api:{user_id}",
        max_requests=200,
        window_seconds=60
    )

async def rate_limit_search(request: Request):
    user_id = request.headers.get("X-User-ID", request.client.host)
    await sliding_window_rate_limit(
        request,
        key=f"ratelimit:search:{user_id}",
        max_requests=60,
        window_seconds=60
    )

async def rate_limit_watchlist(request: Request):
    user_id = request.headers.get("X-User-ID", request.client.host)
    await sliding_window_rate_limit(
        request,
        key=f"ratelimit:watchlist:{user_id}",
        max_requests=30,
        window_seconds=60
    )
