**Real-Time E-commerce Price Intelligence Platform**  
Computer Hardware & Accessories 
Version 3.0 | Mohamed Soulaimane Nadi Lahjouji | March 2026

---

## 1. Scope & Rationale

This document defines the full data model for the End-to-End Hybrid Data Engineering & Analytics project. It covers all four layers of the pipeline: Raw Landing Schema, Google Cloud Bigtable Storage, dbt Transformations, and the Python Analytics target fields.

The platform collects computer hardware pricing data from multiple international and Moroccan sources, ingests it in real-time (Apache NiFi) and batch (Apache Airflow), stores it in Google Cloud Bigtable, transforms it with dbt, and delivers statistical insights via Python.

### 1.1 Pipeline Architecture

![[architecture diagram.jpg]]

---

## 2. Data Sources

Data is collected from a combination of free APIs (primary) and web scraping (secondary). All prices are stored in raw currency and converted to USD as the universal base for cross-platform comparison.

| Source          | Type               | Data Available                       | Notes                                    |
| --------------- | ------------------ | ------------------------------------ | ---------------------------------------- |
| BestBuy API     | Free API           | Prices, ratings, specs, availability | Best starting point — no approval needed |
| eBay Browse API | Free API           | Listings, prices, sellers            | Good for price comparison                |
| Newegg.com      | Scraping           | Peripherals, prices, reviews         | Medium difficulty                        |
| Cdiscount.com   | Scraping           | French market prices                 | Morocco / France context                 |
| Jumia.ma        | Scraping           | Local MA prices, categories          | Minimal bot protection                   |
| PC21.ma         | Scraping           | Local MA hardware prices             | Small site, easy to scrape               |
| Amazon PA API   | Free with approval | Prices, ratings, reviews, categories | Requires Associates account              |
| PriceAPI.com    | Freemium           | Price history across sites           | Aggregator, saves scraping effort        |
| WALMART         |                    |                                      |                                          |
| Shopify         |                    |                                      |                                          |
| ELECTROPLANET   |                    |                                      |                                          |
| ULTRA PC        |                    |                                      |                                          |
| SETUP GAME      |                    |                                      |                                          |

### 2.1 Currency Handling

- **USD** — BestBuy, eBay, Newegg (conversion rate = 1.0)
- **MAD** — Jumia.ma, PC21.ma (converted using live exchange rate at scrape time)
- **EUR** — Cdiscount.com (converted using live exchange rate at scrape time)
- Exchange rates fetched from a free API (e.g. exchangerate-api.com) at the start of each Airflow DAG run

---

## 3. Layer 1 — Raw Landing Schema

This is the unified output structure that every scraper and API client must produce. It is what NiFi ingests in real-time and what Airflow batch jobs write. The schema is source-agnostic — every source maps its fields to this structure before anything is stored.

### 3.1 Field Definitions

