import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Enum, ForeignKey, Text, func, Numeric, Integer, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base
import enum

class AlertCondition(str, enum.Enum):
    BELOW_TARGET = "below_target"
    ANY_CHANGE = "any_change"
    DROP_10PCT = "drop_10pct"
    DROP_20PCT = "drop_20pct"

class DeliveryChannel(str, enum.Enum):
    WEBSOCKET = "websocket"
    EMAIL = "email"
    PUSH = "push"

class DeliveryStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"

class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[str] = mapped_column(String(255), nullable=False)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    emoji_icon: Mapped[str | None] = mapped_column(String(10), nullable=True)
    platform: Mapped[str | None] = mapped_column(String(100), nullable=True)
    target_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    original_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    alert_condition: Mapped[AlertCondition] = mapped_column(Enum(AlertCondition), default=AlertCondition.BELOW_TARGET, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="watchlist_items")
    shopper_alerts = relationship("ShopperAlert", back_populates="watchlist_item", cascade="all, delete-orphan")

class ShopperAlert(Base):
    __tablename__ = "shopper_alerts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    watchlist_item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("watchlist_items.id", ondelete="CASCADE"), nullable=False)
    condition_type: Mapped[AlertCondition] = mapped_column(Enum(AlertCondition), nullable=False)
    target_value: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    progress_pct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(15), default='active', nullable=False)
    notify_email: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_push: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    triggered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (CheckConstraint('progress_pct >= 0 AND progress_pct <= 100', name='check_progress_pct_range'),)

    user = relationship("User", back_populates="shopper_alerts")
    watchlist_item = relationship("WatchlistItem", back_populates="shopper_alerts")

class AlertEvent(Base):
    __tablename__ = "alert_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[str] = mapped_column(Text, nullable=False)
    product_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str | None] = mapped_column(Text, nullable=True)
    old_price: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    new_price: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    drop_percent: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    alert_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    deliveries = relationship("NotificationDelivery", back_populates="alert_event", cascade="all, delete-orphan")

class NotificationDelivery(Base):
    __tablename__ = "notification_deliveries"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    alert_event_id: Mapped[int] = mapped_column(ForeignKey("alert_events.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    channel: Mapped[DeliveryChannel] = mapped_column(Enum(DeliveryChannel), nullable=False)
    status: Mapped[DeliveryStatus] = mapped_column(Enum(DeliveryStatus), default=DeliveryStatus.PENDING, nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notification_deliveries")
    alert_event = relationship("AlertEvent", back_populates="deliveries")
