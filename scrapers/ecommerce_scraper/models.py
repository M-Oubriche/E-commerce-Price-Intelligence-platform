from enum import Enum
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, HttpUrl

class IngestionType(str, Enum):
    STREAMING = "streaming"
    BATCH = "batch"

class Currency(str, Enum):
    USD = "USD"
    MAD = "MAD"
    EUR = "EUR"

class Category(str, Enum):
    GPU = "GPU"
    CPU = "CPU"
    RAM = "RAM"
    SSD = "SSD"
    HDD = "HDD"
    MONITOR = "Monitor"
    KEYBOARD = "Keyboard"
    MOUSE = "Mouse"
    PSU = "PSU"
    CASE = "Case"
    COOLING = "Cooling"
    MOTHERBOARD = "Motherboard"
    LAPTOP = "Laptop"
    DESKTOP = "Desktop"
    MOBILE = "Mobile"
    PERIPHERAL = "Peripheral"
    OTHER = "Other"

    @classmethod
    def from_str(cls, label: str):
        label_lower = label.lower()
        for category in cls:
            if category.value.lower() == label_lower:
                return category
        raise ValueError(f"{label} is not a valid Category")

class SellerType(str, Enum):
    OFFICIAL = "official"
    MARKETPLACE = "marketplace"

class Product(BaseModel):
    external_id: str
    name: str
    brand: str
    category: Category
    description: Optional[str] = None
    image_url: Optional[str] = None

class Pricing(BaseModel):
    raw_price: float
    raw_currency: Currency
    converted_price_usd: Optional[float] = None
    original_price_usd: Optional[float] = None
    discount_percent: Optional[float] = None
    conversion_rate_used: float = 1.0

class Availability(BaseModel):
    in_stock: bool
    quantity: Optional[int] = None
    shipping_available: Optional[bool] = None

class Seller(BaseModel):
    seller_name: str
    seller_type: SellerType
    seller_rating: Optional[float] = None
    seller_location: Optional[str] = None

class Ratings(BaseModel):
    avg_rating: Optional[float] = None
    review_count: Optional[int] = None

# Specs models
class GPUSpecs(BaseModel):
    vram_gb: Optional[float] = None
    tdp_watts: Optional[float] = None
    base_clock_mhz: Optional[float] = None
    boost_clock_mhz: Optional[float] = None
    memory_type: Optional[str] = None
    interface: Optional[str] = None

class CPUSpecs(BaseModel):
    cores: Optional[int] = None
    threads: Optional[int] = None
    base_clock_ghz: Optional[float] = None
    boost_clock_ghz: Optional[float] = None
    socket: Optional[str] = None
    tdp_watts: Optional[float] = None

class RAMSpecs(BaseModel):
    capacity_gb: Optional[float] = None
    speed_mhz: Optional[float] = None
    type: Optional[str] = None
    latency: Optional[str] = None
    kit: Optional[str] = None

class SSDSpecs(BaseModel):
    capacity_gb: Optional[float] = None
    interface: Optional[str] = None
    read_speed_mbps: Optional[float] = None
    write_speed_mbps: Optional[float] = None
    form_factor: Optional[str] = None

class MonitorSpecs(BaseModel):
    resolution: Optional[str] = None
    refresh_rate_hz: Optional[float] = None
    panel_type: Optional[str] = None
    size_inches: Optional[float] = None
    response_time_ms: Optional[float] = None

class KeyboardSpecs(BaseModel):
    switch_type: Optional[str] = None
    layout: Optional[str] = None
    connectivity: Optional[str] = None
    backlight: Optional[str] = None
    form_factor: Optional[str] = None

class MouseSpecs(BaseModel):
    dpi_max: Optional[int] = None
    buttons: Optional[int] = None
    connectivity: Optional[str] = None
    sensor_type: Optional[str] = None
    weight_g: Optional[float] = None

class PSUSpecs(BaseModel):
    wattage: Optional[float] = None
    efficiency_rating: Optional[str] = None
    modular: Optional[str] = None
    form_factor: Optional[str] = None

class MotherboardSpecs(BaseModel):
    socket: Optional[str] = None
    chipset: Optional[str] = None
    form_factor: Optional[str] = None
    ram_slots: Optional[int] = None
    max_ram_gb: Optional[float] = None

class CoolingSpecs(BaseModel):
    type: Optional[str] = Field(None, description="air|liquid")
    tdp_support_watts: Optional[float] = None
    fan_size_mm: Optional[float] = None
    socket_support: Optional[str] = None

class HDDSpecs(BaseModel):
    capacity_gb: Optional[float] = None
    rpm: Optional[int] = None
    interface: Optional[str] = None
    cache_mb: Optional[int] = None
    form_factor: Optional[str] = None

class LaptopSpecs(BaseModel):
    cpu_model: Optional[str] = None
    ram_gb: Optional[float] = None
    storage_gb: Optional[float] = None
    screen_size_inches: Optional[float] = None
    gpu_model: Optional[str] = None
    battery_wh: Optional[float] = None

class DesktopSpecs(BaseModel):
    cpu_model: Optional[str] = None
    ram_gb: Optional[float] = None
    storage_gb: Optional[float] = None
    gpu_model: Optional[str] = None
    form_factor: Optional[str] = None
    os: Optional[str] = None

class MobileSpecs(BaseModel):
    soc_model: Optional[str] = None
    ram_gb: Optional[float] = None
    storage_gb: Optional[float] = None
    screen_size_inches: Optional[float] = None
    battery_mah: Optional[float] = None
    camera_mp: Optional[float] = None

class Specs(BaseModel):
    """
    Groups the specs based on category. A product usually populates only one of these.
    """
    GPU: Optional[GPUSpecs] = None
    CPU: Optional[CPUSpecs] = None
    RAM: Optional[RAMSpecs] = None
    SSD: Optional[SSDSpecs] = None
    HDD: Optional[HDDSpecs] = None
    Monitor: Optional[MonitorSpecs] = None
    Keyboard: Optional[KeyboardSpecs] = None
    Mouse: Optional[MouseSpecs] = None
    PSU: Optional[PSUSpecs] = None
    Case: Optional[Dict[str, Any]] = None
    Cooling: Optional[CoolingSpecs] = None
    Motherboard: Optional[MotherboardSpecs] = None
    Laptop: Optional[LaptopSpecs] = None
    Desktop: Optional[DesktopSpecs] = None
    Mobile: Optional[MobileSpecs] = None
    Peripheral: Optional[Dict[str, Any]] = None
    Other: Optional[Dict[str, Any]] = None

class RawLandingRecord(BaseModel):
    raw_id: UUID = Field(default_factory=uuid4)
    ingestion_type: IngestionType
    source: str
    source_url: str
    scraped_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    product: Product
    pricing: Pricing
    availability: Availability
    seller: Seller
    ratings: Optional[Ratings] = None
    specs: Optional[Specs] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
