import requests
from bs4 import BeautifulSoup
from typing import Iterator

from ..base import BaseScraper
from ..models import (
    RawLandingRecord, IngestionType, Currency, Category, 
    Product, Pricing, Availability, Seller, SellerType, Ratings
)

class NeweggScraper(BaseScraper):
    """
    Scraper for Newegg.com.
    Note: Newegg heavily utilizes anti-bot protection. This script provides the base mapping logic
    and HTML parsing structure, but may require proxy integration or Selenium for consistent results.
    """
    
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "max-age=0"
        }
        
    def _parse_price(self, text: str) -> float:
        cleaned = text.replace("$", "").replace(",", "").strip()
        try:
            return float(cleaned)
        except ValueError:
            return 0.0

    def scrape(self, url: str, category: Category, max_pages: int = 1) -> Iterator[RawLandingRecord]:
        for page in range(1, max_pages + 1):
            page_url = f"{url}&page={page}" if "?" in url else f"{url}?page={page}"
            response = requests.get(page_url, headers=self.headers)
            
            if response.status_code != 200:
                print(f"Failed to fetch {page_url} (HTTP {response.status_code}). Newegg may be blocking the request.")
                continue
                
            soup = BeautifulSoup(response.text, 'html.parser')
            items = soup.find_all("div", class_="item-cell")
            
            if not items:
                break
                
            for item in items:
                yield self._parse_item(item, category)

    def _parse_item(self, item, category: Category) -> RawLandingRecord:
        link_tag = item.find("a", class_="item-title")
        source_url = link_tag.get("href", "") if link_tag else ""
        name = link_tag.text.strip() if link_tag else "Unknown Product"
        
        price_tag_dollars = item.find("li", class_="price-current").find("strong") if item.find("li", class_="price-current") else None
        price_tag_cents = item.find("li", class_="price-current").find("sup") if item.find("li", class_="price-current") else None
        
        raw_price = 0.0
        if price_tag_dollars and price_tag_cents:
            raw_price = self._parse_price(f"{price_tag_dollars.text}{price_tag_cents.text}")
            
        old_price_tag = item.find("li", class_="price-was")
        original_price = raw_price
        if old_price_tag and old_price_tag.text:
            original_price = self._parse_price(old_price_tag.text)
            
        discount_percent = 0.0
        if original_price > 0 and raw_price < original_price:
            discount_percent = round((original_price - raw_price) / original_price * 100, 2)
            
        img_tag = item.find("img")
        img_url = img_tag.get("src", "") if img_tag else ""
        
        brand_tag = item.find("a", class_="item-brand")
        brand = brand_tag.find("img").get("title") if brand_tag and brand_tag.find("img") else "Unknown"
        
        rating_tag = item.find("i", class_="rating")
        rating = None
        if rating_tag:
            rating_classes = rating_tag.get("class", [])
            for c in rating_classes:
                if c.startswith("rating-"):
                    try:
                        # "rating-4" -> 4.0, "rating-4-5" -> 4.5
                        rating_str = c.replace("rating-", "").replace("-", ".")
                        rating = float(rating_str)
                    except ValueError:
                        pass
        
        review_count_tag = item.find("span", class_="item-rating-num")
        review_count = None
        if review_count_tag:
            try:
                review_count = int(review_count_tag.text.strip("() "))
            except ValueError:
                pass

        return RawLandingRecord(
            ingestion_type=IngestionType.BATCH,
            source="newegg",
            source_url=source_url,
            product=Product(
                external_id=source_url.split("p/")[-1].split("?")[0] if "p/" in source_url else "Unknown",
                name=name,
                brand=brand,
                category=category,
                image_url=img_url
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
                in_stock=True, # Listed items in grid are typically in stock unless marked out
                shipping_available=True
            ),
            seller=Seller(
                seller_name="Newegg",
                seller_type=SellerType.OFFICIAL, # Over-simplified for marketplace items
                seller_location="US"
            ),
            ratings=Ratings(
                avg_rating=rating,
                review_count=review_count
            )
        )
