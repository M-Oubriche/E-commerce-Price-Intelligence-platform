from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
from uuid import UUID
from decimal import Decimal
import asyncio
import hashlib

from api import deps
from core.rate_limit import rate_limit_watchlist
from core.bigquery import cached_bq_query
from core.config import settings
from models.users import User
from models.client import WatchlistItem, ShopperAlert
from schemas.watchlist import (
    WatchlistItemCreate, 
    WatchlistItemUpdate, 
    WatchlistItemOut, 
    WatchlistResponse,
    SingleWatchlistResponse,
)

router = APIRouter()

BQ_PROJECT = settings.BIGQUERY_PROJECT_ID
BQ_DATASET = settings.BIGQUERY_DATASET

async def _enrich_from_bq(items: list[WatchlistItem]) -> dict[str, dict]:
    if not items:
        return {}
    ids = [item.product_id for item in items]
    ids_literal = ", ".join(f"'{pid}'" for pid in ids)

    ids_sorted = sorted(ids)
    cache_suffix = hashlib.sha256("".join(ids_sorted).encode()).hexdigest()[:12]  # nosec B324

    deal_query = f"""
        SELECT product_unified_id, current_price, product_image_url, product_category, deal_score
        FROM (
            SELECT product_unified_id, current_price, product_image_url, product_category, deal_score,
                ROW_NUMBER() OVER(PARTITION BY product_unified_id ORDER BY current_price ASC NULLS LAST) AS rn
            FROM `{BQ_PROJECT}.{BQ_DATASET}.mart_deal_analysis`
            WHERE product_unified_id IN ({ids_literal})
        )
        WHERE rn = 1
    """
    price_query = f"""
        SELECT product_unified_id, daily_lowest_price_usd AS fallback_price
        FROM (
            SELECT product_unified_id, daily_lowest_price_usd,
                ROW_NUMBER() OVER(PARTITION BY product_unified_id ORDER BY price_date DESC) AS rn
            FROM `{BQ_PROJECT}.{BQ_DATASET}.int_price_history`
            WHERE product_unified_id IN ({ids_literal})
        )
        WHERE rn = 1
    """

    deal_rows, price_rows = await asyncio.gather(
        cached_bq_query(f"watchlist-deal-{cache_suffix}", deal_query, 300),
        cached_bq_query(f"watchlist-price-{cache_suffix}", price_query, 300),
    )

    result: dict[str, dict] = {pid: {} for pid in ids}
    for row in deal_rows:
        pid = row.get("product_unified_id")
        if pid:
            existing = result[pid]
            if row.get("current_price") or not existing.get("current_price"):
                result[pid] = row
    for row in price_rows:
        pid = row.get("product_unified_id")
        if pid and not result[pid].get("current_price"):
            result[pid]["current_price"] = row.get("fallback_price")
    return result

def _build_out(item: WatchlistItem, bq_row: dict) -> WatchlistItemOut:
    cp = bq_row.get("current_price")
    bq_image = bq_row.get("product_image_url")
    bq_category = bq_row.get("product_category")
    bq_score = bq_row.get("deal_score")
    return WatchlistItemOut(
        id=item.id,
        product_id=item.product_id,
        product_name=item.product_name,
        emoji_icon=item.emoji_icon,
        platform=item.platform,
        image_url=bq_image,
        category=bq_category,
        target_price=item.target_price,
        original_price=item.original_price,
        current_price=Decimal(str(cp)) if cp is not None else None,
        deal_score=float(bq_score) if bq_score is not None else None,
        alert_condition=item.alert_condition,
        is_active=item.is_active,
        created_at=item.created_at,
        updated_at=item.updated_at,
        shopper_alerts=item.shopper_alerts,
    )

@router.get("/", response_model=WatchlistResponse)
async def get_watchlist(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Returns all active items in the watchlist for the authenticated user.
    Includes related shopper alerts and live current_price from BigQuery.
    """
    result = await db.execute(
        select(WatchlistItem)
        .filter(WatchlistItem.user_id == current_user.id)
        .options(selectinload(WatchlistItem.shopper_alerts))
    )
    items = result.scalars().all()

    if not items:
        return {"data": []}

    bq_map = await _enrich_from_bq(items)
    data = [_build_out(item, bq_map.get(item.product_id, {})) for item in items]
    return {"data": data}

@router.post("/", response_model=SingleWatchlistResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(rate_limit_watchlist)])
async def add_to_watchlist(
    item_in: WatchlistItemCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Adds an item to the user's watchlist AND auto-creates a shopper_alert.
    """
    # 1. Create Watchlist Item (only pass fields the DB model actually has)
    new_item = WatchlistItem(
        product_id=item_in.product_id,
        product_name=item_in.product_name,
        emoji_icon=item_in.emoji_icon,
        platform=item_in.platform,
        target_price=item_in.target_price,
        original_price=item_in.original_price,
        alert_condition=item_in.alert_condition,
        user_id=current_user.id
    )
    db.add(new_item)
    await db.flush()  # To get new_item.id

    # 2. Auto-create Shopper Alert based on the condition
    new_alert = ShopperAlert(
        user_id=current_user.id,
        watchlist_item_id=new_item.id,
        condition_type=item_in.alert_condition,
        target_value=item_in.target_price,
        progress_pct=0,
        status="active"
    )
    db.add(new_alert)
    
    await db.commit()
    await db.refresh(new_item)
    
    # Reload with alerts for response
    result = await db.execute(
        select(WatchlistItem)
        .filter(WatchlistItem.id == new_item.id)
        .options(selectinload(WatchlistItem.shopper_alerts))
    )
    item_with_alerts = result.scalar_one()

    bq_map = await _enrich_from_bq([item_with_alerts])
    out = _build_out(item_with_alerts, bq_map.get(item_with_alerts.product_id, {}))
    return {"data": out}

@router.patch("/{item_id}", response_model=SingleWatchlistResponse)
async def update_watchlist_item(
    item_id: UUID,
    item_in: WatchlistItemUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Updates target_price or alert_condition for a specific item.
    Also updates the linked shopper_alert if necessary.
    """
    result = await db.execute(
        select(WatchlistItem)
        .filter(WatchlistItem.id == item_id, WatchlistItem.user_id == current_user.id)
        .options(selectinload(WatchlistItem.shopper_alerts))
    )
    item = result.scalars().first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found or access denied.")

    update_data = item_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    # Sync linked shopper_alert if target_price or condition changed
    if "target_price" in update_data or "alert_condition" in update_data:
        for alert in item.shopper_alerts:
            if "target_price" in update_data:
                alert.target_value = update_data["target_price"]
            if "alert_condition" in update_data:
                alert.condition_type = update_data["alert_condition"]

    await db.commit()
    await db.refresh(item)
    
    # Reload with alerts for response
    result = await db.execute(
        select(WatchlistItem)
        .filter(WatchlistItem.id == item.id)
        .options(selectinload(WatchlistItem.shopper_alerts))
    )
    item_with_alerts = result.scalar_one()

    bq_map = await _enrich_from_bq([item_with_alerts])
    out = _build_out(item_with_alerts, bq_map.get(item_with_alerts.product_id, {}))
    return {"data": out}

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_watchlist_item(
    item_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Removes an item from the watchlist. 
    Foreign key CASCADE will handle the shopper_alert.
    """
    result = await db.execute(
        select(WatchlistItem)
        .filter(WatchlistItem.id == item_id, WatchlistItem.user_id == current_user.id)
    )
    item = result.scalars().first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found or access denied.")

    await db.delete(item)
    await db.commit()
    return None
