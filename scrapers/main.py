import os
import json
import logging
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from ecommerce_scraper.spiders import JumiaScraper, PC21Scraper, NeweggScraper, BestBuyScraper, UltraPCScraper, MaterielNetScraper
from ecommerce_scraper.models import Category

# Load environment variables from .env file
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def export_to_jsonl(records, filename_prefix="scraper_output"):
    """
    Export a list of RawLandingRecord objects to a JSON Lines file.
    """
    if not records:
        logger.warning(f"No records to export for {filename_prefix}.")
        return

    today_str = datetime.now().strftime("%Y-%m-%d")
    out_dir = Path(os.environ.get("SCRAPER_OUTPUT_DIR", "/data/raw")) / today_str
    out_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filepath = out_dir / f"{filename_prefix}_{timestamp}.jsonl"

    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            for record in records:
                f.write(record.model_dump_json() + '\n')
        logger.info(f"Successfully exported {len(records)} records to {filepath}")
    except Exception as e:
        logger.error(f"Failed to export data to {filepath}: {e}")

def export_to_nifi(records):
    """
    Streams records directly to Apache NiFi ListenHTTP endpoint in batches.
    """
    nifi_url = os.environ.get("NIFI_INGEST_URL", "http://price_nifi:9090/contentListener")
    success_count = 0
    import requests
    import time
    
    if not records:
        return
        
    try:
        # Convert all records to dicts and send as a single JSON array payload
        payload = [r.model_dump(mode='json') for r in records]
        
        # Retry logic for 503 (NiFi startup/throttling)
        for attempt in range(5):
            resp = requests.post(nifi_url, json=payload, timeout=10)
            if resp.status_code == 200:
                success_count = len(records)
                break
            elif resp.status_code == 503:
                logger.warning(f"NiFi returned 503 (attempt {attempt+1}/5). Waiting to retry...")
                time.sleep(3)
            else:
                logger.error(f"NiFi returned status {resp.status_code}: {resp.text}")
                break
    except Exception as e:
        logger.error(f"Failed to post to NiFi: {e}")
            
    if success_count > 0:
        logger.info(f"Successfully streamed {success_count} records to NiFi in a single batch.")

def run_scrapers():
    """
    Main orchestration logic to run configured scrapers from manual_links.json.
    """

    logger.info("Initializing scrapers from manual_links.json...")
    scrapers = []
    
    SCRAPER_MAP = {
        "jumia": JumiaScraper,
        "pc21": PC21Scraper,
        "newegg": NeweggScraper,
        "bestbuy": BestBuyScraper,
        "ultrapc": UltraPCScraper,
        "materielnet": MaterielNetScraper
    }
    
    links_file = Path(__file__).parent / "manual_links.json"
    if not links_file.exists():
        logger.error(f"Configuration file not found at {links_file}.")
        return

    try:
        with open(links_file, 'r', encoding='utf-8') as f:
            manual_links = json.load(f)
    except Exception as e:
        logger.error(f"Failed to load manual_links.json: {e}")
        return

    for entry in manual_links:
        # Ignore empty entries or entries without scraper name
        scraper_name = entry.get("scraper", "").lower()
        category_str = entry.get("category", "")
        url = entry.get("url", "")
        
        if not scraper_name or not category_str or not url:
            logger.warning(f"Invalid entry in manual_links.json, skipping: {entry}")
            continue
            
        scraper_class = SCRAPER_MAP.get(scraper_name)
        if not scraper_class:
            logger.warning(f"Unknown scraper '{scraper_name}' in manual_links.json, skipping.")
            continue
            
        # Try to match the category string to Category enum
        try:
            category_enum = Category.from_str(category_str)
        except ValueError:
            logger.warning(f"Unknown category '{category_str}', using Category.OTHER.")
            category_enum = Category.OTHER
            
        scrapers.append((scraper_name, scraper_class(), url, category_enum))

    all_records = []

    for name, scraper, url, category in scrapers:
        logger.info(f"Starting {name} scraper for category: {category.value}...")
        try:
            # We use max_pages=1 for now to keep the default run quick
            records = list(scraper.scrape(url, category, max_pages=1))
            logger.info(f"{name} scraper extracted {len(records)} records.")
            if records:
                all_records.extend(records)
                export_to_jsonl(records, f"{name.lower()}_{category.value.lower()}")
                export_to_nifi(records)
        except Exception as e:
            logger.error(f"Error while running {name} scraper: {e}", exc_info=True)

    logger.info(f"Scraping run completed. Total records collected: {len(all_records)}")

if __name__ == "__main__":
    run_scrapers()
