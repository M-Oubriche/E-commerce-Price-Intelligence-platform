import os
import requests
from typing import Iterator, Optional

from ..base import BaseScraper
from ..models import (
    RawLandingRecord, IngestionType, Currency, Category, 
    Product, Pricing, Availability, Seller, SellerType, Ratings, Specs
)

class BestBuyScraper(BaseScraper):
    """
    Scraper for BestBuy using their official API.
    """
    
    def __init__(self):
        self.api_key = os.getenv("BESTBUY_API_KEY")
        self.base_url = "https://api.bestbuy.com/v1/products"
        
    def scrape(self, query: str, category: Category, max_pages: int = 1) -> Iterator[RawLandingRecord]:
        if not self.api_key:
            raise ValueError(
                "BESTBUY_API_KEY environment variable is not set. "
                "Check your .env file."
            )
            
        # If a full URL is passed instead of a query, try to extract the ID
        if "bestbuy.com" in query:
            import re
            # Try to find id=XXXX or search for abcatXXXX / pcmcatXXXX patterns
            match = re.search(r"id=((?:abcat|pcmcat)\d+)", query)
            if not match:
                match = re.search(r"((?:abcat|pcmcat)\d+)", query)
            
            if match:
                query = f"categoryPath.id={match.group(1)}"
            else:
                print(f"Warning: Could not extract BestBuy category ID from URL: {query}")

        for page in range(1, max_pages + 1):
            url = f"{self.base_url}({query})"
            params = {
                "apiKey": self.api_key,
                "format": "json",
                "show": "sku,name,manufacturer,categoryPath,regularPrice,salePrice,url,image,customerReviewAverage,customerReviewCount,onlineAvailability,longDescription,details",
                "pageSize": 50,
                "page": page
            }
            
            response = requests.get(url, params=params)
            if response.status_code != 200:
                print(f"Failed to fetch BestBuy API: {response.status_code} - {response.text}")
                break
                
            data = response.json()
            products = data.get("products", [])
            for item in products:
                yield self._parse_item(item, category)
                
            if page >= data.get("totalPages", 1):
                break

    def _parse_item(self, item: dict, category: Category) -> RawLandingRecord:
        raw_price = float(item.get("salePrice", 0.0))
        original_price = float(item.get("regularPrice", 0.0))
        
        discount_percent = 0.0
        if original_price > 0 and raw_price < original_price:
            discount_percent = round((original_price - raw_price) / original_price * 100, 2)
            
        return RawLandingRecord(
            ingestion_type=IngestionType.BATCH,
            source="bestbuy",
            source_url=item.get("url", ""),
            product=Product(
                external_id=str(item.get("sku")),
                name=item.get("name", ""),
                brand=item.get("manufacturer", "Unknown"),
                category=category,
                description=item.get("longDescription"),
                image_url=item.get("image", "")
            ),
            pricing=Pricing(
                raw_price=raw_price,
                raw_currency=Currency.USD,
                converted_price_usd=raw_price,
                original_price_usd=original_price,
                discount_percent=discount_percent,
                conversion_rate_used=1.0
            ),
            availability=Availability(
                in_stock=item.get("onlineAvailability", False),
                quantity=item.get("quantity"),
                shipping_available=item.get("onlineAvailability", False),
            ),
            seller=Seller(
                seller_name="BestBuy Official",
                seller_type=SellerType.OFFICIAL,
                seller_location="US"
            ),
            ratings=Ratings(
                avg_rating=item.get("customerReviewAverage"),
                review_count=item.get("customerReviewCount")
            ),
            specs=self._parse_specs(item.get("details", []), category)
        )

    def _extract_number(self, value: str) -> Optional[float]:
        if not value:
            return None
        import re
        # Handle cases like "16 gigabytes", "1.1 terabytes", "3.2 gigahertz"
        match = re.search(r"(\d+(\.\d+)?)", str(value))
        if match:
            num = float(match.group(1))
            # Multiplication for Terabytes to Gigabytes if needed
            if "terabyte" in str(value).lower() or "tb" in str(value).lower():
                num *= 1024
            return num
        return None

    def _parse_specs(self, details: list, category: Category) -> Optional[Specs]:
        if not details:
            return None
            
        d = {det.get("name"): det.get("value") for det in details if det.get("name")}
        
        try:
            if category == Category.LAPTOP:
                from ..models import LaptopSpecs
                return Specs(Laptop=LaptopSpecs(
                    cpu_model=d.get("Processor Model"),
                    ram_gb=self._extract_number(d.get("System Memory (RAM)")),
                    storage_gb=self._extract_number(d.get("Total Storage Capacity")),
                    screen_size_inches=self._extract_number(d.get("Screen Size")),
                    gpu_model=d.get("Graphics"),
                ))
            elif category == Category.DESKTOP:
                from ..models import DesktopSpecs
                return Specs(Desktop=DesktopSpecs(
                    cpu_model=d.get("Processor Model"),
                    ram_gb=self._extract_number(d.get("System Memory (RAM)")),
                    storage_gb=self._extract_number(d.get("Total Storage Capacity")),
                    gpu_model=d.get("Graphics"),
                    os=d.get("Operating System")
                ))
            elif category == Category.GPU:
                from ..models import GPUSpecs
                return Specs(GPU=GPUSpecs(
                    vram_gb=self._extract_number(d.get("Video Memory Capacity")),
                    memory_type=d.get("Memory Type"),
                    interface=d.get("Interface(s)")
                ))
            elif category == Category.CPU:
                from ..models import CPUSpecs
                return Specs(CPU=CPUSpecs(
                    cores=int(self._extract_number(d.get("Number of Cores") or 0)) or None,
                    threads=int(self._extract_number(d.get("Number of Threads") or 0)) or None,
                    base_clock_ghz=self._extract_number(d.get("Processor Base Clock Speed")),
                    socket=d.get("Processor Socket")
                ))
            elif category == Category.MONITOR:
                from ..models import MonitorSpecs
                return Specs(Monitor=MonitorSpecs(
                    resolution=d.get("Maximum Resolution"),
                    refresh_rate_hz=self._extract_number(d.get("Refresh Rate")),
                    panel_type=d.get("Panel Type"),
                    size_inches=self._extract_number(d.get("Screen Size")),
                    response_time_ms=self._extract_number(d.get("Response Time"))
                ))
            elif category == Category.RAM:
                from ..models import RAMSpecs
                return Specs(RAM=RAMSpecs(
                    capacity_gb=self._extract_number(d.get("System Memory (RAM)")),
                    speed_mhz=self._extract_number(d.get("Memory Speed")),
                    type=d.get("Memory Type")
                ))
            elif category == Category.SSD:
                from ..models import SSDSpecs
                return Specs(SSD=SSDSpecs(
                    capacity_gb=self._extract_number(d.get("Capacity")),
                    interface=d.get("Interface(s)"),
                    form_factor=d.get("Form Factor")
                ))
            elif category == Category.HDD:
                from ..models import HDDSpecs
                return Specs(HDD=HDDSpecs(
                    capacity_gb=self._extract_number(d.get("Capacity")),
                    interface=d.get("Interface(s)"),
                    rpm=int(self._extract_number(d.get("Spindle Speed") or 0)) or None
                ))
            elif category == Category.KEYBOARD:
                from ..models import KeyboardSpecs
                return Specs(Keyboard=KeyboardSpecs(
                    switch_type=d.get("Key Switch Type"),
                    layout=d.get("Keyboard Layout"),
                    connectivity=d.get("Interface(s)"),
                    backlight=d.get("Backlit")
                ))
            elif category == Category.MOUSE:
                from ..models import MouseSpecs
                return Specs(Mouse=MouseSpecs(
                    dpi_max=int(self._extract_number(d.get("Maximum Sensitivity") or 0)) or None,
                    buttons=int(self._extract_number(d.get("Number of Buttons (Total)") or 0)) or None,
                    connectivity=d.get("Interface(s)")
                ))
        except Exception as e:
            print(f"Error parsing specs for {category}: {e}")
            
        return None

