from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete, func, desc
from typing import List
from uuid import UUID

from api import deps
from models.users import User
from models.client import NotificationDelivery, AlertEvent, DeliveryStatus
from schemas.notifications import (
    NotificationOut, 
    NotificationListResponse, 
    UnreadCountResponse,
    UnreadCountData
)

router = APIRouter()

@router.get("/", response_model=NotificationListResponse)
async def get_notifications(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    query = (
        select(NotificationDelivery, AlertEvent)
        .join(AlertEvent, NotificationDelivery.alert_event_id == AlertEvent.id)
        .filter(NotificationDelivery.user_id == current_user.id)
        .order_by(desc(NotificationDelivery.created_at))
    )
    result = await db.execute(query)
    notifications = []
    for delivery, event in result:
        notifications.append(
            NotificationOut(
                id=delivery.id,
                alert_event_id=delivery.alert_event_id,
                product_name=event.product_name,
                old_price=float(event.old_price) if event.old_price else 0.0,
                new_price=float(event.new_price) if event.new_price else 0.0,
                drop_percent=float(event.drop_percent) if event.drop_percent else 0.0,
                platform=event.source,
                channel=delivery.channel.value,
                status=delivery.status.value,
                is_read=delivery.status == DeliveryStatus.DELIVERED,
                created_at=delivery.created_at
            )
        )
    return {"data": notifications}

@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    query = (
        select(func.count(NotificationDelivery.id))
        .filter(
            NotificationDelivery.user_id == current_user.id,
            NotificationDelivery.status != DeliveryStatus.DELIVERED
        )
    )
    result = await db.execute(query)
    count = result.scalar() or 0
    return {"data": {"count": count}}

@router.patch("/{id}/read")
async def mark_as_read(
    id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    query = (
        update(NotificationDelivery)
        .where(
            NotificationDelivery.id == id,
            NotificationDelivery.user_id == current_user.id
        )
        .values(status=DeliveryStatus.DELIVERED)
    )
    result = await db.execute(query)
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Notification non trouvée.")
    await db.commit()
    return {"data": {"message": "Notification marquée comme lue"}}

@router.patch("/{id}/dismiss")
async def dismiss_notification(
    id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    query = (
        delete(NotificationDelivery)
        .where(
            NotificationDelivery.id == id,
            NotificationDelivery.user_id == current_user.id
        )
    )
    result = await db.execute(query)
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Notification non trouvée.")
    await db.commit()
    return {"data": {"message": "Notification supprimée"}}

@router.post("/mark-all-read")
async def mark_all_read(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    query = (
        update(NotificationDelivery)
        .where(NotificationDelivery.user_id == current_user.id)
        .values(status=DeliveryStatus.DELIVERED)
    )
    await db.execute(query)
    await db.commit()
    return {"data": {"message": "Toutes les notifications marquées comme lues"}}

@router.post("/dismiss-all")
async def dismiss_all(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    query = (
        delete(NotificationDelivery)
        .where(NotificationDelivery.user_id == current_user.id)
    )
    await db.execute(query)
    await db.commit()
    return {"data": {"message": "Toutes les notifications ont été supprimées"}}
