from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
from uuid import UUID

from api import deps
from core.rate_limit import rate_limit_watchlist
from models.users import User
from models.client import WatchlistItem, ShopperAlert
from schemas.watchlist import (
    WatchlistItemCreate, 
    WatchlistItemUpdate, 
    WatchlistItemOut, 
    WatchlistResponse,
    SingleWatchlistResponse
)

router = APIRouter()

@router.get("/", response_model=WatchlistResponse)
async def get_watchlist(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Returns all active items in the watchlist for the authenticated user.
    Includes related shopper alerts.
    """
    result = await db.execute(
        select(WatchlistItem)
        .filter(WatchlistItem.user_id == current_user.id)
        .options(selectinload(WatchlistItem.shopper_alerts))
    )
    items = result.scalars().all()
    return {"data": items}

@router.post("/", response_model=SingleWatchlistResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(rate_limit_watchlist)])
async def add_to_watchlist(
    item_in: WatchlistItemCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Adds an item to the user's watchlist AND auto-creates a shopper_alert.
    """
    # 1. Create Watchlist Item
    new_item = WatchlistItem(
        **item_in.model_dump(),
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
    
    return {"data": item_with_alerts}

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
        raise HTTPException(status_code=404, detail="Item non trouvé ou accès refusé.")

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
    return {"data": item}

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
        raise HTTPException(status_code=404, detail="Item non trouvé ou accès refusé.")

    await db.delete(item)
    await db.commit()
    return None
