from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class ActivityLogCreate(BaseModel):
    action: str
    entity_type: str
    entity_id: str
    log_metadata: Optional[dict] = None

class ActivityLogOut(BaseModel):
    id: UUID
    action: str
    entity_type: Optional[str]
    entity_id: Optional[str]
    log_metadata: Optional[dict]
    created_at: datetime

    class Config:
        from_attributes = True

class ActivityLogListResponse(BaseModel):
    data: List[ActivityLogOut]
