# E-Commerce Scraper Engine

This directory contains the Python scraping infrastructure for the End-to-End E-commerce Price Intelligence Platform.

## Data Model Enforcement
All scripts in this directory are bound by the **Layer 1 Raw Landing Schema**. We strictly enforce this using Pydantic models in `ecommerce_scraper/models.py`. Any newly created scraper **must** inherit from `BaseScraper` and yield `RawLandingRecord` objects.

## Currently Supported Scrapers
- **BestBuy API** (`bestbuy.py`): Connects to official API (Requires `BESTBUY_API_KEY` in `.env`).
- **eBay Browse API** (`ebay.py`): Connects via OAuth token (Requires `EBAY_AUTH_TOKEN` in `.env`).
- **Jumia.ma** (`jumia.py`): Web parser using `requests` + `BeautifulSoup`.
- **PC21.ma** (`pc21.py`): Web parser using `requests` + `BeautifulSoup`.

## How to Run Scrapers (with Docker)

We have provided a Docker container with all required heavy dependencies (like Selenium/Chrome) pre-installed to avoid muddying your host PC.

To run the scrapers using Docker:

1. **Start the environment in the background:**
   From the ROOT folder of the project (`E-commerce-Price-Intelligence-platform`), run:
   ```bash
   docker compose up -d
   ```
   *This starts the `price_scraper` container. Your local `scrapers/` folder is live-synced to `/app/scrapers` inside the container.*

2. **Access the container shell:**
   Drop into the running container to execute scripts:
   ```bash
   docker exec -it price_scraper bash
   ```

3. **Run your scripts inside the container:**
   Once inside the container shell (`root@app#`), you can run your test scripts:
   ```bash
   python tests/test_scraper_models.py
   python tests/test_live_scrapers.py
   ```

*(Alternative)*: You can run a script directly without opening an interactive shell by running this from your host machine:
```bash
docker compose exec scraper python tests/test_live_scrapers.py
```

## Next Steps
- Implementing `Newegg` web scraper.
- Implementing `Cdiscount` web scraper.
- Creating the core `main.py` entrypoint that iterates over a configured list of products and outputs JSON/Parquet files to the `/data/raw` volume folder.
- Setting up the Airflow DAGs to orchestrate these scrapers daily.
