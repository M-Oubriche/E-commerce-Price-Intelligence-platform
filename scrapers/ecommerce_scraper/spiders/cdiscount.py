import requests
from bs4 import BeautifulSoup
from typing import Iterator

from ..base import BaseScraper
from ..models import (
    RawLandingRecord, IngestionType, Currency, Category, 
    Product, Pricing, Availability, Seller, SellerType, Ratings
)

class CdiscountScraper(BaseScraper):
    """
    Scraper for Cdiscount.com (France).
    Converts prices from EUR to USD based on the configured rate.
    Uses generic structural fetching, adapting to Cdiscount's anti-bot might require JS rendering.
    """
    
    def __init__(self, conversion_rate_to_usd: float = 1.08):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3"
        }
        self.conversion_rate = conversion_rate_to_usd
        
    def _parse_price(self, text: str) -> float:
        cleaned = text.replace("€", ".").replace(" ", "").strip()
        try:
            return float(cleaned)
        except ValueError:
            return 0.0

    def scrape(self, url: str, category: Category, max_pages: int = 1) -> Iterator[RawLandingRecord]:
        for page in range(1, max_pages + 1):
            page_url = f"{url}?page={page}" if "?" not in url else f"{url}&page={page}"
            response = requests.get(page_url, headers=self.headers)
            
            if response.status_code != 200:
                print(f"Failed to fetch {page_url} (HTTP {response.status_code}). Setup proxy if blocked.")
                continue
                
            soup = BeautifulSoup(response.text, 'html.parser')
            items = soup.find_all("li", class_="product")
            
            if not items:
                break
                
            for item in items:
                yield self._parse_item(item, category)

    def _parse_item(self, item, category: Category) -> RawLandingRecord:
        link_tag = item.find("a", class_="prdtBtm")
        source_url = link_tag.get("href", "") if link_tag else ""
        name = link_tag.get("title", "Unknown") if link_tag else "Unknown Product"
        
        price_tag = item.find("span", class_="price")
        raw_price = self._parse_price(price_tag.text) if price_tag else 0.0
        
        old_price_tag = item.find("div", class_="prdtPrSt")
        original_price_eur = self._parse_price(old_price_tag.text) if old_price_tag else raw_price
        
        discount_percent = 0.0
        if original_price_eur > 0 and raw_price < original_price_eur:
            discount_percent = round((original_price_eur - raw_price) / original_price_eur * 100, 2)
            
        img_tag = item.find("img", class_="prdtBIm")
        img_url = img_tag.get("src", "") if img_tag else ""
        
        brand = item.get("data-brand", "Unknown")
        product_id = item.get("data-sku", "Unknown")
        
        converted_price = raw_price * self.conversion_rate
        original_price_usd = original_price_eur * self.conversion_rate

        return RawLandingRecord(
            ingestion_type=IngestionType.BATCH,
            source="cdiscount",
            source_url=source_url,
            product=Product(
                external_id=product_id,
                name=name,
                brand=brand,
                category=category,
                image_url=img_url
            ),
            pricing=Pricing(
                raw_price=raw_price,
                raw_currency=Currency.EUR,
                converted_price_usd=converted_price,
                original_price_usd=original_price_usd,
                discount_percent=discount_percent,
                conversion_rate_used=self.conversion_rate
            ),
            availability=Availability(
                in_stock=True,
                shipping_available=True
            ),
            seller=Seller(
                seller_name="Cdiscount",
                seller_type=SellerType.MARKETPLACE,
                seller_location="FR"
            )
        )
