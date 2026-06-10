from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from uuid import UUID
from decimal import Decimal

from api import deps
from models.users import User
from models.client import ShopperAlert, WatchlistItem, AlertCondition
from schemas.watchlist import ShopperAlertsResponse, SingleShopperAlertResponse
from pydantic import BaseModel

router = APIRouter()

class CreateAlertRequest(BaseModel):
    watchlist_item_id: UUID
    condition_type: AlertCondition = AlertCondition.BELOW_TARGET
    target_value: Decimal

@router.post("/", response_model=SingleShopperAlertResponse, status_code=status.HTTP_201_CREATED)
async def create_shopper_alert(
    body: CreateAlertRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    # Verify the watchlist item belongs to this user
    result = await db.execute(
        select(WatchlistItem).filter(
            WatchlistItem.id == body.watchlist_item_id,
            WatchlistItem.user_id == current_user.id
        )
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found.")

    new_alert = ShopperAlert(
        user_id=current_user.id,
        watchlist_item_id=body.watchlist_item_id,
        condition_type=body.condition_type,
        target_value=body.target_value,
        progress_pct=0,
        status="active",
    )
    db.add(new_alert)
    await db.commit()
    await db.refresh(new_alert)
    return {"data": new_alert}

@router.get("/", response_model=ShopperAlertsResponse)
async def get_shopper_alerts(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    List all active shopper alerts with progress_pct.
    """
    result = await db.execute(
        select(ShopperAlert).filter(ShopperAlert.user_id == current_user.id)
    )
    alerts = result.scalars().all()
    return {"data": alerts}

@router.get("/{alert_id}", response_model=SingleShopperAlertResponse)
async def get_single_shopper_alert(
    alert_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Return a single alert with progress.
    """
    result = await db.execute(
        select(ShopperAlert).filter(ShopperAlert.id == alert_id, ShopperAlert.user_id == current_user.id)
    )
    alert = result.scalars().first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerte non trouvée.")
    return {"data": alert}

@router.patch("/{alert_id}/pause", response_model=SingleShopperAlertResponse)
async def pause_alert(
    alert_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Set status=paused.
    """
    result = await db.execute(
        select(ShopperAlert).filter(ShopperAlert.id == alert_id, ShopperAlert.user_id == current_user.id)
    )
    alert = result.scalars().first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerte non trouvée.")
    
    alert.status = "paused"
    await db.commit()
    await db.refresh(alert)
    return {"data": alert}

@router.patch("/{alert_id}/resume", response_model=SingleShopperAlertResponse)
async def resume_alert(
    alert_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Set status=active.
    """
    result = await db.execute(
        select(ShopperAlert).filter(ShopperAlert.id == alert_id, ShopperAlert.user_id == current_user.id)
    )
    alert = result.scalars().first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerte non trouvée.")
    
    alert.status = "active"
    await db.commit()
    await db.refresh(alert)
    return {"data": alert}

@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shopper_alert(
    alert_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    result = await db.execute(
        select(ShopperAlert).filter(ShopperAlert.id == alert_id, ShopperAlert.user_id == current_user.id)
    )
    alert = result.scalars().first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerte non trouvée.")
    await db.delete(alert)
    await db.commit()
    return None
