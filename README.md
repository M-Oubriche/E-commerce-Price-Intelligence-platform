# 🛒 PulsePrice — E-Commerce Price Intelligence Platform

> A production-grade, hybrid **batch + streaming** data platform that monitors prices across 6 e-commerce platforms in real time, detects market opportunities, and delivers actionable intelligence through an interactive dual-role dashboard.

[![CI Pipeline](https://img.shields.io/badge/CI%20Pipeline-Passing-success?logo=githubactions&logoColor=white)](https://github.com/M-Oubriche/E-commerce-Price-Intelligence-platform/actions/workflows/ci.yml)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-17+-DD0031?logo=angular&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)
![dbt](https://img.shields.io/badge/dbt-1.8-FF694B?logo=dbt&logoColor=white)
![GCP](https://img.shields.io/badge/GCP-Bigtable%20%7C%20BigQuery-4285F4?logo=googlecloud&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-22C55E)

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [System Architecture](#-system-architecture)
- [Team Contributions](#-team-contributions)
  - [🔧 DataOps & DevOps](#-dataops--devops)
  - [🔄 Data Engineering](#-data-engineering)
  - [📊 Data Analytics](#-data-analytics)
  - [🖥️ Full Stack](#-full-stack)
- [Getting Started](#-getting-started)
- [Repository Structure](#-repository-structure)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Project Overview

**PulsePrice** is a complete end-to-end data platform built to solve a real business problem: tracking and analyzing e-commerce price fluctuations at scale, and turning raw scraped data into business decisions.

| For **Shoppers** | For **Resellers** |
|---|---|
| Track products across 6 platforms | Monitor competitor pricing in real time |
| Set target price alerts | Protect margins with floor/ceiling guards |
| Receive instant WebSocket notifications | Analyze competitor aggressiveness scores |
| View full price drop history | Access business analytics and trend reports |

| Metric | Value |
|---|---|
| Platforms scraped | **6** (BestBuy, Jumia, Newegg, PC21, Materiel.net, UltraPC) |
| Database tables | **18** across 5 functional modules |
| CI/CD pipeline stages | **7** automated quality gates |
| REST API endpoints | **30+** plus WebSocket |
| dbt transformation layers | **3** — staging → cleaned → aggregated |

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      DATA SOURCES                        │
│       BestBuy · Jumia · Newegg · PC21                   │
│              Materiel.net · UltraPC                      │
└─────────────────────┬────────────────────────────────────┘
                      │  Scrapy + Selenium + BeautifulSoup
                      ▼
┌──────────────────────────────────────────────────────────┐
│             STREAMING INGESTION — Apache NiFi            │
│         Flow routing · Transformation · Fan-out          │
└──────────┬───────────────────────────┬───────────────────┘
           │                           │
           ▼                           ▼
┌──────────────────┐       ┌───────────────────────┐
│  Google Bigtable │       │    Apache Airflow      │
│  Raw time-series │──────▶│  Batch Orchestration   │
└──────────────────┘       └───────────┬────────────┘
                                       │
                                       ▼
                           ┌───────────────────────┐
                           │    Google BigQuery     │
                           │   Analytical Store     │
                           └───────────┬────────────┘
                                       │  dbt
                                       ▼
                           ┌───────────────────────┐
                           │  staging → cleaned     │
                           │      → aggregated      │
                           └──────┬────────┬────────┘
                                  │        │
                    ┌─────────────┘        └──────────────┐
                    ▼                                      ▼
      ┌─────────────────────────┐         ┌───────────────────────────┐
      │     Analytics Layer     │         │      Dashboard Layer       │
      │  Pandas · SciPy · Plotly│         │ FastAPI · Angular 17+      │
      │  statsmodels · dbt      │         │ PostgreSQL · Redis · WS    │
      └─────────────────────────┘         └───────────────────────────┘
```

---

## 👥 Team Contributions

---

## 🔧 DataOps & DevOps

> **Scope:** The infrastructure backbone of the entire project. Responsible for making every service run reliably — locally and in production — and for enforcing code quality and security on every single commit.

### 1. Containerization — Docker Compose

Designed and maintained the full multi-service Docker Compose stack. Every developer on the team can spin up the entire platform with **one command**:

```bash
docker compose up -d
```

| Service | Container | Port |
|---|---|---|
| Application Database | `app_postgres` (PostgreSQL) | `5432` |
| Airflow Metadata DB | `postgres` | `5433` |
| Cache & Pub/Sub Bus | `redis` | `6379` |
| FastAPI Backend | `backend` | `8000` |
| Angular Frontend | `frontend` | `4200` |
| Airflow Webserver | `airflow-webserver` | `8080` |
| Airflow Scheduler | `airflow-scheduler` | — |
| Apache NiFi | `nifi` | `8443` |
| Prometheus | `prometheus` | `9090` |
| Grafana | `grafana` | `3000` |
| dbt | `dbt` | — |

Key decisions:
- **Hot-reload** enabled on both backend (volume mount) and frontend (`--poll 2000`) across Docker volumes
- **Airflow Init** container validates DB migrations before the webserver starts, preventing silent failures
- **NiFi excluded** from the CI integration test to prevent GitHub Runner out-of-memory kills

### 2. CI/CD Pipeline — 7-Stage GitHub Actions

Built a complete automated quality gate. **No PR can be merged unless every stage passes.** The pipeline runs on every push to every branch, and every pull request targeting `main`.

```
  Every push / pull_request
           │
           ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │                     PARALLEL QUALITY CHECKS                        │
  ├───────────────┬───────────────┬──────────────────┬─────────────────┤
  │   Stage 1     │   Stage 2     │    Stage 3       │    Stage 4      │
  │  Lint &       │    SAST       │   Secrets        │  Dependency     │
  │  Syntax       │  Bandit +     │   Scanning       │    Audit        │
  │  Flake8       │   Trivy       │  TruffleHog      │  pip + npm      │
  └───────┬───────┴───────┬───────┴────────┬─────────┴────────┬────────┘
          │               │                │                   │
          └───────────────┴────────────────┴───────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
          ┌─────────▼──────────┐       ┌────────────▼──────────────┐
          │      Stage 5       │       │         Stage 6            │
          │   Frontend Build   │       │  Logic & Pipeline Checks   │
          │  Angular prod      │       │  pytest  ·  Airflow DAGs   │
          │  compilation       │       │        ·  dbt parse        │
          └─────────┬──────────┘       └────────────┬──────────────┘
                    └───────────────┬───────────────┘
                                    │
                         ┌──────────▼──────────┐
                         │      Stage 7        │
                         │ Docker Integration  │  ← PR & main only
                         │  Bake · Health      │
                         │  Checks · Teardown  │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │   ✅ Merge Gate      │
                         │   PASS = merge ok   │
                         │   FAIL = blocked    │
                         └─────────────────────┘
```

**Engineering highlights:**
- Concurrency control — previous runs on the same branch are auto-cancelled on new push
- All secrets injected via GitHub Secrets — zero hardcoded credentials anywhere
- Isolated Python virtual environments for Airflow and dbt to prevent dependency conflicts
- Docker Bake caches layers per-service using GitHub Actions cache backend

### 3. Cloud Infrastructure — Terraform + GCP

Provisioned all cloud resources using **Infrastructure as Code** — no manual console clicks.

```bash
cd infrastructure/terraform
terraform init
terraform plan -var-file="terraform.tfvars"
terraform apply -var-file="terraform.tfvars"
```

| GCP Resource | Purpose |
|---|---|
| **Google Cloud Bigtable** | Raw time-series price storage (hot path) |
| **Google BigQuery** | Long-term analytical warehouse (dbt target) |
| **Google Kubernetes Engine** | Production container orchestration |
| **GCS Remote State** | Terraform state backend |
| **GCP Secret Manager** | Secure secrets storage in production |

### 4. Monitoring & Observability

Pre-provisioned Grafana dashboards and Prometheus scrape configs cover the full stack.

| Tool | URL | Coverage |
|---|---|---|
| **Prometheus** | `http://localhost:9090` | Metrics collection and storage |
| **Grafana** | `http://localhost:3000` | Dashboards: containers, API latency, DAG rates, Redis |

> Dashboard JSON configs live in `infrastructure/monitoring/grafana/` and are auto-loaded on startup.

---

## 🔄 Data Engineering

> **Scope:** The data collection and movement layer. Responsible for extracting price data from 6 e-commerce platforms, routing it through NiFi, storing it in Bigtable, exporting it to BigQuery, and orchestrating the full pipeline with Airflow.

### 1. Web Scrapers — 6 Platform Spiders

Built with **Scrapy** (base framework), **BeautifulSoup** (HTML parsing), and **Selenium** (for JavaScript-rendered pages). Each spider handles platform-specific anti-scraping measures, pagination, and data normalization.

| Spider | Platform | Scraping Method | Notes |
|---|---|---|---|
| `bestbuy` | Best Buy | Scrapy | US tech retailer |
| `jumia` | Jumia | Scrapy | African market coverage |
| `newegg` | Newegg | Scrapy | Tech-focused retailer |
| `pc21` | PC21 | Scrapy | Algerian market coverage |
| `materielnet` | Materiel.net | Scrapy | French tech retailer |
| `ultrapc` | UltraPC | Scrapy | Specialist PC retailer |

**Each spider extracts:** product name, price, currency, platform, URL, timestamp, availability.

All output is validated through **Pydantic models** before leaving the scraper layer.

```bash
# Trigger a full scraping run
docker compose run scraper

# Output lands in:
data/raw/
```

### 2. Streaming Ingestion — Apache NiFi

NiFi acts as the **data highway** between scrapers and storage, handling real-time routing, transformation, fan-out, and dead-letter management for failed records.

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │                    Data Ingestion Pipeline                           │
  └──────────────────────────────────────────────────────────────────────┘

  ┌─────────────────┐   Pydantic    ┌──────────────────────────────────┐
  │  Scrapy Spider  │──────────────▶│          Apache NiFi             │
  │  (6 platforms)  │   validated   │     Flow-based data routing      │
  └─────────────────┘               └───────────────┬──────────────────┘
                                                     │
                               ┌─────────────────────┤
                               │                     │
                               ▼                     ▼
               ┌───────────────────────┐   ┌─────────────────────────┐
               │   Google Bigtable     │   │    Apache Airflow        │
               │   Raw time-series     │   │    Batch scheduler       │
               │   (hot store)         │   └───────────┬─────────────┘
               └───────────────────────┘               │ @daily export
                                                       ▼
                                           ┌───────────────────────┐
                                           │   Google BigQuery     │
                                           │  Analytical warehouse │
                                           │  (dbt target)         │
                                           └───────────────────────┘
```

Access the NiFi UI at `https://localhost:8443/nifi`.

### 3. Batch Orchestration — Apache Airflow

Four DAGs manage the full data lifecycle on a scheduled basis:

| DAG | Schedule | What It Does |
|---|---|---|
| `health_check` | `@hourly` | Pings all services, logs status, alerts on failure |
| `init_bigtable_schema` | Manual (once) | Creates Bigtable instance, tables, and column families |
| `ingest_ecommerce_prices` | `@daily` | Triggers scrapers and loads validated data |
| `bigtable_to_bigquery` | `@daily` | Exports Bigtable rows into BigQuery for analytics |

```
  ┌────────────────────────────────────────────────────────────────────┐
  │                     Airflow DAG Schedule                          │
  └────────────────────────────────────────────────────────────────────┘

  On deploy (once)
  ────────────────▶  [init_bigtable_schema]  ──▶  Bigtable ready ✓

  Every hour
  ────────────────▶  [health_check]          ──▶  All services OK ?
                                                       │
                                                 ✅ log / ❌ alert

  Every day
  ────────────────▶  [ingest_ecommerce_prices]
                           │
                           ├──▶  Trigger 6 scrapers
                           └──▶  Load into Bigtable
                                       │
  ──────────────────────────────────── │
                           ┌───────────▼────────────┐
  After ingest  ─────────▶ │ bigtable_to_bigquery   │
                           │ Export rows to BigQuery │
                           └───────────┬────────────┘
                                       │
                                       ▼
                              dbt picks up from here
```

Access the Airflow UI at `http://localhost:8080`.

### 4. Storage — Google Cloud Bigtable

Bigtable serves as the **hot store** for raw time-series price data, optimized for high-throughput writes and low-latency reads by timestamp and product key.

- Schema designed for time-series access patterns
- Column families organized by data category (price, metadata, source)
- Initialization automated via the `init_bigtable_schema` DAG

---

## 📊 Data Analytics

> **Scope:** Transforming raw data into clean, structured, analytics-ready datasets and extracting market intelligence. Responsible for the full dbt transformation pipeline, statistical analysis, and data visualizations.

### 1. Data Transformation — dbt (3 Layers)

Transforms raw BigQuery data (exported from Bigtable by Airflow) into clean, business-ready models through three progressive layers.

```
  ┌───────────────────────────────────────────────────────────────────────────┐
  │                        dbt Transformation Pipeline                        │
  └───────────────────────────────────────────────────────────────────────────┘

   [ Raw Data in BigQuery ] ──(from Airflow)──┐
                                              │
  ┌───────────────────────────────────────────▼───────────────────────────────┐
  │ 1️⃣ STAGING LAYER         stg_raw_prices.sql                              │
  │                         · Cast data types & rename fields                 │
  │                         · Filter out malformed/null records               │
  │                         · Assert source freshness                         │
  └───────────────────────────────────────────┬───────────────────────────────┘
                                              │
  ┌───────────────────────────────────────────▼───────────────────────────────┐
  │ 2️⃣ CLEANED LAYER         cleaned_prices.sql                              │
  │                         · Deduplicate scraped records                     │
  │                         · Normalize all currencies to USD                 │
  │                         · Standardize platform name slugs                 │
  └───────────────────────────────────────────┬───────────────────────────────┘
                                              │
  ┌───────────────────────────────────────────▼───────────────────────────────┐
  │ 3️⃣ AGGREGATED LAYER                                                      │
  │                                                                           │
  │  agg_price_history.sql        → Daily min/max/avg per product/platform    │
  │  agg_competitor_analysis.sql  → Price gaps + aggressiveness score         │
  │  agg_market_overview.sql      → Floor/ceiling/volatility index            │
  └───────────────────────────────────────────┬───────────────────────────────┘
                                              │
                                   [ Analytics Layer ]
```

```bash
cd dbt
dbt deps     # Install packages (dbt-utils)
dbt parse    # Validate all models and YAML schemas
dbt run      # Execute the full transformation pipeline
dbt test     # Run data quality and integrity tests
```

dbt schema tests cover: not_null, unique, accepted_values, referential integrity, and custom price range validators.

### 2. Statistical Analysis

Built a complete statistical analysis layer on top of the aggregated dbt models using **Python**, **Pandas**, **SciPy**, and **statsmodels**.

| Analysis | Technique | Purpose |
|---|---|---|
| Descriptive Statistics | Mean, median, std dev, IQR | Baseline price profiling per product |
| Price Trend Detection | Rolling averages, seasonal decomposition | Identify rising/falling trends |
| Competitor Benchmarking | Price-gap calculation, percentile ranking | Rank platforms by price competitiveness |
| Anomaly Detection | Z-score + IQR-based flagging | Catch data errors and flash sales |
| Margin Estimation | Floor/ceiling tracking vs. seller price | Protect reseller profitability |
| Price Volatility Index | Standard deviation over rolling window | Identify high-risk product categories |

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │                    Analytics & Visualization Flow                    │
  └──────────────────────────────────────────────────────────────────────┘
  
   dbt Aggregated       DataFrames           Statistical         Interactive
      Models          (Pandas/SciPy)           Models              Dashboards
  ┌────────────┐      ┌────────────┐      ┌────────────┐      ┌────────────┐
  │ BigQuery   │─────▶│  Python    │─────▶│  SciPy     │─────▶│  Plotly    │
  │ Datasets   │      │  Notebooks │      │ statsmodels│      │  Charts    │
  └────────────┘      └────────────┘      └────────────┘      └────────────┘
```

### 3. Visualizations — Plotly

Interactive charts generated from the analytical models:

- **Price evolution charts** — per product and platform over time
- **Competitor price comparison** — ranked bar charts with gap indicators
- **Market heatmaps** — price distribution across platforms
- **Volatility dashboards** — price stability scoring per category

### 4. Data Specification & Schema Design

- Authored the full **Data Model Specification** (`Data Model Specification.md`) — the single source of truth for all data fields, types, and business rules across the platform
- Defined the **BigQuery dataset schema** (`bigquery_schema.json`) — field types, modes, and descriptions for all BigQuery tables
- Established data contracts between the scraper output and the dbt staging layer

> Notebooks are in `analytics/notebooks/` and run against the BigQuery dataset.

---

## 🖥️ Full Stack

> **Scope:** The user-facing layer of the platform. Responsible for the FastAPI backend (API design, authentication, real-time), the Angular 17+ frontend (dual-role dashboards), the PostgreSQL database schema (18 tables), and the complete real-time notification system.

```
  ┌───────────────────────────────────────────────────────────────────────┐
  │                      Full Stack Architecture                          │
  └───────────────────────────────────────────────────────────────────────┘

   Browser (Angular 17+)
   ┌─────────────────────────────────────────┐
   │  Shopper Dashboard │ Reseller Dashboard  │
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

### 1. Backend — FastAPI

High-performance, fully async API built with **FastAPI**, **SQLAlchemy** (async), **Alembic**, and **Redis**.

```bash
docker compose up backend -d
# Interactive docs → http://localhost:8000/docs
```

#### Complete API Reference

| Module | Method | Endpoint | Description |
|---|---|---|---|
| **Auth** | `POST` | `/api/v1/auth/register` | Register new user (client or reseller) |
| | `POST` | `/api/v1/auth/login` | Login, receive access + refresh tokens |
| | `POST` | `/api/v1/auth/logout` | Server-side session invalidation |
| | `POST` | `/api/v1/auth/refresh` | Rotate access token silently |
| | `POST` | `/api/v1/auth/google` | Google OAuth2 popup login |
| | `POST` | `/api/v1/auth/verify-email` | Confirm email address |
| | `POST` | `/api/v1/auth/request-password-reset` | Send reset link via email |
| | `POST` | `/api/v1/auth/reset-password` | Apply new password with token |
| **Users** | `GET` | `/api/v1/users/me` | Get authenticated user profile |
| | `PUT` | `/api/v1/users/me` | Update profile fields |
| **Preferences** | `GET` | `/api/v1/preferences/` | Get display & alert preferences |
| | `PUT` | `/api/v1/preferences/` | Update theme, currency, language, timezone |
| **Watchlist** | `GET` | `/api/v1/watchlist/` | List all tracked products |
| | `POST` | `/api/v1/watchlist/` | Add product to watchlist |
| | `PUT` | `/api/v1/watchlist/{id}` | Update target price |
| | `DELETE` | `/api/v1/watchlist/{id}` | Remove tracked product |
| **Shopper Alerts** | `GET` | `/api/v1/shopper-alerts/` | List configured alerts |
| | `POST` | `/api/v1/shopper-alerts/` | Create alert with condition + threshold |
| | `PATCH` | `/api/v1/shopper-alerts/{id}` | Update or pause alert |
| | `DELETE` | `/api/v1/shopper-alerts/{id}` | Delete alert |
| **Reseller** | `GET/POST` | `/api/v1/reseller/products` | Manage personal product catalog |
| | `PUT/DELETE` | `/api/v1/reseller/products/{id}` | Update or remove product |
| | `GET/POST` | `/api/v1/reseller/competitors` | Track competitor sellers |
| | `GET` | `/api/v1/reseller/price-alerts` | Reseller margin breach alerts |
| **Analytics** | `GET` | `/api/v1/analytics/price-history` | Historical price trend data |
| | `GET` | `/api/v1/analytics/market-overview` | Platform-wide statistics |
| | `GET` | `/api/v1/analytics/competitor-analysis` | Price-gap breakdown per product |
| **Notifications** | `GET` | `/api/v1/notifications/` | Full notification delivery history |
| **Activity Logs** | `GET` | `/api/v1/activity-logs/` | User action audit trail |
| **WebSocket** | `WS` | `/api/v1/ws/{user_id}` | Real-time price drop stream |
| **Health** | `GET` | `/health` | API liveness check |

#### Security Architecture

| Layer | Implementation |
|---|---|
| **Access Tokens** | JWT, 15-minute expiry, signed with secret key |
| **Refresh Tokens** | 30-day lifetime, stored **hashed** in DB, rotated on use |
| **Session Tracking** | `user_sessions` table logs device, IP, expiry per token |
| **Rate Limiting** | Redis-backed — 100 req/min general, 10 req/min on auth endpoints |
| **Password Reset** | Time-limited tokens (hashed), single-use, auto-purged |
| **Email Verification** | Token-gated account activation |
| **Google OAuth2** | Full popup-based OAuth2 flow with `google_sub` binding |
| **CORS** | Restricted to known origins (`localhost:4200`, `localhost:80`) |
| **Token Cleanup** | Background async task purges expired/used tokens every hour |

#### Background Workers

Two async background tasks run on startup:

- **Redis Notification Subscriber** — listens to `notifications:*` pub/sub channel, pushes incoming events to the correct user's WebSocket connection in real time
- **Expired Token Cleanup** — runs every hour, deletes expired and already-used verification and reset tokens from the database

### 2. Frontend — Angular 17+

```bash
docker compose up frontend -d
# Access → http://localhost:4200
```

Two fully separate dashboard layouts — one per user role:

#### 🛍️ Shopper (Client) Dashboard

| Feature | Description |
|---|---|
| **Price Watcher** | Track any product across all 9 platforms, set target price |
| **Smart Alerts** | Configure alert conditions (below target, drop %, availability) |
| **Deal Feed** | Live WebSocket stream — price drops appear in real time |
| **Notification Center** | Full history: what triggered, when delivered, which channel |
| **Preferences Panel** | Switch theme (dark/light), currency, language, timezone |

#### 🏪 Reseller (Entrepreneur) Dashboard

| Feature | Description |
|---|---|
| **Catalog Tracker** | Add your products with floor/ceiling price guards |
| **Price History** | Visual chart of your product price evolution over time |
| **Competitor Scanner** | Auto-match competitors, compute price gap per product |
| **Aggressiveness Score** | AI-scored ranking of competitor threat level |
| **Business Analytics** | Margin protection trends and market visibility index |
| **Margin Alerts** | Get notified when a competitor undercuts your floor price |

### 3. Database Schema — PostgreSQL (18 Tables)

Initialize on first run:
```bash
docker compose exec backend alembic upgrade head
```

![PulsePrice Database ERD](./database_erd.png)

**Module 1 — Identity & Security** (5 tables)

| Table | Purpose |
|---|---|
| `users` | Core identity — email, password hash, role, Google OAuth sub |
| `user_sessions` | Active refresh tokens — device info, IP, expiry |
| `login_attempts` | Brute-force audit log per email/IP |
| `email_verification_tokens` | Single-use, time-limited activation tokens |
| `password_reset_tokens` | Single-use, time-limited reset tokens |

**Module 2 — User Preferences** (2 tables)

| Table | Purpose |
|---|---|
| `alert_preferences` | Per-user notification channel settings |
| `display_preferences` | Theme, language, currency, timezone |

**Module 3 — Shopper Features** (4 tables)

| Table | Purpose |
|---|---|
| `watchlist_items` | Products tracked per user with target price |
| `shopper_alerts` | Alert rules: condition type, threshold, status |
| `alert_events` | Detected price events: old/new price, drop % |
| `notification_deliveries` | Delivery log: channel, status, failure reason |

**Module 4 — Reseller Intelligence** (5 tables)

| Table | Purpose |
|---|---|
| `seller_products` | User's own catalog with floor/ceiling guards |
| `seller_product_price_history` | Price change audit per seller product |
| `tracked_competitors` | Competitor profiles with aggressiveness score |
| `tracked_competitor_products` | Matched competitor items with price gap |
| `price_alerts` | Reseller margin breach alert rules |

**Module 5 — System & Audit** (2 tables)

| Table | Purpose |
|---|---|
| `platform_meta_registry` | Platform registry: slug, base URL, currency, scraping flag |
| `activity_logs` | Full user action audit trail with metadata |

> For exact field types (UUID, Numeric, JSONB, ENUM, etc.), see `app/backend/models/`.

---

## 🚀 Getting Started

### Prerequisites

| Tool | Notes |
|---|---|
| **Git** | Any version |
| **Docker Desktop** | Compose v2+ required |
| **ExchangeRate API Key** | Free from [exchangerate-api.com](https://exchangerate-api.com) — auto-converts prices to USD |
| **GCP Account** | Required for Bigtable / BigQuery cloud deployment |

### Setup

**Step 1 — Clone**
```bash
git clone https://github.com/M-Oubriche/E-commerce-Price-Intelligence-platform.git
cd E-commerce-Price-Intelligence-platform
```

**Step 2 — Configure environment**
```bash
cp .env.example .env
# Fill in: EXCHANGE_RATE_API_KEY, SECRET_KEY, APP_POSTGRES_PASSWORD, AIRFLOW_FERNET_KEY
```

**Step 3 — Start all services**
```bash
docker compose up -d
# First build: 5–10 min (Chrome for Selenium is large — this is expected)
```

**Step 4 — Initialize the database**
```bash
docker compose exec backend alembic upgrade head
```

All services are now running. Refer to the [DataOps section](#1-containerization--docker-compose) for the full port reference.

---

## 📁 Repository Structure

```
PulsePrice/
│
├── .github/workflows/ci.yml        # 7-stage CI/CD pipeline
│
├── app/
│   ├── backend/                    # FastAPI application
│   │   ├── api/v1/endpoints/       # All route handlers
│   │   ├── core/                   # DB, Redis, rate limiting, config
│   │   ├── models/                 # SQLAlchemy ORM (18 tables)
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   ├── services/               # Business logic layer
│   │   ├── worker/                 # Background async workers
│   │   └── alembic/                # Database migration scripts
│   └── frontend/                   # Angular 17+ application
│       └── src/app/                # Components, guards, services, layouts
│
├── scrapers/
│   └── ecommerce_scraper/spiders/  # 9 platform-specific Scrapy spiders
│
├── airflow/dags/                   # Orchestration DAGs
│
├── dbt/models/                     # staging/ → cleaned/ → aggregated/
│
├── analytics/notebooks/            # Statistical analysis notebooks
│
├── infrastructure/
│   ├── terraform/                  # GCP IaC (Bigtable, BigQuery, GKE)
│   └── monitoring/                 # Prometheus + Grafana configs
│
├── nifi/                           # NiFi flow templates
├── tests/                          # Global test suite
├── docker-compose.yml              # Full local stack definition
├── Data Model Specification.md     # Data contracts and field definitions
└── .env.example                    # Environment variables template
```

> For folder ownership per role, see [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## 🤝 Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before making any changes. It covers branching strategy (GitFlow), commit message format (Conventional Commits), PR workflow, folder ownership per role, and secrets handling.

---

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](./LICENSE) for details.

---

*Built with ❤️ by the PulsePrice Team — DataOps & DevOps · Data Engineering · Data Analytics · Full Stack*
