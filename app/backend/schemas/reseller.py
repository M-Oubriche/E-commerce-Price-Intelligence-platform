from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID
from typing import List, Optional
from models.reseller import SellerStatus, Aggressiveness, RiskLevel, PriceAlertTrigger, ThresholdType, Priority

# Seller Products
class SellerProductCreate(BaseModel):
    product_name: str
    my_price: float
    platform: Optional[str] = None
    category: Optional[str] = None
    emoji_icon: Optional[str] = None
    min_price_floor: Optional[float] = None
    max_price_ceiling: Optional[float] = None

class SellerProductUpdate(BaseModel):
    product_name: Optional[str] = None
    my_price: Optional[float] = None
    platform: Optional[str] = None
    category: Optional[str] = None
    emoji_icon: Optional[str] = None
    min_price_floor: Optional[float] = None
    max_price_ceiling: Optional[float] = None
    status: Optional[SellerStatus] = None

class SellerProductOut(BaseModel):
    id: UUID
    user_id: UUID
    product_id: Optional[str] = None
    product_name: str
    emoji_icon: Optional[str] = None
    category: Optional[str] = None
    my_price: float
    price_when_added: float
    cached_lowest_comp_price: Optional[float] = None
    cached_market_visibility_pct: Optional[float] = None
    min_price_floor: Optional[float] = None
    max_price_ceiling: Optional[float] = None
    target_rank: Optional[int] = None
    product_url: Optional[str] = None
    platform: Optional[str] = None
    status: SellerStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SellerProductListResponse(BaseModel):
    data: List[SellerProductOut]

class SellerProductResponse(BaseModel):
    data: SellerProductOut

# Price History
class PriceHistoryOut(BaseModel):
    id: UUID
    seller_product_id: UUID
    old_price: float
    new_price: float
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PriceHistoryListResponse(BaseModel):
    data: List[PriceHistoryOut]

# Price Alerts (Reseller)
class PriceAlertCreate(BaseModel):
    seller_product_id: Optional[UUID] = None
    trigger_mode: PriceAlertTrigger
    target_margin_pct: Optional[float] = None
    threshold_value: Optional[float] = None
    threshold_type: ThresholdType = ThresholdType.ABSOLUTE
    priority: Priority = Priority.MEDIUM

class PriceAlertUpdate(BaseModel):
    trigger_mode: Optional[PriceAlertTrigger] = None
    target_margin_pct: Optional[float] = None
    threshold_value: Optional[float] = None
    threshold_type: Optional[ThresholdType] = None
    priority: Optional[Priority] = None
    is_active: Optional[bool] = None

class PriceAlertOut(BaseModel):
    id: UUID
    user_id: UUID
    seller_product_id: Optional[UUID] = None
    trigger_mode: PriceAlertTrigger
    target_margin_pct: Optional[float] = None
    threshold_value: Optional[float] = None
    threshold_type: ThresholdType
    priority: Priority
    risk_level: Optional[RiskLevel] = None
    is_active: bool
    last_triggered_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PriceAlertListResponse(BaseModel):
    data: List[PriceAlertOut]

class PriceAlertResponse(BaseModel):
    data: PriceAlertOut

# Competitors
class TrackedCompetitorCreate(BaseModel):
    seller_name: str
    seller_id: str
    platform: Optional[str] = None
    domain: Optional[str] = None

class TrackedCompetitorOut(BaseModel):
    id: UUID
    user_id: UUID
    seller_id: str
    seller_name: str
    domain: Optional[str] = None
    platform: Optional[str] = None
    aggressiveness: Aggressiveness
    aggressiveness_description: Optional[str] = None
    competitiveness: int
    competitiveness_trend: int
    spark_color: str
    last_enriched_at: Optional[datetime] = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TrackedCompetitorListResponse(BaseModel):
    data: List[TrackedCompetitorOut]

class TrackedCompetitorResponse(BaseModel):
    data: TrackedCompetitorOut
