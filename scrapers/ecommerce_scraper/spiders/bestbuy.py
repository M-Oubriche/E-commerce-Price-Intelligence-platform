import os
import requests
from typing import Iterator

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
            raise ValueError("BESTBUY_API_KEY environment variable is not set")
            
        for page in range(1, max_pages + 1):
            url = f"{self.base_url}({query})"
            params = {
                "apiKey": self.api_key,
                "format": "json",
                "show": "sku,name,manufacturer,categoryPath,regularPrice,salePrice,url,image,customerReviewAverage,customerReviewCount,onlineAvailability",
                "pageSize": 50,
                "page": page
            }
            
            response = requests.get(url, params=params)
            if response.status_code != 200:
                print(f"Failed to fetch BestBuy API: {response.status_code}")
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
            )
        )
