import asyncio
import json
import logging
import re
import sys
import os

# Add parent directory to sys.path to allow importing from 'models', 'core', etc.
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, joinedload
from sqlalchemy.future import select
from sqlalchemy import update

from core.config import settings
from core.bigquery import cached_bq_query
from core.redis import get_redis
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
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600
)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

BQ_PROJECT = settings.BIGQUERY_PROJECT_ID
BQ_DATASET = settings.BIGQUERY_DATASET
CACHE_TTL = 3600

def normalized(s: str) -> str:
    return re.sub(r'\s+', ' ', s.lower()).strip()

def pick_best_match(search_name: str, candidates: list[dict], threshold: float = 0.3) -> dict | None:
    search_norm = normalized(search_name)
    words = [w for w in search_norm.split() if len(w) > 2]

    scored: list[tuple[dict, float]] = []
    for row in candidates:
        bq_name = normalized(row.get("product_name") or "")
        if not words:
            score = 1.0 if bq_name == search_norm else 0.0
        else:
            matches = sum(1 for w in words if w in bq_name)
            score = matches / len(words)
        exact_bonus = 10.0 if bq_name == search_norm else 0.0
        scored.append((row, score + exact_bonus))

    scored.sort(key=lambda x: x[1], reverse=True)
    if scored and scored[0][1] >= threshold:
        return scored[0][0]
    return None

async def search_bq_product(product_name: str) -> dict | None:
    nb_sp = '\u00a0'
    search_term = product_name.replace('\u00a0', ' ').replace('\u200b', '').strip().lower()
    # Use '!' as escape character to avoid backslash escaping issues in BigQuery literals
    safe_term = search_term.replace("'", "''").replace('!', '!!').replace('%', '!%').replace('_', '!_')
    query = f"""
        SELECT * FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_deal_analysis`
        WHERE LOWER(REPLACE(product_name, '{nb_sp}', ' ')) LIKE '%{safe_term}%' ESCAPE '!'
           OR LOWER(product_category) LIKE '%{safe_term}%' ESCAPE '!'
        ORDER BY deal_score DESC
        LIMIT 50
    """
    try:
        results = await cached_bq_query(f"worker_search:{search_term}", query, CACHE_TTL)
        best = pick_best_match(product_name, results, threshold=0.3)
        if best:
            prices = [
                r["current_price"] for r in results
                if r["product_unified_id"] == best["product_unified_id"] and (r.get("current_price") or 0) > 0
            ]
            best["lowest_bq_price"] = min(prices) if prices else None
            return best
    except Exception as e:
        logger.error(f"BQ search failed for '{product_name}': {e}")
    return None

async def process_alert_events():
    """
    Main loop to poll alert_events and match with watchlist.
    """
    logger.info("Matching engine started...")
    
    while True:
        processed_any = False
        try:
            async with AsyncSessionLocal() as db:
                # 1. Fetch unprocessed events
                result = await db.execute(
                    select(AlertEvent).filter(AlertEvent.is_processed == False)
                )
                events = result.scalars().all()
                
                if events:
                    processed_any = True
                    for event in events:
                        logger.info(f"Processing event: {event.product_name} ({event.product_id}) — New Price: {event.new_price}")

                        # 2. Search BQ by name to get the product_unified_id
                        bq_match = await search_bq_product(event.product_name or "")

                        if not bq_match:
                            logger.info(f"No BQ match found for '{event.product_name}', marking as processed")
                            event.is_processed = True
                            continue

                        bq_product_id = bq_match["product_unified_id"]
                        logger.info(f"BQ match: {bq_match['product_name']} → {bq_product_id}")

                        # 3. Match with Watchlist Items by BQ product_unified_id
                        watchlist_result = await db.execute(
                            select(WatchlistItem)
                            .options(joinedload(WatchlistItem.user))
                            .filter(
                                WatchlistItem.product_id == bq_product_id,
                                WatchlistItem.target_price >= event.new_price,
                                WatchlistItem.is_active == True
                            )
                        )
                        matches = watchlist_result.scalars().all()

                        for match in matches:
                            logger.info(f" MATCH FOUND: User {match.user_id} for product {event.product_name}")

                            # 4. Create Notification Delivery record
                            notification = NotificationDelivery(
                                alert_event_id=event.id,
                                user_id=match.user_id,
                                channel=DeliveryChannel.WEBSOCKET,
                                status=DeliveryStatus.PENDING
                            )
                            db.add(notification)
                            await db.flush()  # get the notification.id

                            # 5. Publish to Redis Pub/Sub for WebSockets
                            payload = {
                                "type": "PRICE_DROP",
                                "data": {
                                    "id": str(notification.id),
                                    "alert_event_id": event.id,
                                    "product_id": str(match.product_id),
                                    "product_name": event.product_name,
                                    "old_price": float(event.old_price) if event.old_price else None,
                                    "new_price": float(event.new_price) if event.new_price else None,
                                    "drop_percent": float(event.drop_percent) if event.drop_percent else None,
                                    "platform": event.source
                                }
                            }
                            loop = asyncio.get_running_loop()
                            await loop.run_in_executor(None, lambda: get_redis().publish(
                                f"notifications:{match.user_id}", json.dumps(payload)
                            ))

                            logger.info(f"Published notification to Redis for user {match.user_id}")

                            # 6. Check if user wants email notifications
                            pref_result = await db.execute(
                                select(AlertPreference).filter(AlertPreference.user_id == match.user_id)
                            )
                            prefs = pref_result.scalars().first()

                            if prefs and prefs.email_notifications and match.user:
                                if event.old_price and event.new_price and event.drop_percent:
                                    await send_price_drop_email(
                                        to_email=match.user.email,
                                        to_name=match.user.full_name,
                                        product_name=event.product_name,
                                        old_price=float(event.old_price),
                                        new_price=float(event.new_price),
                                        drop_percent=float(event.drop_percent),
                                        platform=event.source or "Unknown"
                                    )

                        # 7. Mark event as processed
                        event.is_processed = True
                    
                    await db.commit()
                    logger.info("Worker cycle complete.")
            
            # Sleep OUTSIDE the session block to prevent connection timeouts
            if processed_any:
                await asyncio.sleep(60)
            else:
                await asyncio.sleep(5)
                
        except Exception as e:
            logger.error(f"Worker Error: {str(e)}")
            await asyncio.sleep(10)

if __name__ == "__main__":
    asyncio.run(process_alert_events())
