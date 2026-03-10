import os
import json
import logging
from datetime import datetime
from pathlib import Path

from ecommerce_scraper.spiders import JumiaScraper, PC21Scraper
from ecommerce_scraper.models import Category

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

    output_dir = Path("/data/raw")
    # if we are not running in docker and /data/raw does not exist, fallback to local data/raw relative to script
    if not output_dir.exists():
         output_dir = Path(__file__).parent.parent / "data" / "raw"
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filepath = output_dir / f"{filename_prefix}_{timestamp}.jsonl"

    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            for record in records:
                f.write(record.model_dump_json() + '\n')
        logger.info(f"Successfully exported {len(records)} records to {filepath}")
    except Exception as e:
        logger.error(f"Failed to export data to {filepath}: {e}")

def run_scrapers():
    """
    Main orchestration logic to run configured scrapers.
    """
    logger.info("Initializing scrapers...")
    scrapers = [
        ("Jumia", JumiaScraper(), "https://www.jumia.ma/claviers-et-souris/", Category.KEYBOARD),
        #("PC21", PC21Scraper(), "https://pc21.ma/c/ecrans-pc", Category.MONITOR)
    ]

    all_records = []

    for name, scraper, url, category in scrapers:
        logger.info(f"Starting {name} scraper for category: {category.value}...")
        try:
            # We use max_pages=1 for now to keep the default run quick
            records = list(scraper.scrape(url, category, max_pages=1))
            logger.info(f"{name} scraper extracted {len(records)} records.")
            all_records.extend(records)
            export_to_jsonl(records, f"{name.lower()}_{category.value.lower()}")
        except Exception as e:
            logger.error(f"Error while running {name} scraper: {e}", exc_info=True)

    logger.info(f"Scraping run completed. Total records collected: {len(all_records)}")

if __name__ == "__main__":
    run_scrapers()
