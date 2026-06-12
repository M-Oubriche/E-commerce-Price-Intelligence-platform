# PulsePrice — E-Commerce Price Intelligence Platform

> **Module:** Data engineering & Data analysis  
> **Academic Year:** 2025 – 2026  
> **Date:** June 2026  
> **Version:** 1.5  
> **Institution:** FSTT — Faculty of Sciences and Techniques of Tangier  
> **Program:** LSI - Software and Intelligent Systems  

---

## Project Information

| Field | Details |
|-------|---------|
| **Project Title** | PulsePrice — Cross-Platform E-Commerce Price Intelligence |
| **Module** | Data Engineering & Data Analysis |
| **Academic Year** | 2025 – 2026 |
| **Submission Date** | June 2026 |

---

## Team Members

| # | Name | Role | Responsibilities |
|---|------|------|-----------------|
| 1 | **Ou-briche Mohamed** | DevOps / DataOps | Infrastructure, Docker, CI/CD, Monitoring, Secrets Management |
| 2 | **Mohamed Soulaimane Nadi Lahjouji** | Data Engineering | Scrapers, NiFi Flows, Airflow DAGs,  Storage, dbt tests |
| 3 | **ASRAR Taha** | Data Analysis | dbt Data Modeling , Statistical Analysis, Notebooks, Reports |
| 4 | **BENZIAN Aya** | Full Stack | Angular Dashboard, FastAPI Backend, WebSocket Notifications |

---

## Table of Contents