| Field                         | Type        | Example                                  | Description                                    |
| ----------------------------- | ----------- | ---------------------------------------- | ---------------------------------------------- |
| `raw_id`                      | UUID        | uuid-v4                                  | Unique ID per ingestion event                  |
| `ingestion_type`              | String      | `streaming \| batch`                     | NiFi = streaming, Airflow = batch              |
| `source`                      | String      | `bestbuy \| jumia`                       | Origin platform of the data                    |
| `source_url`                  | String      | `https://...`                            | Direct product page URL                        |
| `scraped_at`                  | Timestamp   | `2026-03-01T10:00Z`                      | ISO 8601 UTC collection time                   |
| `product.external_id`         | String      | `SKU-88291`                              | Source-specific product identifier             |
| `product.model_number`        | String      | `MDR7506 \| GA402RJ`                     | Manufacturer model number                      |
| `product.name`                | String      | `Logitech G Pro X`                       | Full product name as listed                    |
| `product.brand`               | String      | `Logitech`                               | Manufacturer / brand name                      |
| `product.category`            | Enum        | `Keyboard \| Mouse \| Headset \| Webcam` | One of the 4 product categories                |
| `product.image_url`           | String      | `https://img...`                         | Main product image URL                         |
| `pricing.raw_price`           | Float       | `1299.00`                                | Price in original currency                     |
| `pricing.raw_currency`        | Enum        | `USD \| MAD \| EUR`                      | Original currency code                         |
| `pricing.converted_price_usd` | Float       | `129.00`                                 | Price normalized to USD                        |
| `pricing.original_price_usd`  | Float       | `159.99`                                 | Pre-discount USD price                         |
| `pricing.discount_percent`    | Float       | `19.4`                                   | Percentage discount applied                    |
| `pricing.conversion_rate`     | Float       | `10.5`                                   | Exchange rate used at collection time          |
| `availability.in_stock`       | Boolean     | `true`                                   | Is the product available to buy?               |
| `availability.quantity`       | Integer     | `34`                                     | Units available (if exposed by source)         |
| `availability.shipping`       | Boolean     | `true`                                   | Shipping available for this product?           |
| `seller.seller_name`          | String      | `BestBuy Official`                       | Vendor or seller name                          |
| `seller.seller_type`          | Enum        | `official \| marketplace`                | Direct retailer vs 3rd party                   |
| `seller.seller_rating`        | Float       | `4.8`                                    | Seller reputation score (0-5)                  |
| `seller.seller_location`      | String      | `US \| MA \| FR`                         | Country code of the seller                     |
| `ratings.avg_rating`          | Float       | `4.6`                                    | Average product rating (0-5)                   |
| `ratings.review_count`        | Integer     | `1842`                                   | Total number of reviews                        |
| `specs`                       | JSON Object | `{switch_type: ...}`                     | Category-specific specs blob — see Section 3.2 |

### 3.2 Specs JSON Blob — Per Category

All 4 categories have exactly 6 spec fields each, keeping the schema consistent and predictable.

| **Category**     | **Spec Fields (in JSON blob)**                                              |
| ---------------- | --------------------------------------------------------------------------- |
| GPU              | vram_gb, tdp_watts, base_clock_mhz, boost_clock_mhz, memory_type, interface |
| CPU              | cores, threads, base_clock_ghz, boost_clock_ghz, socket, tdp_watts          |
| RAM              | capacity_gb, speed_mhz, type, latency, kit                                  |
| SSD              | capacity_gb, interface, read_speed_mbps, write_speed_mbps, form_factor      |
| Monitor          | resolution, refresh_rate_hz, panel_type, size_inches, response_time_ms      |
| Keyboard         | switch_type, layout, connectivity, backlight, form_factor                   |
| Mouse            | dpi_max, buttons, connectivity, sensor_type, weight_g                       |
| PSU              | wattage, efficiency_rating, modular, form_factor                            |
| Motherboard      | socket, chipset, form_factor, ram_slots, max_ram_gb                         |
| Cooling          | type (air\|liquid), tdp_support_watts, fan_size_mm, socket_support          |
| HDD              | capacity_gb, rpm, interface, cache_mb, form_factor                          |
| Laptop           | cpu_model, ram_gb, storage_gb, screen_size_inches, gpu_model, battery_wh    |
| Desktop          | cpu_model, ram_gb, storage_gb, gpu_model, form_factor, os                   |
| Mobile           | soc_model, ram_gb, storage_gb, screen_size_inches, battery_mah, camera_mp   |
| Other/Peripheral | flexible key-value pairs, no fixed schema                                   |


### 3.3 Example Raw Record

