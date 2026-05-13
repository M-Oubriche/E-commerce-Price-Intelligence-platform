import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Enum, ForeignKey, Text, func, Numeric, Integer, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base
import enum

class SellerStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    ARCHIVED = "archived"

class Aggressiveness(str, enum.Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

class RiskLevel(str, enum.Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"
    HEALTHY = "Healthy"

class PriceAlertTrigger(str, enum.Enum):
    MARGIN_DROPS_BELOW = "MARGIN_DROPS_BELOW"
    PRICE_UNDERCUT_BY = "PRICE_UNDERCUT_BY"

class ThresholdType(str, enum.Enum):
    ABSOLUTE = "ABSOLUTE"
    PERCENT = "PERCENT"

class Priority(str, enum.Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

class SellerProduct(Base):
    __tablename__ = "seller_products"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    emoji_icon: Mapped[str | None] = mapped_column(String(10), nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    my_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    price_when_added: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    cached_lowest_comp_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    cached_market_visibility_pct: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    min_price_floor: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    max_price_ceiling: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    target_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    product_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    platform: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[SellerStatus] = mapped_column(Enum(SellerStatus), default=SellerStatus.ACTIVE, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (CheckConstraint('cached_market_visibility_pct >= 0 AND cached_market_visibility_pct <= 100', name='check_visibility_pct_range'),)

    user = relationship("User", back_populates="seller_products")
    price_history = relationship("SellerProductPriceHistory", back_populates="seller_product", cascade="all, delete-orphan")
    competitor_overlaps = relationship("TrackedCompetitorProduct", back_populates="seller_product", cascade="all, delete-orphan")
    price_alerts = relationship("PriceAlert", back_populates="seller_product", cascade="all, delete-orphan")

class SellerProductPriceHistory(Base):
    __tablename__ = "seller_product_price_history"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    seller_product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("seller_products.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    old_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    new_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    seller_product = relationship("SellerProduct", back_populates="price_history")

class TrackedCompetitor(Base):
    __tablename__ = "tracked_competitors"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    seller_id: Mapped[str] = mapped_column(String(255), nullable=False)
    seller_name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    platform: Mapped[str | None] = mapped_column(String(100), nullable=True)
    aggressiveness: Mapped[Aggressiveness] = mapped_column(Enum(Aggressiveness), default=Aggressiveness.LOW, nullable=False)
    aggressiveness_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    competitiveness: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    competitiveness_trend: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    spark_color: Mapped[str] = mapped_column(String(10), default='#3B82F6', nullable=False)
    last_enriched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (CheckConstraint('competitiveness >= 0 AND competitiveness <= 1000', name='check_competitiveness_range'),)

    user = relationship("User", back_populates="tracked_competitors")
    competitor_products = relationship("TrackedCompetitorProduct", back_populates="competitor", cascade="all, delete-orphan")

class TrackedCompetitorProduct(Base):
    __tablename__ = "tracked_competitor_products"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tracked_competitor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tracked_competitors.id", ondelete="CASCADE"), nullable=False)
    seller_product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("seller_products.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[str] = mapped_column(String(255), nullable=False)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    their_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    price_gap: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    risk_level: Mapped[RiskLevel] = mapped_column(Enum(RiskLevel), default=RiskLevel.LOW, nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    competitor = relationship("TrackedCompetitor", back_populates="competitor_products")
    seller_product = relationship("SellerProduct", back_populates="competitor_overlaps")

class PriceAlert(Base):
    __tablename__ = "price_alerts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    seller_product_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("seller_products.id", ondelete="CASCADE"), nullable=True)
    trigger_mode: Mapped[PriceAlertTrigger] = mapped_column(Enum(PriceAlertTrigger), nullable=False)
    target_margin_pct: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    threshold_value: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    threshold_type: Mapped[ThresholdType] = mapped_column(Enum(ThresholdType), default=ThresholdType.ABSOLUTE, nullable=False)
    priority: Mapped[Priority] = mapped_column(Enum(Priority), default=Priority.MEDIUM, nullable=False)
    risk_level: Mapped[RiskLevel | None] = mapped_column(Enum(RiskLevel), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_triggered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="price_alerts")
    seller_product = relationship("SellerProduct", back_populates="price_alerts")
