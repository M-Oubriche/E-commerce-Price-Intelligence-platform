import asyncio
import json
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from api.v1.router import api_router
from api.v1.endpoints import ws
from core.redis import redis_get, redis_ping
from core.rate_limit import rate_limit_api
from core.database import AsyncSessionLocal

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def redis_notification_subscriber():
    """
    Background task to listen for notifications in Redis and push them to WebSockets.
    """
    try:
        from core.redis import get_redis
        loop = asyncio.get_running_loop()
        # pubsub runs in executor to avoid async Redis corruption
        def _subscribe():
            r = get_redis()
            pubsub = r.pubsub()
            pubsub.psubscribe("notifications:*")
            logger.info("Redis Notification Subscriber started")
            try:
                for message in pubsub.listen():
                    if message["type"] == "pmessage":
                        channel = message["channel"]
                        user_id = channel.split(":")[1]
                        data = json.loads(message["data"])
                        # Schedule the async send on the main loop
                        asyncio.run_coroutine_threadsafe(
                            ws.manager.send_personal_message(data, user_id), loop
                        )
            except Exception as e:
                logger.warning(f"Redis subscriber error (non-fatal): {e}")
            finally:
                pubsub.punsubscribe("notifications:*")
        await loop.run_in_executor(None, _subscribe)
    except Exception as e:
        logger.warning(f"Redis unavailable, notification subscriber skipped: {e}")

async def cleanup_expired_tokens():
    """Periodically delete expired and used verification/reset tokens."""
    while True:
        try:
            async with AsyncSessionLocal() as db:
                await db.execute(
                    text("DELETE FROM email_verification_tokens WHERE expires_at < NOW() OR is_used = TRUE")
                )
                await db.execute(
                    text("DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR is_used = TRUE")
                )
                await db.commit()
                logger.info("Token cleanup: removed expired/used tokens")
        except Exception as e:
            logger.warning(f"Token cleanup error (non-fatal): {e}")
        await asyncio.sleep(3600)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP
    # Create background task for Redis subscriber
    subscriber_task = asyncio.create_task(redis_notification_subscriber())
    # Create background task for expired token cleanup
    cleanup_task = asyncio.create_task(cleanup_expired_tokens())
    yield
    # SHUTDOWN
    subscriber_task.cancel()
    cleanup_task.cancel()
    try:
        await subscriber_task
        await cleanup_task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title="PulsePrice API",
    version="1.0.0",
    description="Real-time E-commerce Price Intelligence Platform",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://localhost:80",
        "http://localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Apply general rate limit to /api/v1/ but skip auth endpoints
    # because they have their own stricter limits
    if request.url.path.startswith("/api/v1/") and not request.url.path.startswith("/api/v1/auth/"):
        try:
            await rate_limit_api(request)
        except HTTPException as exc:
            return JSONResponse(
                status_code=exc.status_code,
                content=exc.detail
            )
        except Exception:
            # Redis unavailable — skip rate limiting (degraded mode)
            pass
    return await call_next(request)

@app.middleware("http")
async def add_rate_limit_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-RateLimit-Policy"] = "see-documentation"
    # Required for Google OAuth Popup to communicate with main window
    response.headers["Cross-Origin-Opener-Policy"] = "unsafe-none"
    return response

# Register all API routes under /api/v1
app.include_router(api_router, prefix="/api/v1")
# Register WebSockets under the same prefix
app.include_router(ws.router, prefix="/api/v1/ws", tags=["websockets"])

@app.get("/health")
async def health():
    return {"status": "ok", "message": "PulsePrice API is running"}

@app.get("/")
async def root():
    return {"message": "Welcome to PulsePrice API"}