```json
{
  "raw_id": "uuid-v4",
  "ingestion_type": "streaming | batch",
  "source": "bestbuy | newegg | ebay | jumia.ma | pc21.ma | cdiscount",
  "source_url": "https://...",
  "scraped_at": "2026-03-01T10:00:00Z",

  "product": {
    "external_id": "source-specific-product-id",
    "name": "ASUS ROG Strix RTX 4090",
    "brand": "ASUS",
    "category": "GPU | CPU | RAM | SSD | HDD | Monitor | Keyboard | Mouse | PSU | Case | Cooling | Motherboard | Peripheral | Other",
    "description": "...",
    "image_url": "https://..."
  },

  "pricing": {
    "raw_price": 1599.99,
    "raw_currency": "USD | MAD | EUR",
    "converted_price_usd": 1599.99,
    "original_price_usd": 1799.99,
    "discount_percent": 11.1,
    "conversion_rate_used": 1.0
  },

  "availability": {
    "in_stock": true,
    "quantity": 14,
    "shipping_available": true
  },

  "seller": {
    "seller_name": "BestBuy Official | Third Party Seller",
    "seller_type": "official | marketplace",
    "seller_rating": 4.8,
    "seller_location": "US | MA | FR"
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
    },
    "CPU": {
      "cores": 16,
      "threads": 32,
      "base_clock_ghz": 3.2,
      "boost_clock_ghz": 5.4,
      "socket": "LGA1700",
      "tdp_watts": 125
    },
    "RAM": {
      "capacity_gb": 32,
      "speed_mhz": 6000,
      "type": "DDR5",
      "latency": "CL30",
      "kit": "2x16GB"
    },
    "SSD": {
      "capacity_gb": 2000,
      "interface": "NVMe PCIe 4.0",
      "read_speed_mbps": 7300,
      "write_speed_mbps": 6900,
      "form_factor": "M.2 2280"
    }
  }
}
```

---

## 4. Layer 2 — Google Cloud Bigtable Schema

Bigtable is a NoSQL wide-column store optimized for high-throughput time-series writes and reads. Row key design is the most critical architectural decision — it determines physical sort order and query performance and must be finalized before any data is stored.

### 4.1 Row Key Design

```
Row Key Format:

{category}#{brand}#{product_id}#{source}#{timestamp}

Example:

GPU#ASUS#RTX4090-STRIX#newegg#20260301120000
RAM#Corsair#CMK32GX5#bestbuy#20260301130000
SSD#Samsung#970EVO-2TB#jumia#20260301140000
```

### 4.2 Row Key Rationale

- **Category first** —  enables efficient scan of all GPUs, all CPUs, etc.
- **Brand second** — filter by manufacturer within a category
- **Product + source** — uniquely identify a listing on a specific platform
- **Timestamp last** — chronological order within a product for time-series queries

### 4.3 Column Families

| Column Family     | Columns                                                                                     | Purpose                                                           |
| ----------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `price_cf`        | `raw_price`, `converted_usd`, `original_usd`, `discount_pct`, `currency`, `conversion_rate` | All pricing data — primary target for time-series price analytics |
| `metadata_cf`     | `name`, `brand`, `category`, `description`, `source`, `source_url`, `image_url`             | Product identity and descriptive info                             |
| `availability_cf` | `in_stock`, `quantity`, `shipping_available`                                                | Stock status tracked over time per product                        |
| `seller_cf`       | `seller_name`, `seller_type`, `seller_rating`, `seller_location`                            | Vendor info for cross-platform seller comparison                  |
| `ratings_cf`      | `avg_rating`, `review_count`                                                                | Quality signals — used in regression analysis                     |
| `specs_cf`        | `json_blob`                                                                                 | Serialized JSON of category-specific specs                        |
| `ingestion_cf`    | `raw_id`, `ingestion_type`, `scraped_at`                                                    | Pipeline metadata and audit trail                                 |

---

## 5. Layer 3 — dbt Transformation Models

dbt (data build tool) runs SQL transformations on Bigtable data exposed via BigQuery external tables. All models follow a 3-layer pattern: staging (clean) → intermediate (reshape) → mart (aggregate) for modularity, testability, and lineage tracking.. Models are triggered by Apache Airflow on schedule.

### 5.1 Model Inventory

