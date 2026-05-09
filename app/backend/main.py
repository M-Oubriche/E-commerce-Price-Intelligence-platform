import asyncio
import json
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.v1.router import api_router
from api.v1.endpoints import ws
from core.redis import redis_client

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def redis_notification_subscriber():
    """
    Background task to listen for notifications in Redis and push them to WebSockets.
    """
    pubsub = redis_client.pubsub()
    # Subscribe to a pattern for all user notifications
    await pubsub.psubscribe("notifications:*")
    
    logger.info("Redis Notification Subscriber started")
    
    try:
        async for message in pubsub.listen():
            if message["type"] == "pmessage":
                channel = message["channel"]
                # Extract user_id from channel name 'notifications:{user_id}'
                user_id = channel.split(":")[1]
                data = json.loads(message["data"])
                
                # Push to WebSocket
                await ws.manager.send_personal_message(data, user_id)
    except Exception as e:
        logger.error(f"Redis Subscriber Error: {str(e)}")
    finally:
        await pubsub.punsubscribe("notifications:*")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP
    # Create background task for Redis subscriber
    subscriber_task = asyncio.create_task(redis_notification_subscriber())
    yield
    # SHUTDOWN
    subscriber_task.cancel()
    try:
        await subscriber_task
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
