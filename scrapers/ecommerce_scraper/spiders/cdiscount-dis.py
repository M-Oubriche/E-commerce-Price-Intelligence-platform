import requests
from bs4 import BeautifulSoup
from typing import Iterator, Optional
import re
import json

from ..base import BaseScraper
from ..models import (
    RawLandingRecord, IngestionType, Currency, Category, 
    Product, Pricing, Availability, Seller, SellerType, Ratings,
    Specs, LaptopSpecs, MonitorSpecs, KeyboardSpecs
)

class CdiscountScraper(BaseScraper):
    """
    Scraper for Cdiscount.com (France).
    """
    
    def __init__(self, conversion_rate_to_usd: float = 1.08):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "fr,fr-FR;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Referer": "https://www.cdiscount.com/",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1"
        }
        self.conversion_rate = conversion_rate_to_usd
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        
    def _parse_price(self, text: str) -> float:
        # Cdiscount prices often look like "29€99" or "29 € 99"
        cleaned = text.replace("€", ".").replace(" ", "").replace("\xa0", "").strip()
        try:
            return float(cleaned)
        except ValueError:
            # Try to catch split price parts
            match = re.search(r"(\d+)[^\d]+(\d{2})", cleaned)
            if match:
                return float(f"{match.group(1)}.{match.group(2)}")
            return 0.0

    def scrape(self, url: str, category: Category, max_pages: int = 1) -> Iterator[RawLandingRecord]:
        for page in range(1, max_pages + 1):
            page_url = f"{url}?page={page}" if "?" not in url else f"{url}&page={page}"
            try:
                response = self.session.get(page_url, timeout=15)
                if response.status_code != 200:
                    continue
                    
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Cdiscount uses 'li' with data-sku or classes like 'prdtBlock'
                items = soup.find_all("li", {"data-sku": True}) or \
                        soup.find_all("li", class_=re.compile(r"product|prdt", re.I)) or \
                        soup.select("ul#lpBloc li")
                
                if not items:
                    # Check if blocked by captcha
                    if "captcha" in response.text.lower() or "datadome" in response.text.lower():
                        print(f"Blocked by Anti-bot on {page_url}")
                    break
                    
                for item in items:
                    record = self._parse_item(item, category)
                    if record:
                        yield record
            except Exception as e:
                print(f"Error scraping {page_url}: {e}")

    def _parse_item(self, item, category: Category) -> RawLandingRecord:
        # Title and Link
        link_tag = item.find("a", class_=re.compile(r"prdtBtm|jsprdtBtm", re.I)) or \
                   item.find("a", href=re.compile(r"/f-", re.I))
        
        if not link_tag:
            return None
            
        source_url = link_tag.get("href", "")
        if source_url and not source_url.startswith("http"):
            source_url = "https://www.cdiscount.com" + source_url
            
        name = link_tag.get("title") or link_tag.get_text(strip=True) or "Unknown Product"
        
        # Price
        price_tag = item.find("span", class_=re.compile(r"price", re.I)) or \
                    item.find("div", class_=re.compile(r"price", re.I))
        raw_price = self._parse_price(price_tag.get_text(strip=True)) if price_tag else 0.0
        
        old_price_tag = item.find("div", class_="prdtPrSt") or item.find("span", class_="bc_old_price")
        original_price_eur = self._parse_price(old_price_tag.text) if old_price_tag else raw_price
        
        discount_percent = 0.0
        if original_price_eur > 0 and raw_price < original_price_eur:
            discount_percent = round((original_price_eur - raw_price) / original_price_eur * 100, 2)
            
        img_tag = item.find("img", class_=re.compile(r"BIm|prdt", re.I))
        img_url = img_tag.get("data-src") or img_tag.get("src") if img_tag else ""
        
        brand = item.get("data-brand") or "Unknown"
        product_id = item.get("data-sku") or item.get("data-id") or "Unknown"
        
        # Ratings
        rating = None
        rating_tag = item.find("div", class_=re.compile(r"rating|Note", re.I))
        if rating_tag:
            span_note = rating_tag.find("span")
            if span_note:
                match = re.search(r"(\d+)", span_note.get("style", ""))
                if match:
                    # Cdiscount uses percentage for star widths
                    rating = round(float(match.group(1)) / 100 * 5, 1)

        review_count = 0
        review_tag = item.find("span", class_="count")
        if review_tag:
            try:
                review_count = int(re.sub(r"\D", "", review_tag.text))
            except: pass

        # Specs - From Title
        specs_data = {}
        specs = None
        full_info = f"{name} {item.get_text(' ', strip=True)}"
        
        if category == Category.KEYBOARD:
            k_specs = KeyboardSpecs()
            if "mécanique" in full_info.lower(): k_specs.switch_type = "Mécanique"
            if "sans fil" in full_info.lower() or "bluetooth" in full_info.lower(): k_specs.connectivity = "Sans fil"
            if "filaire" in full_info.lower(): k_specs.connectivity = "Filaire"
            if "rgb" in full_info.lower() or "rétroéclairé" in full_info.lower(): k_specs.backlight = "RGB"
            specs = Specs(Keyboard=k_specs, Other=specs_data)
        elif category == Category.MONITOR:
            m_specs = MonitorSpecs()
            size_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:\"|pouces|'')", full_info, re.I)
            if size_match: m_specs.size_inches = float(size_match.group(1))
            res_match = re.search(r"(\d{3,4}\s*x\s*\d{3,4})", full_info, re.I)
            if res_match: m_specs.resolution = res_match.group(1).replace(" ", "")
            hz_match = re.search(r"(\d+)\s*Hz", full_info, re.I)
            if hz_match: m_specs.refresh_rate_hz = float(hz_match.group(1))
            specs = Specs(Monitor=m_specs, Other=specs_data)

        # Seller
        seller_name = "Cdiscount"
        # Check if marketplace
        seller_tag = item.find("span", class_="prdtSoldBy")
        if seller_tag:
            seller_name = seller_tag.get_text(strip=True).replace("Vendu par ", "")

        converted_price = raw_price * self.conversion_rate
        original_price_usd = original_price_eur * self.conversion_rate

        return RawLandingRecord(
            ingestion_type=IngestionType.BATCH,
            source="cdiscount",
            source_url=source_url,
            product=Product(
                external_id=product_id,
                model_number=None,
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
                seller_name=seller_name,
                seller_type=SellerType.MARKETPLACE if seller_name != "Cdiscount" else SellerType.OFFICIAL,
                seller_location="FR"
            ),
            ratings=Ratings(
                avg_rating=rating,
                review_count=review_count
            ),
            specs=specs
        )
