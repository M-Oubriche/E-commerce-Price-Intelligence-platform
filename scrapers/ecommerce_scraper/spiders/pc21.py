import requests
from bs4 import BeautifulSoup
from typing import Iterator
import re

from ..base import BaseScraper
from ..models import (
    RawLandingRecord, IngestionType, Currency, Category, 
    Product, Pricing, Availability, Seller, SellerType, Ratings,
    Specs, MonitorSpecs
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
        # PC21 usually formats price like "1 500,00 MAD" or "152,79 € HT"
        cleaned = price_str.replace("MAD", "").replace("€", "").replace("HT", "").replace("TTC", "")
        cleaned = cleaned.replace(" ", "").replace("\xa0", "").strip()
        cleaned = cleaned.replace(",", ".")
        # Remove any remaining non-numeric characters except the dot
        cleaned = re.sub(r"[^\d.]", "", cleaned)
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
            sub_categories = soup.find_all("a", class_="lien_article_gamme_img")

            sub_category_urls = [a.get("href") for a in sub_categories if a.get("href")]

            # Process each sub-category page as needed
            sub_url = []
            for sub_category_items in sub_category_urls:
                response = requests.get(sub_category_items, headers=self.headers)
                if response.status_code != 200:
                    print(f"Failed to fetch {page_url}")
                    continue

                sub_soup = BeautifulSoup(response.text, 'html.parser')
                sub_url.extend(item.get("href") for item in sub_soup.find_all("a", class_="titre_univers_accueil"))

            # Process items on the sub-category page
            for item_url in sub_url:
                response = requests.get(item_url, headers=self.headers)
                if response.status_code != 200:
                    print(f"Failed to fetch {item_url}")
                    continue

                item_soup = BeautifulSoup(response.text, 'html.parser')
                # PC21 product list items are typically in table rows (tr)
                # 'lien_produit_recherche' is the class for the product title link
                product_links = item_soup.find_all("a", class_="lien_produit_recherche")
                for link in product_links:
                    # Find the parent row that contains all product info (price, reference, etc.)
                    row = link.find_parent("tr")
                    if row:
                        yield self._parse_item(row, category)

    def _parse_item(self, item, category: Category) -> RawLandingRecord:
        # item is now the product row container (tr)
        link_tag = item.find("a", class_="lien_produit_recherche")
        source_url = link_tag.get("href", "") if link_tag else ""
        # Use a space separator to ensure words aren't joined unnecessarily
        name = link_tag.get_text(" ", strip=True) if link_tag else "Unknown Product"

        # The class 'prix_produit_ht' is preferred as per user instruction
        # However, it may only appear in the dynamic version of the site
        price_tag = item.find("span", class_="prix_produit_ht")
        
        if not price_tag:
            # Fallback for promo prices
            price_tag = item.find("span", class_="prix_promo_ht")
            
        if not price_tag:
            # Fallback: In the static HTML, prices are often in a right-aligned cell with red text
            td_price = item.find("td", align="right", class_="cellule_produit_recherche")
            if td_price:
                # The first span in this cell usually contains the HT price
                price_tag = td_price.find("span", style=re.compile(r"color:#FF0000", re.I)) or td_price.find("span")
            
        raw_price = self._parse_price(price_tag.get_text(strip=True)) if price_tag else 0.0
        
        # Check for original/old price
        old_price_tag = item.find("span", class_="prix_produit_ttc")
        if old_price_tag:
            original_price_mad = self._parse_price(old_price_tag.get_text(strip=True))
        else:
            original_price_mad = raw_price
            
        discount_percent = 0.0
        if original_price_mad > 0 and raw_price < original_price_mad:
            discount_percent = round((original_price_mad - raw_price) / original_price_mad * 100, 2)
        
        td = item.find("td", class_="cellule_produit_recherche")
        img_tag = td.find("img") if td else None
        img_url = img_tag.get("src", "") if img_tag else ""
        
        # PC21 usually shows brand in the name or has a separate brand attribute
        # Naive extraction by taking first word
        brand = name.split()[0] if name else "Unknown"
        
        stock_tag = item.find("span", class_="statut_disponible")
        if not stock_tag:
            # Fallback: Look for green text indicating availability
            stock_tag = item.find("span", style=re.compile(r"color:#00CC00", re.I))

        in_stock = True
        quantity = None
        if not stock_tag:
            # If no stock info is found, we assume it's ambiguous but conservatively might be True 
            # if we expect stock info on list pages.
            in_stock = True # Defaulting to True to avoid missing data if info is just elsewhere
        else:
            stock_text = stock_tag.get_text().lower()
            if "out" in stock_text or "hors" in stock_text or "épuisé" in stock_text:
                in_stock = False
            
            # Extract quantity if available (e.g., "21 pièces")
            q_match = re.search(r"(\d+)\s*(?:pi\xe8ces?|exemplaires?|unit\xe9s?)", stock_text)
            if q_match:
                quantity = int(q_match.group(1))

        converted_price = raw_price * self.conversion_rate
        original_price_usd = original_price_mad * self.conversion_rate

        # Search for the products refrence id
        reference_id = ""

        for span in item.find_all("span"):
            # The 'references' class often contains the manufacturer part number
            if span.get("class") and "references" in span.get("class"):
                ref_text = span.get_text(strip=True)
                # Usually it's the last part of the string in the 'references' span
                reference_id = ref_text.split()[-1] if ref_text else ""
                if reference_id:
                    break
            
            text = span.get_text(strip=True)
            # Regex to match common labels for reference numbers
            match = re.search(r"(?:R\xe9f\xe9rence|Ref|P/N|ID)[\s:]*([A-Za-z0-9\-]+)", text, re.I)
            if match:
                reference_id = match.group(1)
                break

        # Quick Specs extraction from the row text
        specs = None
        if category == Category.MONITOR:
            mon_specs = MonitorSpecs()
            # Use name and the rest of the row text for parsing
            full_info = item.get_text(" ", strip=True) 
            
            # Size: matches 24", 24 IN, 24p, 24-inch, etc.
            size_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:\"|IN|pouces|'|''|p|po|-inch|visualisable)", full_info, re.I)
            if size_match: mon_specs.size_inches = float(size_match.group(1))
            
            # Resolution: 1920 x 1080 or 1920x1080
            res_match = re.search(r"(\d{3,4}\s*[x*]\s*\d{3,4})", full_info, re.I)
            if res_match: mon_specs.resolution = res_match.group(1).replace(" ", "")
            
            # Refresh Rate
            hz_match = re.search(r"(\d+)\s*Hz", full_info, re.I)
            if hz_match: mon_specs.refresh_rate_hz = float(hz_match.group(1))
            
            # Panel Type
            panel_match = re.search(r"\b(IPS|VA|TN|OLED|LED|LCD)\b", full_info, re.I)
            if panel_match: mon_specs.panel_type = panel_match.group(1).upper()
            
            # Response Time
            ms_match = re.search(r"(\d+(?:\.\d+)?)\s*ms", full_info, re.I)
            if ms_match: mon_specs.response_time_ms = float(ms_match.group(1))
            
            specs = Specs(Monitor=mon_specs)

        return RawLandingRecord(
            ingestion_type=IngestionType.BATCH,
            source="pc21.fr",
            source_url=source_url,
            product=Product(
                external_id=reference_id,
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
                in_stock=in_stock,
                quantity=quantity,
                shipping_available=in_stock
            ),
            seller=Seller(
                seller_name="PC21.fr",
                seller_type=SellerType.OFFICIAL,
                seller_rating=4.8, # Based on site reputation
                seller_location="FR"
            ),
            ratings=Ratings(avg_rating=0.0, review_count=0), # Default for PC21
            specs=specs
        )
