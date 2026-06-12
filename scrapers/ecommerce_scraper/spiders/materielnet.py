import re
import requests
from bs4 import BeautifulSoup
from typing import Iterator, Optional

from ..base import BaseScraper
from ..models import (
    RawLandingRecord, IngestionType, Currency, Category,
    Product, Pricing, Availability, Seller, SellerType, Ratings,
    Specs, LaptopSpecs, MonitorSpecs, KeyboardSpecs, MouseSpecs,
    GPUSpecs, CPUSpecs, RAMSpecs
)


class MaterielNetScraper(BaseScraper):
    """
    Scraper for materiel.net — a major French IT hardware retailer.
    Completely open to scraping, no bot protection, EUR pricing.
    Supports any category URL from their catalogue.
    """

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        })
        # Fetch dynamic conversion rate via API
        self.eur_to_usd = self.get_conversion_rate("EUR", "USD")

    def _parse_price(self, text: str) -> float:
        # e.g. "3 299,00 €" → 3299.0 or "4 999€95" -> 4999.95
        cleaned = text.replace("\xa0", "").replace(" ", "")
        # Replace euro sign with dot if it acts as a separator
        cleaned = cleaned.replace("€", ".")
        # Replace comma with dot
        cleaned = cleaned.replace(",", ".")
        # Clean anything that is not a digit or dot
        cleaned = "".join(c for c in cleaned if c.isdigit() or c == ".")
        # Find the first valid float pattern
        match = re.search(r"(\d+(?:\.\d+)?)", cleaned)
        if match:
            return float(match.group(1))
        return 0.0

    def scrape(self, url: str, category: Category, max_pages: int = 1) -> Iterator[RawLandingRecord]:
        for page in range(1, max_pages + 1):
            page_url = f"{url}?page={page}" if page > 1 else url
            try:
                response = self.session.get(page_url, timeout=30)
                if response.status_code != 200:
                    print(f"Failed to fetch materiel.net ({response.status_code}): {page_url}")
                    break

                # Extract price and availability mappings from script injections
                # Pattern: getItem('ID', '.o-product__prices').outerHTML = 'HTML'
                price_mappings = {}
                price_pattern = r"getItem\('([^']+)',\s*'.o-product__prices'\)\.outerHTML\s*=\s*'([^']+)'"
                for mid, mhtml in re.findall(price_pattern, response.text):
                    # Clean up the HTML from the JS string (unescape)
                    mhtml = mhtml.replace("\\'", "'").replace('\\"', '"').replace("&nbsp;", " ")
                    # Extract price text from HTML snippet
                    soup_snippet = BeautifulSoup(mhtml, "html.parser")
                    price_text = soup_snippet.get_text(" ").strip()
                    
                    price_matches = re.findall(r"[\d\s\xa0]+[,\.€]\s*\d{2}(?:\s*€)?", price_text)
                    if not price_matches:
                        price_matches = re.findall(r"[\d\s\xa0]+€", price_text)

                    prices = [self._parse_price(p) for p in price_matches if self._parse_price(p) > 0]
                    
                    if prices:
                        price_mappings[mid] = {
                            "raw_price": min(prices),
                            "original_price": max(prices)
                        }

                soup = BeautifulSoup(response.text, "html.parser")
                items = soup.select(".c-products-list__item")
                if not items:
                    items = soup.select(".c-product-block")
                if not items:
                    # Alternative selector if class changes
                    items = soup.select("li[data-offer-id]")

                if not items:
                    break
                
                for item in items:
                    record = self._parse_item(item, category, price_mappings)
                    if record:
                        yield record

            except Exception as e:
                print(f"MaterielNet Scraper Error on page {page}: {e}")
                break

    def _parse_item(self, item, category: Category, price_mappings: dict = None) -> Optional[RawLandingRecord]:
        # --- ID & URL ---
        external_id = item.get("data-id") or item.get("data-offer-id") or item.get("data-product-id")
        
        # If ID not in LI, check button
        if not external_id:
            btn = item.select_one("button[data-offer-id]")
            if btn:
                external_id = btn.get("data-offer-id")

        link_tag = item.select_one("a.c-product__link")
        if not link_tag:
            return None
        source_url = link_tag.get("href", "")
        if source_url and not source_url.startswith("http"):
            source_url = "https://www.materiel.net" + source_url

        # --- Title ---
        title_tag = item.select_one("h2.c-product__title, h3.c-product__title, .c-product__title")
        if not title_tag:
            # Fallback to link title
            title = link_tag.get("title") or link_tag.text.strip()
        else:
            title = title_tag.text.strip()

        if not title:
            return None

        # Try to extract brand from the beginning of the title (usually first word)
        brand = title.split()[0] if title else "Unknown"

        # --- Description ---
        desc_tag = item.select_one("p.c-product__description")
        description = desc_tag.text.strip() if desc_tag else None

        # --- Image ---
        img_tag = item.select_one("img")
        img_url = ""
        if img_tag:
            img_url = img_tag.get("src") or img_tag.get("data-src") or img_tag.get("data-full-size-image-url", "")
            if img_url and not img_url.startswith("http"):
                img_url = "https:" + img_url if img_url.startswith("//") else "https://www.materiel.net" + img_url

        # --- Price ---
        raw_price = 0.0
        original_price = 0.0

        # 1. Try memory mappings from scripts first (since raw HTML is often empty)
        if price_mappings and external_id in price_mappings:
            mapping = price_mappings[external_id]
            raw_price = mapping["raw_price"]
            original_price = mapping["original_price"]

        # 2. Try raw HTML parsing if mapping failed
        if raw_price == 0.0:
            all_text = item.get_text(" ", strip=True)
            # Find all patterns like "1 234,56 €" or "123€45" or "1 234€ 95"
            price_matches = re.findall(r"[\d\s\xa0]+[,\.€]\s*\d{2}(?:\s*€)?", all_text)
            if price_matches:
                prices = [self._parse_price(p) for p in price_matches if self._parse_price(p) > 0]
                if prices:
                    raw_price = min(prices)
                    original_price = max(prices)

        if raw_price == 0.0:
            return None

        discount_percent = 0.0
        if original_price > raw_price:
            discount_percent = round((original_price - raw_price) / original_price * 100, 2)

        # --- Availability ---
        in_stock = True
        stock_tag = item.select_one("[class*='stock'], [class*='dispo'], [class*='availability']")
        if stock_tag:
            text = stock_tag.text.lower()
            if "rupture" in text or "indisponible" in text or "épuisé" in text:
                in_stock = False
        
        # Check if there is an availability injection in the HTML snippet if we had it
        # (Though usually 'En stock' is the default if not found)

        # --- Model Number & Deep Specs ---
        model_number = None
        detail_specs = {}

        if source_url:
            try:
                # Visit detail page for model number and better specs
                detail_resp = self.session.get(source_url, timeout=15)
                if detail_resp.status_code == 200:
                    detail_soup = BeautifulSoup(detail_resp.text, "html.parser")
                    
                    # 1. Extract model number from specs tables
                    # We look for a table cell with "Modèle" label
                    for tr in detail_soup.select("tr"):
                        tds = tr.select("td")
                        if len(tds) >= 2:
                            label = tds[0].get_text(strip=True)
                            value = tds[1].get_text(strip=True)
                            detail_specs[label.lower()] = value
                            if "modèle" in label.lower():
                                model_number = value
                    
                    # 2. Also try the specific selector provided by user if model_number still None
                    if not model_number:
                        # table.table:nth-child(1) > tbody:nth-child(2) > tr:nth-child(3) > td:nth-child(2)
                        # We use a slightly more flexible version of the CSS selector
                        alt_ref = detail_soup.select_one("table.c-specs__table tr:nth-child(3) td.value")
                        if alt_ref:
                            model_number = alt_ref.get_text(strip=True)

            except Exception as e:
                print(f"Error fetching detail page {source_url}: {e}")

        # Fallback to description regex if still None
        if not model_number and description:
            # Often Materiel.net has "Ref : [REF]" or similar in description
            ref_match = re.search(r"(?:Ref\s*:|R\xe9f\xe9rence\s*:)\s*([A-Za-z0-9\-]+)", description, re.I)
            if ref_match:
                model_number = ref_match.group(1)
        
        if not model_number:
            # Check for specific span if available in the snippet
            ref_tag = item.select_one("span.reference")
            if ref_tag:
                model_number = ref_tag.get_text(strip=True).replace("Ref :", "").strip()

        # --- Specs (extracted from detail page or description) ---
        specs = self._parse_specs_from_description(description, category)
        # If we have detail_specs, we could potentially override/enhance specs here
        # For now, let's keep the regex logic but the model_number is now much better.

        return RawLandingRecord(
            ingestion_type=IngestionType.BATCH,
            source="materielnet",
            source_url=source_url,
            product=Product(
                external_id=external_id or source_url.split("/")[-1].replace(".html", ""),
                model_number=model_number,
                name=title,
                brand=brand,
                category=category,
                description=description,
                image_url=img_url,
            ),
            pricing=Pricing(
                raw_price=raw_price,
                raw_currency=Currency.EUR,
                converted_price_usd=round(raw_price * self.eur_to_usd, 2),
                original_price_usd=round(original_price * self.eur_to_usd, 2) if original_price else None,
                discount_percent=discount_percent if discount_percent else None,
                conversion_rate_used=self.eur_to_usd,
            ),
            availability=Availability(
                in_stock=in_stock,
                shipping_available=in_stock,
            ),
            seller=Seller(
                seller_name="Materiel.net",
                seller_type=SellerType.OFFICIAL,
                seller_location="FR",
            ),
            specs=specs,
        )


    def _parse_specs_from_description(self, desc: Optional[str], category: Category) -> Optional[Specs]:
        """
        Materiel.net puts a short spec line in the description, e.g.:
        'PC portable 16", AMD Ryzen AI 9 HX 370, RTX 5080, RAM 64 Go, SSD 2 To, ...'
        We parse these inline specs rather than fetching detail pages.
        """
        if not desc:
            return None

        d = desc.lower()

        try:
            if category == Category.LAPTOP:
                cpu = None
                cpu_m = re.search(r"(intel core [^\,]+|amd ryzen [^\,]+|apple m\d[^\,]*)", desc, re.I)
                if cpu_m:
                    cpu = cpu_m.group(1).strip()

                gpu = None
                gpu_m = re.search(r"(rtx\s*\d{4}[^\,]*|rx\s*\d{4}[^\,]*|arc [^\,]+|iris xe|uhd graphics[^\,]*)", desc, re.I)
                if gpu_m:
                    gpu = gpu_m.group(1).strip()

                ram_gb = None
                ram_m = re.search(r"ram\s*([\d]+)\s*go", d)
                if ram_m:
                    ram_gb = float(ram_m.group(1))

                storage_gb = None
                ssd_m = re.search(r"ssd\s*([\d]+)\s*(to|go)", d)
                if ssd_m:
                    val = float(ssd_m.group(1))
                    storage_gb = val * 1024 if "to" in ssd_m.group(2) else val

                screen_m = re.search(r'([\d]+(?:[\.,]\d+)?)\s*"', desc)
                screen_size = float(screen_m.group(1).replace(",", ".")) if screen_m else None

                return Specs(Laptop=LaptopSpecs(
                    cpu_model=cpu,
                    gpu_model=gpu,
                    ram_gb=ram_gb,
                    storage_gb=storage_gb,
                    screen_size_inches=screen_size,
                ))

            elif category == Category.MONITOR:
                screen_m = re.search(r'([\d]+(?:[\.,]\d+)?)\s*"', desc)
                size = float(screen_m.group(1).replace(",", ".")) if screen_m else None
                hz_m = re.search(r"([\d]+)\s*hz", d)
                hz = float(hz_m.group(1)) if hz_m else None
                res_m = re.search(r"(\d{3,4}\s*[x×]\s*\d{3,4})", desc, re.I)
                res = res_m.group(1).replace(" ", "") if res_m else None
                panel_m = re.search(r"\b(ips|va|tn|oled|qled|nano ips)\b", d)
                panel = panel_m.group(1).upper() if panel_m else None
                return Specs(Monitor=MonitorSpecs(
                    size_inches=size,
                    refresh_rate_hz=hz,
                    resolution=res,
                    panel_type=panel,
                ))

            elif category == Category.KEYBOARD:
                connectivity = "Wireless" if ("sans fil" in d or "bluetooth" in d or "wireless" in d) else "Wired"
                switch_m = re.search(r"(cherry mx [^\,]+|red|blue|brown|linear|tactile)", d)
                switch = switch_m.group(1).strip().title() if switch_m else None
                return Specs(Keyboard=KeyboardSpecs(
                    connectivity=connectivity,
                    switch_type=switch,
                    backlight="RGB" if "rgb" in d else None,
                ))

            elif category == Category.MOUSE:
                dpi_m = re.search(r"([\d]+)\s*dpi", d)
                dpi = int(dpi_m.group(1)) if dpi_m else None
                connectivity = "Wireless" if ("sans fil" in d or "bluetooth" in d) else "Wired"
                return Specs(Mouse=MouseSpecs(dpi_max=dpi, connectivity=connectivity))

            elif category == Category.GPU:
                vram_m = re.search(r"([\d]+)\s*go\s*(gddr\d*|hbm[^\s]*)?", d)
                vram = float(vram_m.group(1)) if vram_m else None
                mem_type_m = re.search(r"(gddr\d+|hbm\d*)", d)
                mem_type = mem_type_m.group(1).upper() if mem_type_m else None
                return Specs(GPU=GPUSpecs(vram_gb=vram, memory_type=mem_type))

            elif category == Category.RAM:
                cap_m = re.search(r"([\d]+)\s*go", d)
                cap = float(cap_m.group(1)) if cap_m else None
                speed_m = re.search(r"([\d]{4,5})\s*mhz", d)
                speed = float(speed_m.group(1)) if speed_m else None
                type_m = re.search(r"(ddr\d+)", d)
                mem_type = type_m.group(1).upper() if type_m else None
                return Specs(RAM=RAMSpecs(capacity_gb=cap, speed_mhz=speed, type=mem_type))

        except Exception as e:
            print(f"Error parsing specs: {e}")

        return None
