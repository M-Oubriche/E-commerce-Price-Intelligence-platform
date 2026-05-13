from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from uuid import UUID
from models.users import UserRole

# AlertPreferences schemas
class AlertPreferencesUpdate(BaseModel):
    price_drop_alerts: Optional[bool] = None
    market_trend_reports: Optional[bool] = None
    price_rise_warnings: Optional[bool] = None
    new_deals: Optional[bool] = None
    websocket_live: Optional[bool] = None
    email_notifications: Optional[bool] = None

class AlertPreferencesOut(BaseModel):
    price_drop_alerts: bool
    market_trend_reports: bool
    price_rise_warnings: bool
    new_deals: bool
    websocket_live: bool
    email_notifications: bool
    updated_at: datetime

    class Config:
        from_attributes = True

# DisplayPreferences schemas
class DisplayPreferencesUpdate(BaseModel):
    theme: Optional[str] = None
    compact_density: Optional[bool] = None
    animations_enabled: Optional[bool] = None
    show_ticker: Optional[bool] = None
    language: Optional[str] = None
    currency: Optional[str] = None
    timezone: Optional[str] = None

class DisplayPreferencesOut(BaseModel):
    theme: str
    compact_density: bool
    animations_enabled: bool
    show_ticker: bool
    language: str
    currency: str
    timezone: str
    updated_at: datetime

    class Config:
        from_attributes = True

# UserProfile schemas
class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    initials: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None

class UserProfileOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    initials: Optional[str]
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True

class UserSessionOut(BaseModel):
    id: UUID
    device_info: Optional[str]
    ip_address: Optional[str]
    created_at: datetime
    last_used_at: datetime
    is_current: bool = False

    class Config:
        from_attributes = True
