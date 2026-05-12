from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID
from typing import List, Optional

class NotificationOut(BaseModel):
    id: UUID
    alert_event_id: int
    product_name: Optional[str] = None
    old_price: Optional[float] = None
    new_price: Optional[float] = None
    drop_percent: Optional[float] = None
    platform: Optional[str] = None
    channel: str
    status: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class NotificationListResponse(BaseModel):
    data: List[NotificationOut]

class UnreadCountData(BaseModel):
    count: int

class UnreadCountResponse(BaseModel):
    data: UnreadCountData
