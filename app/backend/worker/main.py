import asyncio
import json
import logging
import sys
import os

# Add parent directory to sys.path to allow importing from 'models', 'core', etc.
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, joinedload
from sqlalchemy.future import select
from sqlalchemy import update

from core.config import settings
from core.redis import redis_client
from models.client import AlertEvent, WatchlistItem, NotificationDelivery, DeliveryChannel, DeliveryStatus
from models.preferences import AlertPreference
from services.email import send_price_drop_email

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("pulseprice-worker")

# DB Setup
engine = create_async_engine(settings.DATABASE_URL)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def process_alert_events():
    """
    Main loop to poll alert_events and match with watchlist.
    """
    logger.info("Matching engine started...")
    
    while True:
        try:
            async with AsyncSessionLocal() as db:
                # 1. Fetch unprocessed events
                result = await db.execute(
                    select(AlertEvent).filter(AlertEvent.is_processed == False)
                )
                events = result.scalars().all()
                
                if not events:
                    await asyncio.sleep(5)  # Wait if no new events
                    continue
                
                for event in events:
                    logger.info(f"Processing event for product: {event.product_id} (New Price: {event.new_price})")
                    
                    # 2. Match with Watchlist Items
                    # Logic: product_id matches AND new_price <= target_price
                    watchlist_result = await db.execute(
                        select(WatchlistItem)
                        .options(joinedload(WatchlistItem.user))
                        .filter(
                            WatchlistItem.product_id == event.product_id,
                            WatchlistItem.target_price >= event.new_price,
                            WatchlistItem.is_active == True
                        )
                    )
                    matches = watchlist_result.scalars().all()
                    
                    for match in matches:
                        logger.info(f"🎯 MATCH FOUND: User {match.user_id} for product {event.product_name}")
                        
                        # 3. Create Notification Delivery record
                        notification = NotificationDelivery(
                            alert_event_id=event.id,
                            user_id=match.user_id,
                            channel=DeliveryChannel.WEBSOCKET,
                            status=DeliveryStatus.PENDING
                        )
                        db.add(notification)
                        
                        # 4. Publish to Redis Pub/Sub for WebSockets
                        payload = {
                            "type": "PRICE_DROP",
                            "data": {
                                "product_name": event.product_name,
                                "old_price": str(event.old_price),
                                "new_price": str(event.new_price),
                                "drop_percent": str(event.drop_percent),
                                "platform": event.source
                            }
                        }
                        await redis_client.publish(f"notifications:{match.user_id}", json.dumps(payload))
                        
                        logger.info(f"Published notification to Redis for user {match.user_id}")

                        # 5. Check if user wants email notifications
                        pref_result = await db.execute(
                            select(AlertPreference).filter(AlertPreference.user_id == match.user_id)
                        )
                        prefs = pref_result.scalars().first()

                        if prefs and prefs.email_notifications and match.user:
                            await send_price_drop_email(
                                to_email=match.user.email,
                                to_name=match.user.full_name,
                                product_name=event.product_name,
                                old_price=float(event.old_price),
                                new_price=float(event.new_price),
                                drop_percent=float(event.drop_percent),
                                platform=event.source or "Unknown"
                            )

                    # 6. Mark event as processed
                    event.is_processed = True
                
                await db.commit()
                logger.info("Worker cycle complete. Next check in 30 minutes.")
                await asyncio.sleep(1800)  # Match NiFi's 30-min schedule
                
        except Exception as e:
            logger.error(f"Worker Error: {str(e)}")
            await asyncio.sleep(10)

if __name__ == "__main__":
    asyncio.run(process_alert_events())
