import os
import requests
from typing import Iterator

from ..base import BaseScraper
from ..models import (
    RawLandingRecord, IngestionType, Currency, Category, 
    Product, Pricing, Availability, Seller, SellerType, Ratings
)

class EbayScraper(BaseScraper):
    """
    Scraper for eBay using the eBay Browse API.
    A valid OAuth token is required in the environment variables.
    """
    
    def __init__(self):
        self.auth_token = os.getenv("EBAY_AUTH_TOKEN")
        self.base_url = "https://api.ebay.com/buy/browse/v1/item_summary/search"
        
    def scrape(self, query: str, category: Category, max_pages: int = 1) -> Iterator[RawLandingRecord]:
        if not self.auth_token:
            print("Warning: EBAY_AUTH_TOKEN environment variable is not set. API calls mapping will fail.")
            return

        headers = {
            "Authorization": f"Bearer {self.auth_token}",
            "Content-Type": "application/json",
            "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" 
        }
        
        for page in range(1, max_pages + 1):
            params = {
                "q": query,
                "limit": 50,
                "offset": (page - 1) * 50
            }
            
            response = requests.get(self.base_url, headers=headers, params=params)
            if response.status_code != 200:
                print(f"Failed to fetch eBay API: {response.text}")
                break
                
            data = response.json()
            items = data.get("itemSummaries", [])
            
            for item in items:
                yield self._parse_item(item, category)
                
            if "next" not in data:
                break

    def _parse_item(self, item: dict, category: Category) -> RawLandingRecord:
        price_data = item.get("price", {})
        raw_price = float(price_data.get("value", 0.0))
        currency_str = price_data.get("currency", "USD")
        
        try:
            currency = Currency(currency_str)
        except ValueError:
            currency = Currency.USD
            
        marketing_price = item.get("marketingPrice", {})
        original_price_data = marketing_price.get("originalPrice", {})
        original_price = float(original_price_data.get("value", raw_price))
        
        discount_percent = 0.0
        if original_price > 0 and raw_price < original_price:
            discount_percent = round((original_price - raw_price) / original_price * 100, 2)
            
        # Extract brand from specific attributes
        brand = "Unknown"
        for attr in item.get("itemGroupAdditionalImages", []):
             brand = "Unknown"
             
        seller_data = item.get("seller", {})
        seller_username = seller_data.get("username", "Unknown")
        seller_feedback = seller_data.get("feedbackPercentage", None)

        return RawLandingRecord(
            ingestion_type=IngestionType.BATCH,
            source="ebay",
            source_url=item.get("itemWebUrl", ""),
            product=Product(
                external_id=str(item.get("itemId")),
                name=item.get("title", ""),
                brand=brand,
                category=category,
                image_url=item.get("image", {}).get("imageUrl", "")
            ),
            pricing=Pricing(
                raw_price=raw_price,
                raw_currency=currency,
                converted_price_usd=raw_price, # assuming USD for EBAY_US
                original_price_usd=original_price,
                discount_percent=discount_percent,
                conversion_rate_used=1.0
            ),
            availability=Availability(
                in_stock=True, # usually if it's in Browse API search, it's purchasable
                shipping_available=True
            ),
            seller=Seller(
                seller_name=seller_username,
                seller_type=SellerType.MARKETPLACE,
                seller_location=item.get("itemLocation", {}).get("country", "US"),
                seller_rating=float(seller_feedback) / 20.0 if seller_feedback else None # convert 100% to 5.0 scale
            )
        )
