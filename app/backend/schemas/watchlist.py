from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from decimal import Decimal
from models.client import AlertCondition

class WatchlistItemBase(BaseModel):
    product_id: str
    product_name: str
    emoji_icon: Optional[str] = None
    platform: Optional[str] = None
    target_price: Decimal
    original_price: Optional[Decimal] = None
    alert_condition: AlertCondition = AlertCondition.BELOW_TARGET

class WatchlistItemCreate(WatchlistItemBase):
    pass

class WatchlistItemUpdate(BaseModel):
    target_price: Optional[Decimal] = None
    alert_condition: Optional[AlertCondition] = None
    is_active: Optional[bool] = None

class ShopperAlertOut(BaseModel):
    id: UUID
    condition_type: AlertCondition
    target_value: Decimal
    progress_pct: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class WatchlistItemOut(WatchlistItemBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    shopper_alerts: List[ShopperAlertOut] = []

    class Config:
        from_attributes = True

class WatchlistResponse(BaseModel):
    data: List[WatchlistItemOut]

class SingleWatchlistResponse(BaseModel):
    data: WatchlistItemOut

class ShopperAlertsResponse(BaseModel):
    data: List[ShopperAlertOut]

class SingleShopperAlertResponse(BaseModel):
    data: ShopperAlertOut
