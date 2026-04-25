import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from scrapers.ecommerce_scraper.spiders import JumiaScraper, PC21Scraper, BestBuyScraper, EbayScraper
from scrapers.ecommerce_scraper.models import Category

def test_jumia():
    print("Testing Jumia...")
    scraper = JumiaScraper()
    # Jumia search for keyboards
    url = "https://www.jumia.ma/claviers-souris-accessoires/"
    results = list(scraper.scrape(url, Category.KEYBOARD, max_pages=1))
    print(f"Jumia extracted {len(results)} records")
    if results:
        print(results[0].model_dump_json(indent=2))

def test_pc21():
    print("Testing PC21...")
    scraper = PC21Scraper()
    # PC21 monitors
    url = "https://pc21.ma/c/ecrans-pc"
    results = list(scraper.scrape(url, Category.MONITOR, max_pages=1))
    print(f"PC21 extracted {len(results)} records")
    if results:
         print(results[0].model_dump_json(indent=2))

if __name__ == "__main__":
    test_jumia()
    print("-" * 50)
    test_pc21()
