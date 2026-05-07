import os
import requests
from bs4 import BeautifulSoup
from typing import Iterator, Optional
from datetime import datetime, timezone
import json
import re

from ..base import BaseScraper
from ..models import (
    RawLandingRecord, IngestionType, Currency, Category, 
    Product, Pricing, Availability, Seller, SellerType, Ratings,
    Specs, LaptopSpecs, MonitorSpecs
)

class JumiaScraper(BaseScraper):
    """
    Scraper for Jumia.ma.
    Uses requests and BeautifulSoup to extract product data from a given category URL.
    """
    
    def __init__(self, conversion_rate_to_usd: float = 0.10):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
            "Referer": "https://www.jumia.ma/",
            "Connection": "keep-alive"
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
                continue
                
            soup = BeautifulSoup(response.text, 'html.parser')
            items = soup.find_all("article", class_="prd _fb col c-prd")
            
            if not items:
                break
                
            for item in items:
                record = self._parse_item(item, category)
                if record:
                    yield record

    def _parse_item(self, item, category: Category) -> RawLandingRecord:
        link_tag = item.find("a", class_="core")
        if not link_tag:
            return None
        
        source_url = "https://www.jumia.ma" + link_tag.get("href", "")
        item_id = item.get("data-id", "Unknown")
        name_tag = item.find("h3", class_="name")
        name = name_tag.text.strip() if name_tag else "Unknown Product"
        
        price_tag = item.find("div", class_="prc")
        raw_price = self._parse_price(price_tag.text) if price_tag else 0.0
        
        old_price_tag = item.find("div", class_="old")
        original_price_mad = self._parse_price(old_price_tag.text) if old_price_tag else raw_price
        
        discount_tag = item.find("div", class_="bdg _dsct _sm")
        discount_percent = float(discount_tag.text.strip("%- ")) if discount_tag else 0.0
        
        img_tag = item.find("img", class_="img")
        img_url = img_tag.get("data-src", "") or img_tag.get("src", "")
        
        # Detail Scraping
        brand = "Unknown"
        avg_rating = None
        review_count = 0
        quantity = None
        seller_name = "Jumia"
        seller_rating = None
        specs_data = {}
        
        try:
            resp = requests.get(source_url, headers=self.headers, timeout=10)
            if resp.status_code == 200:
                p_soup = BeautifulSoup(resp.text, "html.parser")
                
                # 1. JSON-LD for Metadata
                scripts = p_soup.find_all("script", type="application/ld+json")
                for script in scripts:
                    try:
                        data = json.loads(script.string)
                        graph = data.get("@graph", [data] if isinstance(data, dict) else [])
                        for obj in graph:
                            if obj.get("@type") == "Product":
                                brand = obj.get("brand", {}).get("name", brand)
                                if "aggregateRating" in obj:
                                    avg_rating = float(obj["aggregateRating"].get("ratingValue", 0))
                                    review_count = int(obj["aggregateRating"].get("reviewCount", 0))
                                break
                    except: continue

                # 2. Quantity
                stock_text_tag = p_soup.find("p", class_="-df -i-ctr -fs12 -pbs -m")
                if stock_text_tag:
                    q_match = re.search(r"(\d+)", stock_text_tag.text)
                    if q_match:
                        quantity = int(q_match.group(1))

                # 3. Seller
                seller_tag = p_soup.find("p", class_="-m -pts -pbs") or p_soup.find("a", class_="-m -pts -pbs")
                if seller_tag:
                    seller_name = seller_tag.get_text(strip=True)
                
                seller_note_tag = p_soup.find("div", string=re.compile(r"vendeur", re.I))
                if seller_note_tag and seller_note_tag.find_next("div"):
                     s_match = re.search(r"(\d+)", seller_note_tag.find_next("div").text)
                     if s_match:
                         seller_rating = float(s_match.group(1)) / 10.0 # scale as needed

                # 4. Specs
                spec_list = p_soup.find("ul", class_="-pvl -hr")
                if not spec_list:
                    h2_spec = p_soup.find("h2", string=re.compile(r"Descriptif technique", re.I))
                    if h2_spec:
                        spec_list = h2_spec.find_next("ul")
                
                if spec_list:
                    for li in spec_list.find_all("li"):
                        parts = li.get_text(strip=True).split(":", 1)
                        if len(parts) == 2:
                            specs_data[parts[0].strip()] = parts[1].strip()

        except Exception as e:
            print(f"Error scraping detail page {source_url}: {e}")

        # Map Specs to Category Model
        specs = None
        if category == Category.LAPTOP:
            l_specs = LaptopSpecs()
            l_specs.cpu_model = specs_data.get("Processeur") or specs_data.get("Modèle")
            ram_text = specs_data.get("Mémoire vive (RAM)") or specs_data.get("RAM")
            if ram_text:
                r_match = re.search(r"(\d+)", ram_text)
                if r_match: l_specs.ram_gb = float(r_match.group(1))
            specs = Specs(Laptop=l_specs, Other=specs_data)
        elif category == Category.MONITOR:
            m_specs = MonitorSpecs()
            m_specs.resolution = specs_data.get("Résolution")
            size_text = specs_data.get("Taille de l'écran")
            if size_text:
                s_match = re.search(r"(\d+(?:\.\d+)?)", size_text)
                if s_match: m_specs.size_inches = float(s_match.group(1))
            specs = Specs(Monitor=m_specs, Other=specs_data)
        else:
            specs = Specs(Other=specs_data)

        converted_price = raw_price * self.conversion_rate
        original_price_usd = original_price_mad * self.conversion_rate

        return RawLandingRecord(
            ingestion_type=IngestionType.BATCH,
            source="jumia.ma",
            source_url=source_url,
            product=Product(
                external_id=item_id,
                model_number=specs_data.get("Modèle") or specs_data.get("SKU"),
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
                in_stock=True,
                quantity=quantity,
                shipping_available=True
            ),
            seller=Seller(
                seller_name=seller_name,
                seller_type=SellerType.MARKETPLACE,
                seller_rating=seller_rating,
                seller_location="MA"
            ),
            ratings=Ratings(
                avg_rating=avg_rating,
                review_count=review_count
            ),
            specs=specs
        )