### Project Overview
1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Tech Stack](#tech-stack)
4. [Repository Structure](#repository-structure)

---

### A. Data Engineering
1. [Data Pipeline — End-to-End Flow](#3-data-pipeline--end-to-end-flow)
2. [Ingestion Layer — Scrapers](#4-ingestion-layer--scrapers)
3. [Streaming Layer — Apache NiFi](#5-streaming-layer--apache-nifi)
4. [Batch Layer — Apache Airflow](#6-batch-layer--apache-airflow)
5. [Storage Layer — Bigtable + BigQuery](#7-storage-layer--bigtable--bigquery)
6. [Data Quality & Testing](#11-data-quality--testing)
7. [Scalability & Future-Proofing](#12-scalability--future-proofing)

---

### B. Full Stack
1. [Serving Layer — FastAPI + Redis](#9-serving-layer--fastapi--redis)

---

### C. DevOps / DataOps
1. [Orchestration & Infrastructure](#10-orchestration--infrastructure)

---

### D. Data Analysis
1. [Overview](#1-overview)
2. [Data Architecture & Strategy](#2-data-architecture--strategy)
3. [Core Analytics: The dbt Layer](#3-core-analytics-the-dbt-layer)
4. [Advanced Statistical Analytics (Python Engine)](#4-advanced-statistical-analytics-python-engine)
5. [Visual Analytics & Dashboard Integration](#5-visual-analytics--dashboard-integration)
6. [Optional Sandbox: Jupyter Notebooks](#6-optional-sandbox-jupyter-notebooks)
7. [Overall Analytics Architecture](#7-overall-analytics-architecture)

---

### Cross-Team
1. [Key Metrics & Performance](#13-key-metrics--performance)
2. [Architecture Decisions & Trade-Offs](#14-architecture-decisions--trade-offs)
3. [Conclusion](#15-conclusion)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Scraping** | `requests`, BeautifulSoup4, `lxml`, Pydantic v2, Selenium |
| **Streaming Ingestion** | Apache NiFi 1.25.0, `nipyapi` |
| **Batch Orchestration** | Apache Airflow 2.10.5 (LocalExecutor) |
| **Storage — Hot** | Google Cloud Bigtable |
| **Storage — Analytics** | Google Cloud BigQuery |
| **Transformation** | dbt (dbt_utils, dbt_expectations) |
| **Backend API** | FastAPI, Redis, WebSocket |
| **Frontend Dashboard** | Angular 17+, TailwindCSS |
| **Analytics** | Python, Pandas, SciPy, `statsmodels`, `pingouin` |
| **Containerization** | Docker, Docker Compose |
| **Infrastructure as Code** | Terraform (GCP) |
| **CI/CD** | GitHub Actions |
| **Monitoring** | Prometheus, Grafana |
| **Currency Conversion** | ExchangeRate-API |
| **Relational DB** | PostgreSQL 15 |

---

## Repository Structure

```
E-commerce-Price-Intelligence-platform/
│
├── .github/workflows/        # CI/CD pipelines
├── airflow/
│   ├── dags/                 # Pipeline DAGs (ingest, export…)
│   └── plugins/              # Custom Airflow operators
├── app/
│   ├── backend/              # FastAPI API (18 endpoints, Redis)
│   └── frontend/             # Angular 17+ dashboard
├── data/
│   ├── archive/              # Processed file archives
│   └── raw/                  # Raw JSONL scraping output
├── dbt/
│   ├── models/               # 14 models (staging → cleaned → mart)
│   ├── tests/                # Custom dbt tests
│   ├── macros/               # dbt macros
│   └── dbt_project.yml       # dbt project config
├── docker/
│   └── Dockerfiles/          # Dockerfiles — one per service
├── infrastructure/
│   ├── keys/                 # GCP Service account keys
│   ├── monitoring/           # Prometheus + Grafana configs
│   └── terraform/            # GCP provisioning (Bigtable, BigQuery)
├── nifi/
│   └── scripts/              # Custom NiFi Python processors
├── notebooks/                # Jupyter analytical notebooks
├── scrapers/
│   ├── ecommerce_scraper/    # 6 spiders
│   ├── main.py               # Scraper orchestrator
│   └── manual_links.json     # Configuration catalog
├── tests/                    # Global integration tests
├── .env.example              # Environment variables template
├── bigquery_schema.json      # BigQuery schema definitions
├── CONTRIBUTING.md           # Contribution guidelines
├── Data Model Specification.md # Data modeling details
├── docker-compose.yml        # Full local environment (13 services)
├── LICENSE                   # MIT License
└── report_price_intelligence.md # This architecture report
```

> For detailed folder ownership rules per role, see [CONTRIBUTING.md](./CONTRIBUTING.md)

---

# A. Data Engineering

## 1. Executive Summary

PulsePrice is a **production-grade, cloud-native** price intelligence platform that monitors **six major e-commerce platforms** across **seventeen product categories**, collecting **~7,000+ daily price records** into a **hybrid batch/streaming data pipeline**.

The architecture spans **five data layers** — ingestion, streaming, batch, transformation, and serving — connected through **two parallel pipelines** (NiFi for real-time, Airflow for batch) converging into **Google Bigtable** and **Google BigQuery**, transformed through **dbt** with **31 automated data quality tests**, and served through a **FastAPI backend** with **Redis caching** to a **real-time Angular dashboard** with **WebSocket push notifications**.

### Key Technical Highlights

| Attribute | Detail |
|-----------|--------|
| **Data sources** | 6 e-commerce platforms (jumia.ma, bestbuy.com, newegg.com, pc21.fr, ultrapc.ma, materiel.net) |
| **Product categories** | 17 (GPU, CPU, RAM, SSD, HDD, Monitor, Keyboard, Mouse, PSU, Case, Cooling, Motherboard, Laptop, Desktop, Mobile, Peripheral, Other) |
| **Daily data volume** | ~7,000 records (~135 MB raw JSONL) |
| **Total data managed** | ~100,000 Bigtable rows, ~100,000 BigQuery rows |
| **Pipeline stages** | 5 (scrape → ingest → store → transform → serve) |
| **Data quality tests** | 31 (27 passing, 4 fixed this session) |
| **End-to-end latency** | Real-time (seconds via NiFi) + Batch (daily via Airflow) |
| **Deployment** | 13 Docker containers across 3 networks, 6 named volumes |
| **Cloud services** | Google Cloud Bigtable, BigQuery, IAM, Terraform provisioned |

---

## 2. Architecture Overview

### Global Architecture

```mermaid
flowchart TD
    %% DATA SOURCES
    SOURCES[("🌐 E-Commerce Websites\nAmazon · eBay · Others")]

    %% SCRAPING
    SCRAPING["🕷️ Web Scraping\nScrapy + BeautifulSoup/Selenium"]

    %% SPLIT
    SOURCES --> SCRAPING
    SCRAPING --> REALTIME
    SCRAPING --> BATCH

    %% TWO PATHS
    REALTIME[["⚡ Real-Time Events\nKafka Topic"]]
    BATCH[["📦 Batch Files\nCSV / JSON Dumps"]]

    %% NIFI
    NIFI["🔀 Apache NiFi\nStreaming Ingestion & Routing"]
    REALTIME --> NIFI
    NIFI -->|"big price change"| ALERT["🔔 Real-Time\nPrice Alert"]
    NIFI -->|"all data"| BigTable

    %% AIRFLOW
    AIRFLOW["⚙️ Apache Airflow\nBatch Orchestration & Scheduling"]
    BATCH --> AIRFLOW
    AIRFLOW --> BigTable

    %% BigTable
    BigTable[("🗄️ Google Cloud Bigtable \n Time-Series Storage")]

    %% DBT
    DBT["🔧 dbt Transformations\nClean → Aggregate → Model"]
    BigTable--> DBT
    
     %% BigQuery
    BigQuery[("Google Cloud BigQuery")]
    DBT-->BigQuery
    

    %% ANALYSIS
    ANALYSIS["📊 Python Analysis\nDescriptive & Inferential Statistics"]
    BigQuery--> ANALYSIS

    %% DASHBOARD
    DASHBOARD["🖥️ Streamlit Dashboard\nLive Prices + Charts + Reports"]
    ANALYSIS --> DASHBOARD

    %% DATAOPS (side)
    DATAOPS["🛠️ DataOps\nDocker · GitHub · CI/CD · Monitoring"]
    DATAOPS -. "supports everything" .-> NIFI
    DATAOPS -. "supports everything" .-> AIRFLOW
    DATAOPS -. "supports everything" .-> DBT

    %% STYLES
    classDef default fill:#1e293b,stroke:#475569,color:#f1f5f9,stroke-width:2px
    classDef highlight fill:#0f172a,stroke:#38bdf8,color:#f1f5f9,stroke-width:2.5px
    classDef alert fill:#7f1d1d,stroke:#ef4444,color:#fff,stroke-width:2px
    classDef ops fill:#1a1a1a,stroke:#64748b,color:#94a3b8,stroke-width:1.5px,stroke-dasharray:4 4

    class SOURCES,STORAGE highlight
    class ALERT alert
    class DATAOPS ops
```



### Detailed Architecture

```mermaid
flowchart TD
    subgraph SCRAPERS["SCRAPER LAYER"]
        J["Jumia.ma<br/>BS4+JSON-LD"]
        BB["BestBuy.com<br/>REST API"]
        NE["Newegg.com<br/>BS4+Session"]
        PC["PC21.fr<br/>BS4+3-level"]
        UP["UltraPC.ma<br/>BS4+CSS"]
        MN["Materiel.net<br/>BS4+JS"]
    end
    J & BB & NE & PC & UP & MN --> RL["Pydantic RawLandingRecord"]

    RL --> JSONL["JSONL Files<br/>(/data/raw/date/)"]
    RL --> NIFI["NiFi HTTP<br/>(port 9090)"]

    JSONL --> AF["Airflow (Batch)<br/>ingest_to_bigtable.py"]
    NIFI --> NS["ExecuteStreamCommand<br/>nifi_ingest.py"]
    NS --> PG["(PostgreSQL<br/>alert_events)"]

    AF --> BT["[Bigtable<br/>ecommerce_prices]"]
    NS --> BT

    BT --> EXP["Airflow Export<br/>bigtable_to_bigquery.py"]

    EXP --> BQ["{BigQuery<br/>raw_ecommerce_prices}"]

    BQ --> DBT["dbt Transform<br/>14 models, 31 tests"]

    DBT --> FA["FastAPI Backend<br/>18 endpoints, Redis"]

    FA --> ANG["Angular Frontend<br/>Real-time Dashboard"]
```



---

## 3. Data Pipeline — End-to-End Flow

### 3.1 Data Lineage

```mermaid
flowchart LR
    SCR["SCRAPERS<br/>requests + BS4"] --> J["JSONL Files"]

    SCR --> N["NiFi ListenHTTP"]

    J --> AF["Airflow DAG<br/>ingest_ecommerce_prices"]
    AF --> AF1["ensure_archive_dir"]
    AF1 --> AF2["run_scrapers_container<br/>docker exec → main.py"]
    AF2 --> AF3["push_to_bigtable.py<br/>Bigtable write"]
    AF3 --> AF4["trigger downstream DAG"]

    N --> NS["nifi_ingest.py"]
    NS --> BT["[Bigtable<br/>ecommerce_prices]"]
    NS --> PG["(PostgreSQL<br/>alert_events)"]

    AF4 --> EXP["Airflow DAG<br/>bigtable_to_bigquery_export"]
    BT --> EXP
    EXP --> BQ["{BigQuery<br/>raw_ecommerce_prices}"]

    BQ --> DBT["dbt Pipeline<br/>Staging → Cleaned → Marts<br/>31 tests"]

    DBT --> FA["FastAPI Backend<br/>18 endpoints + Redis"]
    FA --> ANG["Angular Frontend<br/>WebSocket alerts"]
```



### 3.2 Dual-Pipeline Strategy

A deliberate architectural choice: **two parallel ingestion paths** with different trade-offs.

| Characteristic | NiFi Pipeline (Real-Time) | Airflow Pipeline (Batch) |
|---------------|--------------------------|-------------------------|
| **Trigger** | Continuous (30s polling) | @daily schedule |
| **Latency** | Seconds | Hours |
| **Data format** | Streaming JSON via HTTP | JSONL files on disk |
| **Ingestion type** | `streaming` (Bigtable marker) | `batch` (Bigtable marker) |
| **Alert detection** | Yes — real-time price drop ≥5% | No (historical only) |
| **Error recovery** | NiFi auto-retry flow | File stays in /data/raw/ on failure |
| **Schema source** | nifi_ingest.py (385 lines) | ingest_to_bigtable.py (237 lines) |
| **Throughput** | Single-record processing | Batch 1000-row mutations |

---

## 4. Ingestion Layer — Scrapers

### 3.1 Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **HTTP client** | `requests` (synchronous) | Simpler debugging than Scrapy's async engine; full control over retry/headers |
| **HTML parsing** | `BeautifulSoup4` + `lxml` | Resilient to malformed HTML; CSS selector support |
| **Data models** | `Pydantic v2` | Strict runtime validation; automatic JSON serialization; spec union types |
| **JS rendering** | `Selenium` (available) | Only needed for JS-heavy sites (disabled scrapers) |
| **Rate fetching** | `ExchangeRate-API` | Free tier, 1500 requests/month, updated daily |
| **Config format** | `manual_links.json` | Declarative URL catalog; no code changes to add URLs |

### 3.2 Data Model Design (`models.py` — 220 lines)

The data model is a **unified schema envelope** that normalizes all e-commerce platforms into a single structure:

```python
RawLandingRecord:
  ├── raw_id: UUID              # Auto-generated unique identifier
  ├── ingestion_type: Enum      # STREAMING | BATCH
  ├── source: str               # e.g., "jumia.ma", "bestbuy"
  ├── source_url: str           # Original scraped URL
  ├── scraped_at: datetime      # UTC timestamp
  ├── product: Product          # name, brand, category, model_number, etc.
  ├── pricing: Pricing          # raw_price, currency, converted_price_usd, etc.
  ├── availability: Availability # in_stock, quantity, shipping
  ├── seller: Seller            # name, type, rating, location
  ├── ratings: Ratings          # avg_rating, review_count
  └── specs: Specs              # Tagged union of 17 category-specific specs
```

**Specs as a Tagged Union** — A clever pattern that mirrors BigQuery's `RECORD`-of-`RECORDS`:

```python
class Specs(BaseModel):
    GPU: Optional[GPUSpecs] = None      # core_clock, vram_gb, cuda_cores, etc.
    CPU: Optional[CPUSpecs] = None      # cores, threads, base_clock, tdp, etc.
    RAM: Optional[RAMSpecs] = None      # capacity_gb, speed_mhz, ddr_version
    SSD: Optional[SSDSpecs] = None      # capacity_gb, interface, read_speed
    HDD: Optional[HDDSpecs] = None      # capacity_gb, rpm, cache_mb
    Monitor: Optional[MonitorSpecs] = None  # size_inches, resolution, refresh_rate
    # ... 11 more category-specific spec types
```

Each scraper populates only its category's spec sub-model; all others remain `None`. On serialization, the JSON only includes non-null fields, keeping payloads compact.

### 3.3 Base Scraper (`base.py` — 60 lines)

The abstract base class provides:

**Exchange Rate Caching** — A class-level dictionary shared across all scraper instances:

```python
_conversion_rates = {}  # Shared across ALL scraper instances

def get_conversion_rate(self, from_currency, to_currency="USD"):
    cache_key = f"{from_currency}_{to_currency}"
    if cache_key in self.__class__._conversion_rates:
        return self.__class__._conversion_rates[cache_key]
    # Try ExchangeRate-API, fall back to hardcoded defaults
```

This prevents redundant API calls when multiple scrapers for the same currency run in sequence.

### 3.4 Active Spiders

#### JumiaScraper (`jumia.ma` — MAD)
- **203 lines** — the most battle-tested scraper
- **JSON-LD extraction**: Parses structured data from `<script type="application/ld+json">` for reliable prices
- **Detail page scraping**: Visits each product's detail page for full specs, ratings, and model number
- **Madagascar-currency conversion**: Calls `get_conversion_rate("MAD", "USD")` at initialization
- **Price parsing**: Aggressive digit-only regex to handle MAD formatting (e.g., `"1 234,56 MAD" → 1234.56`)

#### BestBuyScraper (`bestbuy.com` — USD)
- **216 lines** — uses the **official BestBuy REST API**
- **API key authentication**: `BESTBUY_API_KEY` from environment
- **Category extraction**: Regex `((?:abcat|pcmcat)\d+)` extracts hierarchical category IDs from URLs
- **Rich spec parsing**: 9-category spec detection from API response fields
- **No rate limit handling** — deliberate simplification for demo/scoped API key

#### NeweggScraper (`newegg.com` — USD)
- **204 lines** — optimized for speed (no detail page visits)
- **Model number extraction**: Regex parses the full info block for model/SKU distinction
- **Keyboard form-factor detection**: Scans description for TKL (TenKeyLess), 60%, 75% patterns
- **Thread-safe session**: Uses `requests.Session()` for connection reuse across category runs

#### PC21Scraper (`pc21.fr` — EUR)
- **274 lines** — the most sophisticated BS4 scraper
- **3-level navigation**: Category page → sub-category page → product listing
- **MPN/SKU split**: Correctly separates manufacturer part number from internal SKU
- **EUR conversion**: `get_conversion_rate("EUR", "USD")` at init
- **Price normalization**: Handles French formatting (`"152,79 € HT" → 152.79`), strips VAT indicators

#### UltraPCScraper (`ultrapc.ma` — MAD)
- **153 lines** — lightweight, CSS-selector-based
- **`data-id-product` extraction**: Parses product ID from URL pattern
- **MAD conversion**: `get_conversion_rate("MAD", "USD")` at init

#### MaterielNetScraper (`materiel.net` — EUR)
- **365 lines** — the most technically complex scraper
- **JavaScript-injection parsing**: Extracts prices from JS `getItem()` calls embedded in the HTML
- **Per-product detail pages**: Visits each product's individual page for model number and specs
- **French-to-English spec regex engine**: `_parse_specs_from_description()` with 30+ regex patterns covering all 17 categories
- **Dual-page scrape pattern**: Listing page for price/name + detail page for specs/model number

### 4.5 Scraper Orchestrator (`main.py` — 150 lines)

**Dual-export pattern**: Every scraper run exports to BOTH destinations:

```python
records = list(scraper.scrape(url, category, max_pages=1))
export_to_jsonl(records, f"{name}_{category}")    # → /data/raw/date/{source}_{category}_{ts}.jsonl
export_to_nifi(records)                             # → http://price_nifi:9090/contentListener
```

**NiFi streaming with retry**: 5 attempts with 3-second backoff on HTTP 503:

```python
for attempt in range(5):
    resp = requests.post(nifi_url, json=payload, timeout=10)
    if resp.status_code == 200:
        break
    elif resp.status_code == 503:
        time.sleep(3)  # NiFi startup/throttling
```

**SCRAPER_MAP pattern**: Extensible without modifying orchestrator logic:

```python
SCRAPER_MAP = {
    "jumia": JumiaScraper,
    "pc21": PC21Scraper,
    "newegg": NeweggScraper,
    "bestbuy": BestBuyScraper,
    "ultrapc": UltraPCScraper,
    "materielnet": MaterielNetScraper,
}
```

### 4.6 Configuration Catalog (`manual_links.json`)

A declarative JSON catalog with **100 entries** covering all 6 scrapers × 17 categories:

```json
[
  {"scraper": "jumia", "category": "gpu", "url": "https://www.jumia.ma/les-composants-ordinateur-cartes-graphiques/"},
  {"scraper": "newegg", "category": "CPU", "url": "https://www.newegg.com/p/pl?N=100006676"},
  {"scraper": "pc21", "category": "GPU", "url": "https://www.pc21.fr/composant-pc/cartes-graphiques-videos/g113/"},
  ...
]
```

---

## 5. Streaming Layer — Apache NiFi

### 5.1 Architecture

Apache NiFi 1.25.0 runs as a single-node instance with a **Python 3.11 virtual environment** for executing custom ingestion scripts. The flow is provisioned programmatically via `setup_nifi_flow.py` using the `nipyapi` library.

### 5.2 NiFi Flow

```mermaid
flowchart TD
    LH["ListenHTTP<br/>port 9090, /contentListener"]
    LH --> EC["ExecuteStreamCommand<br/>python /opt/nifi/scripts/nifi_ingest.py"]
    EC --> BT["[Bigtable<br/>ecommerce_prices]<br/>Primary write"]
    EC --> PG["(PostgreSQL<br/>alert_events)<br/>Price drop ≥5%"]
    PG --> WK["Worker<br/>Fuzzy match → notification"]
```



### 5.3 NiFi Ingest Script (`nifi_ingest.py` — 385 lines)

The **most sophisticated component** — a dual-write ingestion engine with **inline dbt replica filters**:

**Price Drop Detection Engine:**
```python
# Previous price lookup via Bigtable prefix scan
row_prefix = f"{category}#{brand}#{product_id}#{source}#".encode('utf-8')
partial_rows = table.read_rows(filter_=row_filters.RowKeyRegexFilter(row_prefix + b".*"))
# ... extracts previous_price from latest matching row

# Drop detection
if current_price < previous_price:
    price_drop_percent = ((previous_price - current_price) / previous_price) * 100
    if price_drop_percent >= 5.0:
        # Write alert to PostgreSQL for the worker to process
        cur.execute("INSERT INTO alert_events (...) VALUES (...)")
```

**Inline dbt Cleaning Replica** — Mirrors `int_clean_prices.sql`'s filters to prevent false alerts:

```python
_ACCESSORY_KEYWORDS = ["laptop stand", "phone case", "screen protector", ...]
_MIN_PRICE = {"laptop": 100, "desktop": 100, "gpu": 50, ...}
_MAX_PRICE = {"laptop": 10000, "desktop": 15000, "gpu": 6000, ...}

def _passes_cleaning_filters(record):
    """Returns True only if this record would survive dbt's int_clean_prices."""
    # Check price exists and is positive
    # Check accessory keyword exclusions
    # Check per-category min/max price thresholds
    # Only then allow alert insertion
```

**Bigtable Table Auto-Creation:**
```python
if not table.exists():
    table.create()
    for cf_id in ["price_cf", "metadata_cf", "ingestion_cf", "availability_cf",
                   "seller_cf", "ratings_cf", "specs_cf"]:
        table.column_family(cf_id).create()
```

---

## 6. Batch Layer — Apache Airflow

### 4.1 Airflow Architecture

Apache Airflow 2.10.5 runs as a **custom Docker deployment** with:
- **PostgreSQL 15** as the metastore
- **Redis 7** as the Celery broker (ready for executor expansion)
- **Docker-in-Docker**: The `root` user and `/var/run/docker.sock` mount enable `docker exec` for scraper and dbt tasks
- **GCP connectivity**: Bigtable and BigQuery Python libraries installed for native cloud integration

### 4.2 DAG: `init_bigtable_schema`

**Purpose:** One-time infrastructure initialization. Creates the Bigtable table with 7 column families, each configured with `MaxVersionsGCRule(10)` — retaining 10 historical versions per cell for price trend analysis.

- **Schedule:** `@once` (manual trigger on environment creation)
- **Operator:** `PythonOperator` with inline Bigtable client

### 6.3 DAG: `ingest_ecommerce_prices` (Stage 1+2)

The **primary batch pipeline** — scrapes, ingests, and triggers downstream processing:

```mermaid
flowchart TD
    EA["ensure_archive_dir"]
    EA --> RC["run_scrapers_container<br/>docker exec price_scraper python main.py"]
    RC --> RCn["7169 records → JSONL files<br/>→ /data/raw/{date}/"]
    RC --> PB["push_to_bigtable<br/>PythonOperator — 237 lines"]
    PB --> PBn["Walks JSONL files<br/>→ parses → writes to Bigtable<br/>7 column families, ingestion_type='batch'<br/>Archives ONLY on full write success"]
    PB --> TB["trigger_bigquery_export_and_dbt<br/>TriggerDagRunOperator"]
    TB --> TBn["Fire-and-forget to<br/>bigtable_to_bigquery_export DAG<br/>reset_dag_run=True"]
```



**Production-grade error handling:**
```python
# Only archive if ALL mutations succeeded — failed files retry next run
response = table.mutate_rows(rows)
failed = sum(1 for status in response if status.code != 0)
if failed > 0:
    raise RuntimeError(
        f"{failed}/{len(rows)} mutations failed for {file_path}. "
        "File NOT archived — retry on next DAG run."
    )
# shutil.move() only reached on full success
```

### 6.4 DAG: `bigtable_to_bigquery_export` (Stage 3 — 327 lines)

The **most architecturally significant DAG** — the bridge between the ingestion and analytics layers:

```mermaid
flowchart LR
    EXP["export_bigtable_to_bigquery<br/>PythonOperator"] --> S1["1. Full Bigtable scan"]
    S1 --> S2["2. row_key dedup"]
    S2 --> S3["3. Query BQ existing keys"]
    S3 --> S4["4. Flatten 7 families"]
    S4 --> S5["5. is_price_drop"]
    S5 --> S6["6. WRITE_APPEND"]
    S6 --> S7["7. CREATE OR REPLACE<br/>PARTITION + CLUSTER"]
    S7 --> DR["dbt_run<br/>14 models"]
    DR --> DT["dbt_test<br/>31 tests"]
    DT --> DD["dbt_docs_generate<br/>Non-blocking"]
```

**Safe type coercion** — Every potential `None` or malformed cell is handled:

```python
def _safe_float(val):
    try: return float(val) if val is not None else None
    except (ValueError, TypeError): return None

def _safe_bool(val):
    if val is None: return None
    return str(val).lower() in ("true", "1", "yes")
```

**Price drop inference:**
```python
_conv_price = _safe_float(_cell(row, "price_cf", "converted_price_usd"))
_orig_price = _safe_float(_cell(row, "price_cf", "original_price_usd"))
if _conv_price is not None and _orig_price is not None and _orig_price > 0 and _conv_price < _orig_price:
    _is_drop = True
    _drop_pct = round((_orig_price - _conv_price) / _orig_price * 100, 2)
```

### 6.5 DAG: `health_check`

A **devops-grade verification DAG**:

```
1. airflow_is_alive: trivially returns "alive"
2. volume_is_mounted: checks /data/raw exists, is a directory, lists contents
3. env_vars_are_set: verifies 4 required Airflow env vars exist (without printing values)
```

---

## 7. Storage Layer — Bigtable + BigQuery

### 7.1 Bigtable Schema Design

**Row Key Design** — The foundation of query performance:

```
{category}#{brand}#{product_id}#{source}#{timestamp}

Example: GPU#NVIDIA#RTX-4090#bestbuy#20260611180000
```

**Properties:**
- **Prefix scans**: Filter by category, category+brand, or category+brand+product_id+source
- **Lexicographic ordering**: All products in same category stored adjacently
- **Timestamp suffix**: Ensures uniqueness; enables time-range filtering via key prefix

```mermaid
flowchart TD
    RK["Row Key: {category}#{brand}#{product_id}#{source}#{timestamp}"]
    RK --> IC["ingestion_cf<br/>6 cells"]
    RK --> MC["metadata_cf<br/>9 cells"]
    RK --> PC["price_cf<br/>6 cells"]
    RK --> AC["availability_cf<br/>3 cells"]
    RK --> SC["seller_cf<br/>4 cells"]
    RK --> RC["ratings_cf<br/>2 cells"]
    RK --> SC2["specs_cf<br/>1 cell"]

    IC --> ICd["raw_id, ingestion_type, scraped_at,<br/>is_price_drop, price_drop_percent, prev_price_threshold"]
    MC --> MCd["name, brand, category, source, source_url,<br/>external_id, model_number, description, image_url"]
    PC --> PCd["raw_price, converted_price_usd, original_price_usd,<br/>discount_percent, conversion_rate_used, raw_currency"]
    AC --> ACd["in_stock, quantity, shipping_available"]
    SC --> SCd["seller_name, seller_type, seller_rating, seller_location"]
    RC --> RCd["avg_rating, review_count"]
    SC2 --> SC2d["json_blob<br/>(category-specific specs)"]
```

**7 Column Families:**

| Family | Content | Cells Per Row |
|--------|---------|---------------|
| `ingestion_cf` | raw_id, ingestion_type, scraped_at, is_price_drop, price_drop_percent, prev_price_threshold | 6 |
| `metadata_cf` | name, brand, category, source, source_url, external_id, model_number, description, image_url | 9 |
| `price_cf` | raw_price, converted_price_usd, original_price_usd, discount_percent, conversion_rate_used, raw_currency | 6 |
| `availability_cf` | in_stock, quantity, shipping_available | 3 |
| `seller_cf` | seller_name, seller_type, seller_rating, seller_location | 4 |
| `ratings_cf` | avg_rating, review_count | 2 |
| `specs_cf` | json_blob (serialized JSON of category-specific specs) | 1 |

**Versioning Policy:** `MaxVersionsGCRule(10)` — retains 10 historical versions per cell for price trend analysis across column families.

### 7.2 BigQuery Schema Design

The `raw_ecommerce_prices` table is a **flat denormalized table** (26 columns) designed for SQL analytics:

```
row_key (STRING, REQUIRED)
raw_id (STRING)
is_price_drop (BOOLEAN)
price_drop_percent (FLOAT)
source (STRING)
scraped_at (TIMESTAMP)
product_external_id (STRING)
product_name (STRING)
product_brand (STRING)
product_category (STRING)
raw_price (FLOAT)
converted_price_usd (FLOAT)
...
specs_json (STRING)
```

**Partitioning:** `PARTITION BY DATE(scraped_at)` — daily partitions for cost-effective time-range queries

**Clustering:** `CLUSTER BY source, product_category` — optimizes the most common filter patterns

---
## 11. Data Quality & Testing

### 11.1 Quality Gates

The pipeline has **5 layers of data quality enforcement**:

| Layer | Enforcement | Location |
|-------|-------------|----------|
| **1. Schema validation** | Pydantic v2 strict typing | `models.py` — every scraper output validated |
| **2. Inline NiFi filters** | Accessory exclusions + price thresholds | `nifi_ingest.py:_passes_cleaning_filters()` |
| **3. dbt cleaning** | 30+ filters: keywords, price bounds, translation | `int_clean_prices.sql` |
| **4. dbt tests** | 31 automated tests on uniqueness, nulls, values | `schema.yml` + `sources.yml` |
| **5. Dedup pipeline** | In-memory + SQL-level deduplication | `bigtable_to_bigquery.py` (both Python + SQL) |

### 11.2 dbt Test Suite

**31 tests, all passing:**

```
PASS=31 WARN=0 ERROR=0 SKIP=0 TOTAL=31

  accepted_values_mart_cross_platform_margin_health_status  ─── PASS
  source_unique_price_intelligence_raw_ecommerce_prices_row_key ─ PASS
  unique_int_price_history_history_id                      ─── PASS
  unique_mart_price_analytics_product_unified_id            ─── PASS
  unique_mart_platform_performance_platform                  ─── PASS
  unique_mart_shopper_insights_product_category              ─── PASS
  unique_mart_category_trends_product_category               ─── PASS
  not_null_* (16 tests)                                      ─── PASS
  source_not_null_* (4 tests)                                ─── PASS
  source_unique_ecommerce_raw_pricing_data_raw_id            ─── PASS
```

---

## 12. Scalability & Future-Proofing

### 12.1 Current Capacity

| Resource | Current | Limit | Safety Margin |
|----------|---------|-------|---------------|
| Bigtable rows | ~100,000 | ~1,000,000 (in-memory scan) | 10× |
| BigQuery partitions | ~180 daily | Unlimited (partitioned) | ∞ |
| NiFi throughput | ~7,000 records/run | 1,000,000+ records/run | 140× |
| dbt models | 14 | Unlimited | ∞ |
| API requests | ~200/min | ~200/min (rate-limited) | At limit |
| Redis cache | ~50 keys | 256MB | 5,000× |

### 12.2 Growth Trajectory

At the current scrape rate of ~7,000 records/day:
- **1 month**: ~210,000 rows → well within limits
- **6 months**: ~1,260,000 rows → approaching in-memory scan limit (500k tripwire triggers)
- **12 months**: ~2,500,000 rows → full Bigtable scan refactor needed

### 12.3 Built-In Safeguards

- **500k-row warning log**: `log.warning("Bigtable scan exceeds 500k rows...")` when full scan becomes risky
- **BigQuery partitioning**: Ensures queries only scan relevant day partitions
- **Airflow retries**: All tasks have 1-2 retries with exponential backoff
- **NiFi auto-retry**: ListenHTTP → ExecuteStreamCommand has built-in failure routing

### 12.4 Planned Scalability Path

| Threshold | Action |
|-----------|--------|
| 500k rows | Switch to incremental Bigtable scan (timestamp-based row ranges) |
| 1M rows | Add Bigtable garbage collection (reduce from 10 to 3 versions) |
| 5M rows | Implement BigQuery Storage API direct connector (bypass Python) |
| 10M rows | Add Airflow Celery executor (distributed task workers) |

---

# B. Full Stack

###  Mission
**Bridge the gap between our analytical data pipelines and the end-users by delivering a fast, secure, and real-time interactive experience for both Clients and Resellers.**

---

###  The Tech Stack at a Glance
- **Frontend:** Angular 17+ (Component-driven, Dual-Role Layouts, Reactive UI)
- **Backend:** FastAPI (Python 3.11, fully async, Pydantic validation)
- **Database:** PostgreSQL (18 normalized tables, Alembic migrations)
- **Real-time & Caching:** Redis (Pub/Sub for WebSockets, Rate limiting)

---

###  System Architecture
```text
  ┌───────────────────────────────────────────────────────────────────────┐
  │                      Full Stack Architecture                          │
  └───────────────────────────────────────────────────────────────────────┘

   Browser (Angular 17+)
   ┌─────────────────────────────────────────┐
   │  Client Dashboard │ Reseller Dashboard  │
   └───────────┬─────────────────────────────┘
               │  REST (JWT)          │  WebSocket
               │                     │  ws://{user_id}
               ▼                     ▼
   ┌───────────────────────────────────────────────┐
   │                  FastAPI Backend              │
   │  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
   │  │   Auth   │  │  Routes  │  │  WS Mgr    │  │
   │  │  JWT +   │  │  /api/v1 │  │  push to   │  │
   │  │  OAuth2  │  │  30+ ep  │  │  clients   │  │
   │  └──────────┘  └──────────┘  └─────┬──────┘  │
   └────────────┬───────────────────────┼──────────┘
                │                       │ subscribe
       ┌────────┴────────┐    ┌─────────▼──────────┐
       │   PostgreSQL    │    │       Redis         │
       │   18 tables     │    │  Rate limit +       │
       │   Alembic mig.  │    │  Pub/Sub bus        │
       └─────────────────┘    └────────────────────┘
```

---

### 1. The Backend Engine (FastAPI)
High-performance, fully async API built with FastAPI, SQLAlchemy (async), Alembic, and Redis.

```bash
docker compose up backend -d
# Interactive docs → http://localhost:8000/docs
```

####  Deep Dive: The Real-Time Event Architecture
To achieve true real-time price drop notifications without hammering the database with polling requests, the architecture leverages **Redis Pub/Sub** acting as an event bus between the Data Engineering pipeline and the Full Stack layer.

**The Technical Flow:**
1. **Detection (NiFi & Webhook):** When Apache NiFi processes a newly scraped price and detects a drop ≥5% compared to the historical baseline, it fires an asynchronous HTTP webhook to an internal FastAPI endpoint (`POST /internal/events/price-drop`).
2. **Event Fan-Out (Redis Pub/Sub):** The FastAPI route handler does not block to send emails or web sockets. Instead, it instantly publishes a JSON payload to a Redis channel named `events:price_drops`.
3. **The Background Worker:** When the FastAPI server starts, an `asyncio.create_task()` spins up a long-running background worker. This worker holds a persistent connection to Redis, actively listening (`psubscribe`) to the `events:*` channels.
4. **WebSocket Manager:** The background worker receives the JSON payload, checks the `user_id` against the `ConnectionManager` (a singleton class holding active WebSocket objects in memory), and routes the payload directly to the correct user's TCP socket.
5. **Angular Reactivity:** The Angular 17 service (`WebSocketService`) receives the frame and uses RxJS `BehaviorSubject` to instantly push the new price into the Deal Feed component, rendering a toast notification with zero HTTP overhead and zero page reloads.

```text
 [ Apache NiFi ] ──(Webhook)──▶ [ FastAPI Internal Route ] ──(Publish)──▶ [ Redis Channel: events:price_drops ]
                                                                                   │
                                                                             (Subscribes)
                                                                                   │
 [ Angular UI ] ◀──(TCP Frame)── [ FastAPI WS Manager ] ◀──(asyncio Task)── [ Background Worker ]
```

####  Complete API Reference (30+ Endpoints)
| Module | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | POST | `/api/v1/auth/register` | Register new user (client or reseller) |
| | POST | `/api/v1/auth/login` | Login, receive access + refresh tokens |
| | POST | `/api/v1/auth/logout` | Server-side session invalidation |
| | POST | `/api/v1/auth/refresh` | Rotate access token silently |
| | POST | `/api/v1/auth/google` | Google OAuth2 popup login |
| | POST | `/api/v1/auth/verify-email` | Confirm email address |
| | POST | `/api/v1/auth/request-password-reset` | Send reset link via email |
| | POST | `/api/v1/auth/reset-password` | Apply new password with token |
| **Users** | GET | `/api/v1/users/me` | Get authenticated user profile |
| | PUT | `/api/v1/users/me` | Update profile fields |
| **Preferences**| GET | `/api/v1/preferences/` | Get display & alert preferences |
| | PUT | `/api/v1/preferences/` | Update theme, currency, language, timezone |
| **Watchlist** | GET | `/api/v1/watchlist/` | List all tracked products |
| | POST | `/api/v1/watchlist/` | Add product to watchlist |
| | PUT | `/api/v1/watchlist/{id}` | Update target price |
| | DELETE| `/api/v1/watchlist/{id}` | Remove tracked product |
| **Shopper Alerts**| GET | `/api/v1/shopper-alerts/` | List configured alerts |
| | POST | `/api/v1/shopper-alerts/` | Create alert with condition + threshold |
| | PATCH| `/api/v1/shopper-alerts/{id}` | Update or pause alert |
| | DELETE| `/api/v1/shopper-alerts/{id}` | Delete alert |
| **Reseller** | GET/POST | `/api/v1/reseller/products` | Manage personal product catalog |
| | PUT/DELETE| `/api/v1/reseller/products/{id}` | Update or remove product |
| | GET/POST | `/api/v1/reseller/competitors` | Track competitor sellers |
| | GET | `/api/v1/reseller/price-alerts` | Reseller margin breach alerts |
| **Analytics** | GET | `/api/v1/analytics/price-history` | Historical price trend data |
| | GET | `/api/v1/analytics/market-overview` | Platform-wide statistics |
| | GET | `/api/v1/analytics/competitor-analysis` | Price-gap breakdown per product |
| **Notifications**| GET | `/api/v1/notifications/` | Full notification delivery history |
| **Activity Logs**| GET | `/api/v1/activity-logs/` | User action audit trail |
| **WebSocket** | WS | `/api/v1/ws/{user_id}` | Real-time price drop stream |
| **Health** | GET | `/health` | API liveness check |

####  Security Architecture
| Layer | Implementation |
| :--- | :--- |
| **Access Tokens** | JWT, 15-minute expiry, signed with secret key |
| **Refresh Tokens** | 30-day lifetime, stored hashed in DB, rotated on use |
| **Session Tracking** | `user_sessions` table logs device, IP, expiry per token |
| **Rate Limiting** | Redis-backed — 100 req/min general, 10 req/min on auth endpoints |
| **Password Reset** | Time-limited tokens (hashed), single-use, auto-purged |
| **Email Verification**| Token-gated account activation |
| **Google OAuth2** | Full popup-based OAuth2 flow with `google_sub` binding |
| **CORS** | Restricted to known origins (`localhost:4200`, `localhost:80`) |
| **Token Cleanup** | Background async task purges expired/used tokens every hour |

####  Background Workers
Beyond the Redis Pub/Sub worker, the FastAPI backend also runs scheduled maintenance loops on startup:
- **Expired Token Cleanup:** An `asyncio.sleep(3600)` loop that safely deletes expired and already-used email verification and password reset tokens from the PostgreSQL database, preventing table bloat.

---

### 2. The Frontend Experience (Angular 17+)
```bash
docker compose up frontend -d
# Access → http://localhost:4200
```
The application dynamically renders completely different experiences based on the user's role:

####  Shopper (Client) Dashboard
*Designed for consumers looking to save money.*

| Feature | Description |
| :--- | :--- |
| **Price Watcher** | Track any product across all platforms, set target price |
| **Smart Alerts** | Configure alert conditions (below target, drop %, availability) |
| **Deal Feed** | Live WebSocket stream — price drops appear in real time |
| **Notification Center** | Full history: what triggered, when delivered, which channel |
| **Preferences Panel** | Switch theme (dark/light), currency, language, timezone |

####  Reseller (Entrepreneur) Dashboard
*Designed for businesses looking to protect their profit margins.*

| Feature | Description |
| :--- | :--- |
| **Catalog Tracker** | Add your products with floor/ceiling price guards |
| **Price History** | Visual chart of your product price evolution over time |
| **Competitor Scanner** | Auto-match competitors, compute price gap per product |
| **Aggressiveness Score** | AI-scored ranking of competitor threat level |
| **Business Analytics** | Margin protection trends and market visibility index |
| **Margin Alerts** | Get notified when a competitor undercuts your floor price |

---

### 3. The Database Schema (PostgreSQL 18 Tables)
The relational data is organized into 18 normalized tables managed via Alembic migrations to ensure strict data integrity.

**Initialize on first run:**
```bash
docker compose exec backend alembic upgrade head
```

####  Module 1 — Identity & Security (5 tables)
- `users`: (id, email, password_hash, full_name, role, is_active, google_sub)
- `user_sessions`: (id, user_id, refresh_token_hash, device_info, ip_address, expires_at)
- `login_attempts`: (id, email, ip_address, was_successful, failure_reason)
- `email_verification_tokens`: (id, user_id, token_hash, is_used, expires_at)
- `password_reset_tokens`: (id, user_id, token_hash, is_used, expires_at)

####  Module 2 — User Preferences (2 tables)
- `alert_preferences`: (id, user_id, price_drop_alerts, email_notifications, websocket_live)
- `display_preferences`: (id, user_id, theme, language, currency, timezone)

####  Module 3 — Shopper Features (4 tables)
- `watchlist_items`: (id, user_id, product_id, product_name, platform, target_price)
- `shopper_alerts`: (id, user_id, watchlist_item_id, condition_type, target_value, status)
- `alert_events`: (id, product_id, product_name, source, old_price, new_price, drop_percent)
- `notification_deliveries`: (id, alert_event_id, user_id, channel, status, failed_reason)

####  Module 4 — Reseller Intelligence (5 tables)
- `seller_products`: (id, user_id, product_name, my_price, min_price_floor, max_price_ceiling)
- `seller_product_price_history`: (id, seller_product_id, old_price, new_price, recorded_at)
- `tracked_competitors`: (id, user_id, seller_name, platform, aggressiveness, competitiveness)
- `tracked_competitor_products`: (id, tracked_competitor_id, seller_product_id, their_price, price_gap)
- `price_alerts`: (id, user_id, seller_product_id, trigger_mode, threshold_value, priority)

####  Module 5 — System & Audit (2 tables)
- `platform_meta_registry`: (id, platform_name, slug, base_url, currency_code, is_scraping_enabled)
- `activity_logs`: (id, user_id, action, entity_type, entity_id, log_metadata)

> **Note:** For exact field types (UUID, Numeric, JSONB, ENUM, etc.), see `app/backend/models/`.

---

# C. DevOps / DataOps

## 10. Orchestration & Infrastructure

### 10.1 Docker Architecture

**13 containers** managed by Docker Compose:

| Container | Role | Dependencies | Health Check |
|-----------|------|-------------|--------------|
| `airflow_postgres` | Airflow metastore | none | `pg_isready` (5s, 10 retries) |
| `app_postgres` | Application DB | none | `pg_isready -U $USER -d $DB` |
| `price_redis` | Cache + broker | none | `redis-cli ping` (5s, 5 retries) |
| `price_scraper` | Scrapy spiders | none | None (interactive bash) |
| `airflow_init` | DB migration | postgres_healthy | Run-once, exits 0 |
| `airflow_webserver` | Airflow UI | airflow_init | `/health` (30s, 5 retries) |
| `airflow_scheduler` | Task scheduling | airflow_init | None (docker.sock access) |
| `price_nifi` | Real-time flow | app_postgres | `/nifi-api/system-diagnostics` (30s, 10 retries, 90s start) |
| `price_backend` | FastAPI API | app_postgres + redis | None (hot-reload) |
| `price_worker` | Background worker | app_postgres + redis | None |
| `price_frontend` | Angular UI | backend | None |
| `price_dbt` | dbt runtime | none | None (`tail -f /dev/null`) |
| `price_dbt_docs` | dbt doc server | none | Waits for `target/index.html` |

```mermaid
flowchart TD
    AP["airflow_postgres<br/>Airflow Metastore"]
    APP["app_postgres<br/>Application DB"]
    RD["price_redis<br/>Cache + Broker"]
    PS["price_scraper<br/>Scrapy Spiders"]
    AI["airflow_init<br/>DB Migration"]
    AW["airflow_webserver<br/>Airflow UI"]
    AS["airflow_scheduler<br/>Task Scheduler"]
    PN["price_nifi<br/>NiFi 1.25.0"]
    PB["price_backend<br/>FastAPI API"]
    PW["price_worker<br/>Alert Worker"]
    PF["price_frontend<br/>Angular UI"]
    PDT["price_dbt<br/>dbt Runtime"]
    PDD["price_dbt_docs<br/>dbt Doc Server"]

    AP --> AI
    AI --> AW
    AI --> AS
    APP --> PN
    APP --> PB
    APP --> PW
    RD --> PB
    RD --> PW
    PB --> PF
    AS -.->|docker exec| PS
    AS -.->|docker exec| PDT
    PDT -.-> PDD
```

### 10.2 Docker Compose Patterns

**YAML Anchors for DRY configs:**
```yaml
x-airflow-env: &airflow-env
  AIRFLOW__CORE__EXECUTOR: LocalExecutor
  AIRFLOW__CORE__FERNET_KEY: ...
  AIRFLOW__DATABASE__SQL_ALCHEMY_CONN: postgresql+psycopg2://airflow:airflow@airflow_postgres:5432/airflow

services:
  airflow-webserver:
    environment: *airflow-env
  airflow-scheduler:
    environment: *airflow-env
```

**Read-only secrets mount:**
```yaml
volumes:
  - ./infrastructure/keys:/opt/gcp_keys:ro  # GCP service account: read-only
```

**Hot-reload development:**
```yaml
volumes:
  - ./app/backend:/app:ro  # Code reload on save
  - /var/run/docker.sock:/var/run/docker.sock  # Docker-in-Docker for Airflow
```

**Frontend node_modules isolation:**
```yaml
volumes:
  - /app/node_modules  # Anonymous volume — prevents host node_modules overwrite
```

### 10.3 Terraform Infrastructure

```hcl
# Bigtable
resource "google_bigtable_instance" "price_intelligence" {
  name = "price-intelligence"
  cluster { cluster_id = "main", zone = "us-central1-a", num_nodes = 1 }
}

resource "google_bigtable_table" "ecommerce_prices" {
  name = "ecommerce_prices"
  column_family { family = "price_cf" }
  column_family { family = "metadata_cf" }
  column_family { family = "ingestion_cf" }
  column_family { family = "availability_cf" }
  column_family { family = "seller_cf" }
  column_family { family = "ratings_cf" }
  column_family { family = "specs_cf" }
  gc_policy = "max_version = 10"
}

# BigQuery
resource "google_bigquery_dataset" "price_intelligence" {
  dataset_id = "price_intelligence"
  location   = "US"
}

# IAM
resource "google_service_account" "data_pipeline" {
  account_id = "data-pipeline-sa"
}
```

---

# D. Data Analysis

## 1. Overview
The Data Analytics infrastructure of the E-Commerce Price Intelligence platform is designed to transform raw, unstructured web-scraped data into statistically significant business insights. 

Rather than relying on isolated scripts, the analytics workflow is deeply integrated into a modern production pipeline. It leverages a robust Data Warehouse (Google BigQuery) for SQL-based heavy lifting, a Python backend (FastAPI) for advanced statistical modeling, and a dynamic frontend (Angular) for visual consumption. 

---

## 2. Data Architecture & Strategy

### 2.1 The ELT Paradigm
The project strictly adheres to the **ELT (Extract, Load, Transform)** architecture. 
* **Extract & Load:** Handled by the Data Engineering team. Python Scrapers extract data and pass it through a Dual-Pipeline (Real-Time streaming via **Apache NiFi** and Batch JSONL loads via **Apache Airflow**). **Both pipelines load directly into Google Bigtable.** From there, Airflow exports the data from Bigtable into **BigQuery** as a flat, denormalized table.
* **Transform:** Handled exclusively by the Data Analytics layer inside BigQuery using **dbt (data build tool)**. This allows the infinitely scalable compute power of the cloud data warehouse to process aggregations.

### 2.2 Bottom-Up Data Modeling (Kimball Methodology)
Instead of attempting a rigid, Enterprise-wide Top-Down (Inmon) design, this project utilizes a **Bottom-Up** approach. We focused on building modular, process-specific **Data Marts** directly on top of integrated data buses. This agile methodology allowed us to deliver specific business KPIs (like Category Trends and Market Baselines) rapidly.

### 2.3 The Schema Structure
The data modeling follows a flattened, denormalized approach tailored for columnar databases (BigQuery), avoiding the extreme complexity of a Snowflake schema in favor of a performant, **Star-Schema-inspired Data Mart** design.

```mermaid
graph TD
    subgraph ELT Strategy
    A[Scrapers] --> B[NiFi Real-Time]
    A --> C[Airflow Batch Load]
    B --> D[(Bigtable)]
    C --> D
    
    D -->|Airflow Export| E[(BigQuery: raw_ecommerce_prices)]
    E --> F[dbt Transformations]
    F --> G[Data Marts]
    end
```

---

## 3. Core Analytics: The dbt Layer
The core data modeling was orchestrated using **dbt (data build tool)**, structured into three distinct layers to ensure modularity and DRY (Don't Repeat Yourself) principles.

### 3.1 dbt Architecture
```mermaid
flowchart LR
    subgraph STAGING
        SB[stg_bestbuy]
        SJ[stg_jumia]
        SN[stg_newegg]
        SP[stg_pc21]
        SU[stg_ultrapc]
        SM[stg_materielnet]
        SAS[stg_all_sources]
    end
    SB & SJ & SN & SP & SU & SM --> SAS

    subgraph CLEANED
        SAS --> CN[int_currency_norm]
        CN --> CP[int_clean_prices]
        CP --> PH[int_price_history]
        CP --> PC2[int_price_changes]
    end

    subgraph MARTS
        %% Marts driven by int_clean_prices
        CP --> PP[mart_platform_performance]
        CP --> CT[mart_category_trends]
        CP --> PA[mart_price_analytics]
        CP --> BC[mart_brand_comparison]
        CP --> PCA[mart_platform_category_avg]
        CP --> PCC[mart_product_correlation_data]
        CP --> CP3[mart_cross_platform]

        %% Marts driven by int_price_history
        PH --> SI[mart_shopper_insights]
        PH --> DA[mart_deal_analysis]
        
        %% Marts driven by int_price_changes
        PC2 --> DP[mart_daily_price_drops]
        
        %% Marts driven by both
        CP --> MK[mart_market_kpis]
        PH --> MK
    end
```

### 3.2 Staging Layer (Bronze — 6 views)
The staging layer extracts data from the flat BigQuery table `raw_ecommerce_prices`. Each source has an identical schema with a source-specific filter. All staging views are then aggregated in `stg_all_sources` using `UNION ALL`.
* **Code Example (`stg_bestbuy.sql`)**:
```sql
SELECT *
FROM {{ source('ecommerce', 'raw_ecommerce_prices') }}
WHERE source = 'bestbuy'
```

### 3.3 Cleaned Layer (Silver — 4 views)
The intermediate layer acts as the centralized bus where business logic is applied. This is where we ensure consistency and quality across the dataset.
* **`int_currency_norm.sql`**: Computes `converted_price_usd` via a fallback chain if null.
* **`int_clean_prices.sql`**: Applies complex filtering (Quality Gate). It performs robust **cross-platform product matching** (e.g., standardizing 'ordinateur portable' to 'laptop'), removes unwanted accessories (like "phone cases"), and implements strict **outlier filtering** by enforcing minimum and maximum price bounds for each category.
* **`int_price_history.sql`**: Generates a daily surrogate key for time-series analytics.

### 3.4 Data Marts (Gold — 11 tables)
The final presentation layer, mathematically aggregated into tables for dashboard-speed queries.
* **`mart_market_kpis`**: Calculates market-wide metrics like 30-day Price Volatility.
* **`mart_category_trends`**: Calculates median prices, quartiles, and descriptive statistics for specific product categories.
* **`mart_product_correlation_data`**: Provides aggregated Price, Rating, and Review intersections.

---

## 4. Advanced Statistical Analytics (Python Engine)
While dbt handles SQL aggregations, the platform leverages a **FastAPI Backend** to perform advanced statistical computations dynamically using Python libraries (`scipy`, `pingouin`, `pandas`).

### 4.1 T-Tests & Hypothesis Testing
When a user inputs their local store's inventory, the API runs a **One-Sample T-Test** against the global market distribution to determine if the user's prices are statistically higher or lower than the competition, returning accurate P-Values.

### 4.2 OLS Regression & Correlation
The API powers cross-variable analytics by calculating the **Pearson Correlation Coefficient** and running Ordinary Least Squares (OLS) regressions to determine if a statistically significant relationship exists between `discount_percent` and `average_rating`.

```mermaid
sequenceDiagram
    participant Frontend
    participant FastAPI
    participant BigQuery
    
    Frontend->>FastAPI: Request Correlation Analysis
    FastAPI->>BigQuery: Fetch mart_product_correlation_data
    BigQuery-->>FastAPI: Return Data
    FastAPI->>FastAPI: Run scipy.stats.pearsonr()
    FastAPI-->>Frontend: Return P-Value & R² Coefficient
```

---

## 5. Visual Analytics & Dashboard Integration
The final step of the analytical lifecycle is visual presentation via the Angular frontend, utilizing modern charting libraries like **Chart.js**.

* **Scatter Plots with Regression Lines:** Visually proves pricing correlations to the user.
* **Time-Series Area Charts:** Displays historical price drops and market volatility over 30 days.
* **Heatmaps & KPI Cards:** Showcases instantaneous market aggregations powered by the specific Data Marts.

---

## 6. Optional Sandbox: Jupyter Notebooks
> ⚠️ **Note to Evaluators:** The core analytics of this platform are fully automated within the ELT pipeline (dbt + FastAPI).

To supplement the production environment, an isolated **Jupyter Notebooks** directory (`/notebooks`) is maintained. This serves as an ad-hoc sandbox for the Data Analytics team. It connects securely to the BigQuery Data Marts to allow for Exploratory Data Analysis (EDA), statistical analysis, and anomaly hunting, prototyping prior to implementing those features into the main backend application.

---

## 7. Overall Analytics Architecture
Below is the comprehensive architecture diagram illustrating how Data Analysis flows through the entire project lifecycle.

```mermaid
graph TD
    %% Data Engineering Layer
    A[Scrapers] -->|JSONL| B(Airflow Batch)
    A -->|Stream| C(NiFi Real-Time)
    B -->|Load| D[(Bigtable)]
    C -->|Load| D
    D -->|Airflow Export| E[(BigQuery: raw_ecommerce_prices)]

    %% Core Analytics Layer
    subgraph Primary Analytics Engine - Data Warehouse
    E -->|dbt: Staging| F[Staging Views]
    F -->|dbt: Intermediate| G[Cleaned Views]
    G -->|dbt: Aggregation| H[Business Data Marts]
    end

    %% Backend Engine
    subgraph Application Backend
    H -->|SQL Fetch| I[FastAPI Backend]
    I -.->|Specific Endpoints| J[SciPy / Pingouin: T-Tests & OLS]
    J -.->|Statistical Results| I
    end

    %% Visual Analytics Layer
    subgraph Production Visuals - Frontend
    I -->|REST API| K[Angular Dashboard]
    K -->|Chart.js| L((Final Interactive Graphs))
    end

    %% Ad-Hoc Analytics Layer (Detached)
    subgraph Optional Sandbox
    H -.->|Ad-hoc querying| M[Jupyter Notebooks]
    M -.->|Prototyping| N[Side-Research / EDA]
    end
```


---

# Cross-Team

## 13. Key Metrics & Performance

### 13.1 Pipeline Performance

| Operation | Duration | Frequency | Data Volume |
|-----------|----------|-----------|-------------|
| Full scraper run (6 sources) | ~20 min | Daily | 7,169 records |
| Bigtable batch write | ~35s | Daily | 13,558 rows |
| Bigtable → BigQuery export | ~30s | Daily | 2,886 new rows |
| dbt run (14 models) | ~30s | Daily | Full refresh |
| dbt test (31 tests) | ~18s | Daily | Full validation |
| End-to-end pipeline | ~22 min | Daily | All stages |

### 13.2 Data Distribution by Source

| Source | Records/Day | Category Coverage | Status |
|--------|-------------|-------------------|--------|
| Jumia.ma | ~365 | 13 of 17 | ✅ Active |
| BestBuy.com | ~1,000 | 12 of 17 | ✅ Active |
| Newegg.com | ~400 | 13 of 17 | ✅ Active |
| UltraPC.ma | ~400 | 11 of 17 | ✅ Active |
| PC21.fr | ~5,200 | 13 of 17 | ✅ Active (fixed: was silently dropped) |
| Materiel.net | 0 | 0 of 17 | ❌ Timeout (site unreachable) |

### 13.3 Cost Estimates

| Service | Estimated Monthly Cost | Purpose |
|---------|----------------------|---------|
| Bigtable (1 node) | ~$0 but free trial more than enough | Primary data store |
| BigQuery (flat rate) | ~$0–5 (within free tier) | Analytics + dbt |
| ExchangeRate-API (free) | $0 | Currency conversion |
| Docker Host | ~$0 (localhost) or ~$50 (VPS) | Pipeline execution |
| **Total** | **~$0–55/month** | |

---

## 14. Architecture Decisions & Trade-Offs

### 14.1 Why Bigtable + BigQuery (Dual Storage)?

| Requirement | Bigtable | BigQuery |
|-------------|----------|----------|
| Real-time writes | ✅ Native row mutations | ❌ Streaming inserts (costly) |
| Point lookups by key | ✅ O(1) | ❌ Table scan |
| Historical analysis | ❌ Limited SQL | ✅ Full SQL + dbt |
| Cost at scale | ✅ Cheap for key-value | ✅ Cheap for storage |

**Decision**: Use Bigtable as the real-time ingestion target (fast writes, key-based lookups) and BigQuery as the analytics target (SQL, joins, aggregations). The DAG bridges both worlds.

### 14.2 Why NiFi + Airflow (Dual Orchestration)?

| Characteristic | NiFi | Airflow |
|---------------|------|---------|
| UI-first flow design | ✅ Visual canvas | ❌ Code-only |
| Real-time streaming | ✅ ListenHTTP, polling | ❌ Batch-oriented |
| Error recovery | ✅ Built-in retry/backpressure | ✅ Retries + DAG rerun |
| Data transformation | ❌ Limited (ExecuteScript) | ✅ Python operators |
| Monitoring | ✅ Provenance, data lineage | ✅ Logs, metrics, SLA |

**Decision**: NiFi handles the real-time ingestion path (scraper → Bigtable). Airflow handles the batch transformation path (Bigtable → BigQuery → dbt → API). They converge at Bigtable.

### 14.3 Why dbt for Transformation?

- **Declarative SQL** — Analysts can contribute without Python
- **Testing framework** — 31 built-in tests without custom code
- **Documentation generation** — Auto-generated lineage graphs
- **Incremental models** — Ready for scale (though current setup uses full refresh)
- **Package ecosystem** — `dbt_utils` for surrogate keys, `dbt_expectations` for ranged checks

### 14.4 Why `requests` + `BeautifulSoup4` Instead of Scrapy?

While Scrapy was installed and available, the team chose raw `requests` + BS4 for:
- **Simpler debugging** — No async reactor to manage
- **Granular control** — Custom retry logic, cookie handling, rate limiting
- **Faster iteration** — No need to write Scrapy middlewares and pipelines for simple scraping
- **Trade-off**: No built-in concurrency (Scrapy's async engine could scrape 3× faster), but at current volumes (~7k records/day), the difference is negligible (~20 min vs ~7 min per run)

---

## 15. Conclusion

PulsePrice is a **production-grade, end-to-end price intelligence platform** that demonstrates mastery of:

- **Cloud-native data engineering**: Bigtable, BigQuery, dbt, Airflow, Terraform
- **Real-time + batch hybrid architectures**: NiFi streaming + Airflow daily batch
- **Data quality as code**: 31 automated dbt tests, inline cleaning filters, Pydantic validation
- **Scientific computing in production**: Welch's T-Test, Pearson correlation, OLS regression on live data
- **Full-stack integration**: Angular dashboard → FastAPI → Redis → dbt → BigQuery → Bigtable
- **Infrastructure as code**: 13 Docker containers, Terraform for GCP, Prometheus for monitoring

The pipeline collects **~7,000 price records daily** across **6 e-commerce platforms** and **17 product categories**, transforms them through **14 dbt models**, passes **31 automated quality tests**, and serves them through **18 analytics endpoints** to a **real-time Angular dashboard** with **WebSocket push notifications** — all orchestrated by **4 Airflow DAGs** and **1 NiFi flow** running in **13 Docker containers** on **Google Cloud Platform**.

---

## Contributing

To contribute to this project, please read [CONTRIBUTING.md](./CONTRIBUTING.md). It contains the branching strategy, commit message guidelines, pull request workflow, folder ownership rules, and documentation update policies.

---

## License

This project is licensed under the **MIT License**.
See [LICENSE](./LICENSE) for the full license text.
