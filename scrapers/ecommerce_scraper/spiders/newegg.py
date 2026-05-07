import requests
from bs4 import BeautifulSoup
from typing import Iterator, Optional
import re
import json

from ..base import BaseScraper
from ..models import (
    RawLandingRecord, IngestionType, Currency, Category, 
    Product, Pricing, Availability, Seller, SellerType, Ratings,
    Specs, MonitorSpecs, LaptopSpecs, KeyboardSpecs
)

class NeweggScraper(BaseScraper):
    """
    Scraper for Newegg.com.
    """
    
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        
    def _parse_price(self, text: str) -> float:
        cleaned = text.replace("$", "").replace(",", "").strip()
        try:
            return float(cleaned)
        except ValueError:
            return 0.0

    def scrape(self, url: str, category: Category, max_pages: int = 1) -> Iterator[RawLandingRecord]:
        for page in range(1, max_pages + 1):
            page_url = f"{url}&page={page}" if "?" in url else f"{url}?page={page}"
            try:
                response = self.session.get(page_url, timeout=15)
                if response.status_code != 200:
                    print(f"Failed to fetch {page_url} (HTTP {response.status_code})")
                    continue
                    
                soup = BeautifulSoup(response.text, 'html.parser')
                items = soup.find_all("div", class_="item-cell")
                
                if not items:
                    break
                    
                for item in items:
                    record = self._parse_item(item, category)
                    if record:
                        yield record
            except Exception as e:
                print(f"Error scraping {page_url}: {e}")

    def _parse_item(self, item, category: Category) -> RawLandingRecord:
        link_tag = item.find("a", class_="item-title")
        if not link_tag:
            return None
            
        source_url = link_tag.get("href", "")
        name = link_tag.text.strip() if link_tag else "Unknown Product"
        
        # Price parsing
        price_current = item.find("li", class_="price-current")
        raw_price = 0.0
        if price_current:
            dollars = price_current.find("strong")
            cents = price_current.find("sup")
            if dollars and cents:
                raw_price = self._parse_price(f"{dollars.text}{cents.text}")
            
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
        
        # Ratings
        rating = None
        rating_tag = item.find("i", class_="rating")
        if rating_tag:
            aria_label = rating_tag.get("aria-label", "")
            match = re.search(r"(\d+(?:\.\d+)?)", aria_label)
            if match:
                rating = float(match.group(1))
            else:
                rating_classes = rating_tag.get("class", [])
                for c in rating_classes:
                    if c.startswith("rating-"):
                        rating = float(c.replace("rating-", "").replace("-", "."))
        
        review_count = 0
        review_count_tag = item.find("span", class_="item-rating-num")
        if review_count_tag:
            try:
                review_count = int(review_count_tag.text.strip("() "))
            except: pass

        # Availability & Quantity
        in_stock = True
        promo_text = item.get_text().lower()
        if "out of stock" in promo_text or "sold out" in promo_text:
            in_stock = False
            
        quantity = None
        q_match = re.search(r"limit\s+(\d+)", promo_text)
        if q_match:
            quantity = int(q_match.group(1))

        # Seller
        seller_name = "Newegg"
        seller_type = SellerType.OFFICIAL
        # Check if marketplace
        seller_tag = item.find("a", class_="item-seller-name")
        if seller_tag:
            seller_name = seller_tag.text.strip()
            seller_type = SellerType.MARKETPLACE

        # Specs - We try to extract from name first for efficiency, 
        # but could also fetch detail page if needed.
        specs_data = {}
        specs = None
        
        full_info = f"{name} {item.get_text(' ', strip=True)}"
        
        if category == Category.KEYBOARD:
            k_specs = KeyboardSpecs()
            if "mechanical" in full_info.lower(): k_specs.switch_type = "Mechanical"
            if "wireless" in full_info.lower() or "bluetooth" in full_info.lower(): k_specs.connectivity = "Wireless"
            if "wired" in full_info.lower(): k_specs.connectivity = "Wired"
            if "rgb" in full_info.lower() or "backlit" in full_info.lower(): k_specs.backlight = "RGB"
            # Form factor
            if "tkl" in full_info.lower() or "tenkeyless" in full_info.lower(): k_specs.form_factor = "TKL"
            if "60%" in full_info or "60 percent" in full_info.lower(): k_specs.form_factor = "60%"
            specs = Specs(Keyboard=k_specs, Other=specs_data)
        elif category == Category.MONITOR:
            m_specs = MonitorSpecs()
            size_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:\"|inch|IN)", full_info, re.I)
            if size_match: m_specs.size_inches = float(size_match.group(1))
            res_match = re.search(r"(\d{3,4}\s*[x*]\s*\d{3,4})", full_info, re.I)
            if res_match: m_specs.resolution = res_match.group(1).replace(" ", "")
            hz_match = re.search(r"(\d+)\s*Hz", full_info, re.I)
            if hz_match: m_specs.refresh_rate_hz = float(hz_match.group(1))
            specs = Specs(Monitor=m_specs, Other=specs_data)

        # Model Number extraction
        # Often Newegg titles have it, or it's in the full_info
        model_number = None
        # Example: "Model #: [MODEL]"
        model_match = re.search(r"Model\s*[:#]*\s*([A-Za-z0-9\-]+)", full_info, re.I)
        if model_match:
            model_number = model_match.group(1)

        # Optional: Fetch detail page for more specs if requested specifically
        # (Commented out to keep Newegg scraping fast and avoid blocks)
        # if in_stock: ... visit source_url ...

        return RawLandingRecord(
            ingestion_type=IngestionType.BATCH,
            source="newegg",
            source_url=source_url,
            product=Product(
                external_id=source_url.split("p/")[-1].split("?")[0] if "p/" in source_url else "Unknown",
                model_number=model_number,
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
                in_stock=in_stock,
                quantity=quantity,
                shipping_available=in_stock
            ),
            seller=Seller(
                seller_name=seller_name,
                seller_type=seller_type,
                seller_location="US"
            ),
            ratings=Ratings(
                avg_rating=rating,
                review_count=review_count
            ),
            specs=specs
        )