| Model                       | Layer        | Description                                                      |
| --------------------------- | ------------ | ---------------------------------------------------------------- |
| `stg_bestbuy.sql`           | Staging      | Clean & normalize BestBuy API raw data                           |
| `stg_ebay.sql`              | Staging      | Clean & normalize eBay API listing data                          |
| `stg_newegg.sql`            | Staging      | Clean & normalize Newegg scraped data                            |
| `stg_jumia.sql`             | Staging      | Clean & normalize Jumia.ma scraped data                          |
| `stg_cdiscount.sql`         | Staging      | Clean & normalize Cdiscount scraped data                         |
| `stg_all_sources.sql`       | Staging      | UNION all sources into one unified schema                        |
| `int_price_history.sql`     | Intermediate | One row per product per timestamp — full time series             |
| `int_price_changes.sql`     | Intermediate | Detect and flag price drops, spikes, velocity                    |
| `int_currency_norm.sql`     | Intermediate | Verify and normalize all prices to USD                           |
| `mart_price_analytics.sql`  | Mart         | avg, min, max, volatility per product                            |
| `mart_cross_platform.sql`   | Mart         | Same product — price diff across sources                         |
| `mart_category_trends.sql`  | Mart         | Category weekly trends: keyboards vs mice vs headsets vs webcams |
| `mart_brand_comparison.sql` | Mart         | Price & rating comparison across brands per category             |

### 5.2 Key dbt Rules

- Incremental models used for `int_price_history` — avoids reprocessing all historical data
- dbt tests on every model: schema, uniqueness, accepted values, not-null
- Custom statistical tests: price must be > 0, discount_percent between 0 and 100
- dbt docs and lineage graphs generated as project deliverables

---

## 6. Layer 4 — Python Analytics

The Python analytics layer consumes clean dbt mart outputs. It produces both descriptive statistics (what happened) and inferential statistics (why it happened / statistical significance).

Libraries: `pandas`, `numpy` , `scipy`, `statsmodels`, `pingouin`, `plotly`, `streamlit`.

|Field / Test|Type|Business Question|
|---|---|---|
|`mean_price`, `median_price`|Descriptive|What is the typical price per product / per category?|
|`std_price`, `price_volatility_7d`|Descriptive|How much does price fluctuate over time?|
|`min_price_ever`, `max_price_ever`|Descriptive|What is the full historical price range?|
|`discount_frequency`, `avg_discount_pct`|Descriptive|How often and how deeply are products discounted?|
|`price_by_category distribution`|Descriptive|How does price range differ: keyboards vs mice vs headsets?|
|t-test: price grouped by source|Inferential|Is Jumia.ma significantly cheaper than BestBuy for the same product?|
|t-test: price grouped by connectivity|Inferential|Are wireless peripherals significantly more expensive than wired?|
|ANOVA: price across 4 categories|Inferential|Which category has the most price variation overall?|
|regression: `price ~ rating + reviews + time + source`|Inferential|What factors best predict a peripheral's price?|
|Confidence intervals on price means|Inferential|How reliable are category average prices?|

### 6.1 Peripheral-Specific Insights

- **Wireless premium** — Are wireless keyboards/mice priced significantly higher than wired equivalents?
- **Brand premium** — Does Logitech command higher prices than budget brands for similar specs?
- **Platform arbitrage** — Which platform (BestBuy vs Jumia vs Newegg) consistently offers lower prices?
- **Category volatility** — Which of the 4 categories has the highest weekly price volatility?
- **Spec-price regression** — Does higher DPI justify higher mouse prices? Does RGB add cost to keyboards?

---

## 7. Field Count Summary

| Field Group                   | Count  | Used In                  |
| ----------------------------- | ------ | ------------------------ |
| Ingestion / identity fields   | 5      | All layers               |
| Product metadata fields       | 7      | All layers               |
| Pricing fields                | 6      | All layers               |
| Availability fields           | 3      | Bigtable, dbt, analytics |
| Seller fields                 | 4      | Bigtable, dbt            |
| Ratings fields                | 2      | dbt, Python analytics    |
| Specs JSON (Keyboard)         | 6      | Bigtable, dbt marts      |
| Specs JSON (Mouse)            | 6      | Bigtable, dbt marts      |
| Specs JSON (Headset)          | 6      | Bigtable, dbt marts      |
| Specs JSON (Webcam)           | 6      | Bigtable, dbt marts      |
| **TOTAL (fixed fields only)** | **27** | Full pipeline            |

---

_Document prepared by: Mohamed Soulaimane Nadi Lahjouji — Data Engineering & Analytics Portfolio Project — Version 3.0 — March 2026_