import requests
from bs4 import BeautifulSoup
from typing import Iterator
import re

from ..base import BaseScraper
from ..models import (
    RawLandingRecord, IngestionType, Currency, Category, 
    Product, Pricing, Availability, Seller, SellerType, Ratings
)

class UltraPCScraper(BaseScraper):
    """
    Scraper for UltraPC.ma, a Moroccan IT retailer.
    """
    
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        }
        

    def _parse_price(self, text: str) -> float:
        # Example format: "10 500,00 MAD"
        cleaned = text.replace("MAD", "").replace(" ", "").replace("\xa0", "").strip()
        # Convert comma to dot for parsing
        cleaned = cleaned.replace(",", ".")
        try:
            return float(cleaned)
        except ValueError:
            return 0.0

    def scrape(self, url: str, category: Category, max_pages: int = 1) -> Iterator[RawLandingRecord]:
        if not url:
            print(f"Skipping UltraPC {category}: no URL provided.")
            return

        for page in range(1, max_pages + 1):
            # UltraPC category pages use ?page=X for pagination
            params = {"page": page} if page > 1 else {}
            
            try:
                response = requests.get(url, headers=self.headers, params=params, timeout=15)
                
                if response.status_code != 200:
                    print(f"Failed to fetch UltraPC HTML: Status {response.status_code}")
                    break
                    
                soup = BeautifulSoup(response.text, "html.parser")
                
                # Product containers on UltraPC
                results = soup.select(".product-miniature")
                
                if not results:
                    # They might use .product-miniature on some pages
                    results = soup.select(".product-miniature")
                    if not results:
                        break
                    
                for item in results:
                    record = self._parse_item(item, category)
                    if record:
                        yield record
                        
            except Exception as e:
                print(f"UltraPC Scraper Error on page {page}: {e}")
                break

    def _parse_item(self, item, category: Category) -> RawLandingRecord:
        # Link & Title
        title_tag = item.select_one("h2.product-title a, h3.product-title a, .product-title a")
        if not title_tag:
            return None
            
        title = title_tag.text.strip()
        source_url = title_tag.get("href", "")
        
        # ID
        # Extract from URL or product attributes
        external_id = item.get("data-id-product", "")
        if not external_id and "-" in source_url:
            # Often structured like /123-brand-name.html
            match = re.search(r"/(\d+)-", source_url)
            if match:
                external_id = match.group(1)
        
        if not external_id:
            external_id = "Unknown"
        
        # Price
        price_tag = item.select_one(".price")
        raw_price = 0.0
        if price_tag:
            raw_price = self._parse_price(price_tag.text)
            
        old_price_tag = item.select_one(".regular-price")
        original_price = raw_price
        if old_price_tag:
            original_price = self._parse_price(old_price_tag.text)
            
        discount_percent = 0.0
        if original_price > 0 and raw_price < original_price:
            discount_percent = round((original_price - raw_price) / original_price * 100, 2)
            
        # Image
        img_tag = item.select_one("img")
        img_url = img_tag.get("src", "") if img_tag else ""
        if not img_url and img_tag:
             img_url = img_tag.get("data-src", "")
             
        # Availability
        in_stock = True
        out_of_stock_tag = item.select_one(".out-of-stock")
        if out_of_stock_tag:
            in_stock = False
            
        # Optional Description from mini description area
        desc_tag = item.select_one(".product-description-short")
        description = desc_tag.text.strip() if desc_tag else None

        return RawLandingRecord(
            ingestion_type=IngestionType.BATCH,
            source="ultrapc",
            source_url=source_url,
            product=Product(
                external_id=external_id,
                model_number=None, # UltraPC list view doesn't easily expose model number
                name=title,
                brand="Unknown", # Often buried in details page
                description=description,
                category=category,
                image_url=img_url
            ),
            pricing=Pricing(
                raw_price=raw_price,
                raw_currency=Currency.MAD,
                converted_price_usd=round(raw_price * 0.1, 2), # rough estimate 1 MAD = 0.1 USD
                original_price_usd=round(original_price * 0.1, 2),
                discount_percent=discount_percent,
                conversion_rate_used=0.1
            ),
            availability=Availability(
                in_stock=in_stock,
                shipping_available=in_stock
            ),
            seller=Seller(
                seller_name="UltraPC",
                seller_type=SellerType.OFFICIAL,
                seller_location="MA"
            )
        )
