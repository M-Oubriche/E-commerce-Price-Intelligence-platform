import os
import requests
from bs4 import BeautifulSoup
from typing import Iterator, Optional
from datetime import datetime, timezone

from ..base import BaseScraper
from ..models import (
    RawLandingRecord, IngestionType, Currency, Category, 
    Product, Pricing, Availability, Seller, SellerType, Ratings
)

class JumiaScraper(BaseScraper):
    """
    Scraper for Jumia.ma.
    Uses requests and BeautifulSoup to extract product data from a given category URL.
    """
    
    def __init__(self, conversion_rate_to_usd: float = 0.10):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept-Language": "en-US,en;q=0.9,fr;q=0.8"
        }
        self.conversion_rate = conversion_rate_to_usd
        
    def _parse_price(self, price_str: str) -> float:
        # e.g., "1,500.00 Dhs" -> 1500.00
        cleaned = "".join([c for c in price_str if c.isdigit() or c == '.'])
        try:
            return float(cleaned)
        except ValueError:
            return 0.0

    def scrape(self, url: str, category: Category, max_pages: int = 1) -> Iterator[RawLandingRecord]:
        for page in range(1, max_pages + 1):
            page_url = f"{url}?page={page}" if "?" not in url else f"{url}&page={page}"
            response = requests.get(page_url, headers=self.headers)
            if response.status_code != 200:
                print(f"Failed to fetch {page_url}")
                continue
                
            soup = BeautifulSoup(response.text, 'html.parser')
            # Adjust typical structure based on Jumia UI (may require actual reverse engineering if changed)
            items = soup.find_all("article", class_="prd _fb col c-prd")
            
            if not items:
                break
                
            for item in items:
                yield self._parse_item(item, category)

    def _parse_item(self, item, category: Category) -> RawLandingRecord:
        link_tag = item.find("a", class_="core")
        source_url = "https://www.jumia.ma" + link_tag.get("href", "") if link_tag else ""
        
        name_tag = item.find("h3", class_="name")
        name = name_tag.text.strip() if name_tag else "Unknown Product"
        
        price_tag = item.find("div", class_="prc")
        raw_price = self._parse_price(price_tag.text) if price_tag else 0.0
        
        old_price_tag = item.find("div", class_="old")
        original_price_mad = self._parse_price(old_price_tag.text) if old_price_tag else raw_price
        
        discount_tag = item.find("div", class_="bdg _dsct _sm")
        discount_percent = float(discount_tag.text.strip("%- ")) if discount_tag else 0.0
        
        img_tag = item.find("img", class_="img")
        img_url = img_tag.get("data-src", "") if img_tag else ""
        
        # Jumia brand is sometimes in the product name or data attributes
        brand = item.get("data-brand", "Unknown")
        item_id = item.get("data-id", "Unknown")

        rating_tag = item.find("div", class_="stars _s")
        rating = None
        if rating_tag:
            # "4 out of 5" -> 4.0
            text = rating_tag.text
            try:
                rating = float(text.split(" ")[0])
            except ValueError:
                pass

        converted_price = raw_price * self.conversion_rate
        original_price_usd = original_price_mad * self.conversion_rate

        return RawLandingRecord(
            ingestion_type=IngestionType.BATCH,
            source="jumia.ma",
            source_url=source_url,
            product=Product(
                external_id=item_id,
                name=name,
                brand=brand,
                category=category,
                image_url=img_url
            ),
            pricing=Pricing(
                raw_price=raw_price,
                raw_currency=Currency.MAD,
                converted_price_usd=converted_price,
                original_price_usd=original_price_usd,
                discount_percent=discount_percent,
                conversion_rate_used=self.conversion_rate
            ),
            availability=Availability(
                in_stock=True, # Listed items are generally in stock
                shipping_available=True
            ),
            seller=Seller(
                seller_name="Jumia Marketplace",
                seller_type=SellerType.MARKETPLACE,
                seller_location="MA"
            ),
            ratings=Ratings(
                avg_rating=rating
            )
        )


def main():
    scraper = JumiaScraper()
    scraper.scrape()

if __name__ == "__main__":
    main()