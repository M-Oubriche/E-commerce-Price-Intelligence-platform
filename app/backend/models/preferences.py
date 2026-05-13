import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base

class AlertPreference(Base):
    __tablename__ = "alert_preferences"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    price_drop_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    market_trend_reports: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    price_rise_warnings: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    new_deals: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    websocket_live: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="alert_prefs")

class DisplayPreference(Base):
    __tablename__ = "display_preferences"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    theme: Mapped[str] = mapped_column(String(10), default='dark', nullable=False)
    compact_density: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    animations_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    show_ticker: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    language: Mapped[str] = mapped_column(String(10), default='en', nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default='USD', nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), default='UTC', nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="display_prefs")
