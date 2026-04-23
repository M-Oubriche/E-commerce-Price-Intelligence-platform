import requests
from bs4 import BeautifulSoup
from typing import Iterator
import re

from ..base import BaseScraper
from ..models import (
    RawLandingRecord, IngestionType, Currency, Category, 
    Product, Pricing, Availability, Seller, SellerType, Ratings
)

class AmazonScraper(BaseScraper):
    """
    Pure HTML Scraper for Amazon Search Results.
    Note: Amazon employs bot-protection. This may fail periodically based on IP or headers.
    """
    
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        }
        self.base_url = "https://www.amazon.com/s"
        
    def _parse_price(self, text: str) -> float:
        cleaned = text.replace("$", "").replace(",", "").strip()
        try:
            return float(cleaned)
        except ValueError:
            return 0.0

    def scrape(self, query: str, category: Category, max_pages: int = 1) -> Iterator[RawLandingRecord]:
        for page in range(1, max_pages + 1):
            params = {
                "k": query,
                "page": page
            }
            
            try:
                response = requests.get(self.base_url, headers=self.headers, params=params, timeout=15)
                
                if response.status_code != 200:
                    print(f"Failed to fetch Amazon HTML: Status {response.status_code}")
                    if "captcha" in response.text.lower():
                        print("Amazon triggered CAPTCHA block.")
                    break
                    
                soup = BeautifulSoup(response.text, "html.parser")
                # Find all search result items
                results = soup.select('div[data-component-type="s-search-result"]')
                
                if not results:
                    break
                    
                for item in results:
                    record = self._parse_item(item, category)
                    if record:
                        yield record
                        
            except Exception as e:
                print(f"Amazon Scraper Error on page {page}: {e}")
                break

    def _parse_item(self, item, category: Category) -> RawLandingRecord:
        # Title & URL
        title_tag = item.select_one("h2 a span")
        link_tag = item.select_one("h2 a")
        if not title_tag or not link_tag:
            return None
            
        title = title_tag.text.strip()
        source_url = "https://www.amazon.com" + link_tag.get("href", "")
        
        # ASIN (Amazon Standard Identification Number)
        asin = item.get("data-asin", "Unknown")
        
        # Price
        price_whole = item.select_one("span.a-price-whole")
        price_fraction = item.select_one("span.a-price-fraction")
        raw_price = 0.0
        
        if price_whole:
            price_text = price_whole.text.strip().replace(",", "")
            if price_fraction:
                price_text += price_fraction.text.strip()
            raw_price = self._parse_price(price_text)
            
        # If no price is found, skip this record or default
        if raw_price == 0.0:
            return None
            
        # Rating
        rating_tag = item.select_one("i.a-icon-star-small span.a-icon-alt")
        rating = None
        if rating_tag:
            match = re.search(r"(\d+(\.\d+)?)", rating_tag.text)
            if match:
                rating = float(match.group(1))
                
        # Reviews Count
        review_count = 0
        review_tag = item.select_one("span.a-size-base.s-underline-text")
        if review_tag:
            try:
                review_count = int(review_tag.text.replace(",", "").strip())
            except ValueError:
                pass
                
        # Image
        img_tag = item.select_one("img.s-image")
        img_url = img_tag.get("src", "") if img_tag else ""

        return RawLandingRecord(
            ingestion_type=IngestionType.BATCH,
            source="amazon",
            source_url=source_url,
            product=Product(
                external_id=asin,
                name=title,
                brand="Unknown", # Requires deep crawl to get reliably
                category=category,
                image_url=img_url
            ),
            pricing=Pricing(
                raw_price=raw_price,
                raw_currency=Currency.USD,
                converted_price_usd=raw_price,
                conversion_rate_used=1.0
            ),
            availability=Availability(
                in_stock=True, # Search results typically imply stock unless noted
                shipping_available=True
            ),
            seller=Seller(
                seller_name="Amazon or 3rd Party",
                seller_type=SellerType.MARKETPLACE,
                seller_location="US"
            ),
            ratings=Ratings(
                avg_rating=rating,
                review_count=review_count
            )
        )
