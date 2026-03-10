import requests
from bs4 import BeautifulSoup
from typing import Iterator

from ..base import BaseScraper
from ..models import (
    RawLandingRecord, IngestionType, Currency, Category, 
    Product, Pricing, Availability, Seller, SellerType, Ratings
)

class PC21Scraper(BaseScraper):
    """
    Scraper for PC21.ma holding hardware and peripherals.
    """
    
    def __init__(self, conversion_rate_to_usd: float = 0.10):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Safari/537.36"
        }
        self.conversion_rate = conversion_rate_to_usd
        
    def _parse_price(self, price_str: str) -> float:
        # PC21 usually formats price like "1 500,00 MAD"
        cleaned = price_str.replace("MAD", "").replace(" ", "").replace("\xa0", "").strip()
        cleaned = cleaned.replace(",", ".")
        try:
            return float(cleaned)
        except ValueError:
            return 0.0

    def scrape(self, url: str, category: Category, max_pages: int = 1) -> Iterator[RawLandingRecord]:
        for page in range(1, max_pages + 1):
            page_url = f"{url}?p={page}"
            response = requests.get(page_url, headers=self.headers)
            if response.status_code != 200:
                print(f"Failed to fetch {page_url}")
                continue
                
            soup = BeautifulSoup(response.text, 'html.parser')
            # PC21 product grid uses product-item
            items = soup.find_all("li", class_="item product product-item")
            
            if not items:
                break
                
            for item in items:
                yield self._parse_item(item, category)

    def _parse_item(self, item, category: Category) -> RawLandingRecord:
        link_tag = item.find("a", class_="product-item-link")
        source_url = link_tag.get("href", "") if link_tag else ""
        name = link_tag.text.strip() if link_tag else "Unknown Product"
        
        price_tag = item.find("span", class_="price")
        raw_price = self._parse_price(price_tag.text) if price_tag else 0.0
        
        # Typically old price is in old-price
        old_price_tag = item.find("span", class_="old-price")
        if old_price_tag:
            inner_price = old_price_tag.find("span", class_="price")
            original_price_mad = self._parse_price(inner_price.text) if inner_price else raw_price
        else:
            original_price_mad = raw_price
            
        discount_percent = 0.0
        if original_price_mad > 0 and raw_price < original_price_mad:
            discount_percent = round((original_price_mad - raw_price) / original_price_mad * 100, 2)
        
        img_tag = item.find("img", class_="product-image-photo")
        img_url = img_tag.get("src", "") if img_tag else ""
        
        # PC21 usually shows brand in the name or has a separate brand attribute
        # Naive extraction by taking first word
        brand = name.split()[0] if name else "Unknown"
        
        stock_tag = item.find("div", class_="stock")
        in_stock = True
        if stock_tag and "out" in stock_tag.text.lower():
            in_stock = False

        converted_price = raw_price * self.conversion_rate
        original_price_usd = original_price_mad * self.conversion_rate

        return RawLandingRecord(
            ingestion_type=IngestionType.BATCH,
            source="pc21.ma",
            source_url=source_url,
            product=Product(
                external_id=source_url.split("/")[-1] if source_url else "Unknown",
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
                in_stock=in_stock,
                shipping_available=in_stock
            ),
            seller=Seller(
                seller_name="PC21.ma",
                seller_type=SellerType.OFFICIAL,
                seller_location="MA"
            )
        )
