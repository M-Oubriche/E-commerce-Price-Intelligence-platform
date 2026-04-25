import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from scrapers.ecommerce_scraper.models import RawLandingRecord

def test_raw_landing_record():
    data = {
        "ingestion_type": "batch",
        "source": "bestbuy",
        "source_url": "https://example.com/product/123",
        "scraped_at": "2026-03-01T10:00:00Z",
        "product": {
            "external_id": "SKU-88291",
            "name": "ASUS ROG Strix RTX 4090",
            "brand": "ASUS",
            "category": "GPU",
            "image_url": "https://img..."
        },
        "pricing": {
            "raw_price": 1599.99,
            "raw_currency": "USD",
            "converted_price_usd": 1599.99,
            "original_price_usd": 1799.99,
            "discount_percent": 11.1,
            "conversion_rate_used": 1.0
        },
        "availability": {
            "in_stock": True,
            "quantity": 14,
            "shipping_available": True
        },
        "seller": {
            "seller_name": "BestBuy Official",
            "seller_type": "official",
            "seller_rating": 4.8,
            "seller_location": "US"
        },
        "ratings": {
            "avg_rating": 4.7,
            "review_count": 2341
        },
        "specs": {
            "GPU": {
                "vram_gb": 24,
                "tdp_watts": 450,
                "base_clock_mhz": 2235,
                "boost_clock_mhz": 2520,
                "memory_type": "GDDR6X",
                "interface": "PCIe 4.0"
            }
        }
    }
    
    record = RawLandingRecord(**data)
    print("Successfully validated!")
    print(record.model_dump_json(indent=2))

if __name__ == "__main__":
    test_raw_landing_record()
