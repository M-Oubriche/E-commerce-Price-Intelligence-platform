# How to Run the Project

> **IMPORTANT**: The complete academic project report, architecture details, and team contributions can be found in **[report_price_intelligence.md](./report_price_intelligence.md)**. This document only contains the instructions to run the application locally.

## Prerequisites

Before running this project locally, make sure you have:
- Git
- Docker Desktop (with Docker Compose v2+)
- A free API key from [exchangerate-api.com](https://exchangerate-api.com) *(To convert any scraped price to USD automatically)*

## Getting Started Locally

### 1. Clone the repository
```bash
git clone https://github.com/M-Oubriche/E-commerce-Price-Intelligence-platform.git
cd E-commerce-Price-Intelligence-platform
```

### 2. Configure Environment Variables
Create a local `.env` file from the template:
```bash
cp .env.example .env
```
Then open `.env` and fill in your real values for the following essential configurations:

**Scraper & External APIs:**
- `EXCHANGE_RATE_API_KEY` → your free key from exchangerate-api.com

**Security & Database Credentials:**
- `POSTGRES_PASSWORD`, `APP_POSTGRES_PASSWORD` → set strong passwords for the Airflow and App databases.
- `SECRET_KEY` → set a secure random string for the backend API.

**Airflow Configuration:**
- `AIRFLOW_FERNET_KEY` → generate a secure fernet key to encrypt metadata. *(e.g., run `python -c "import base64; import os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"`)*
- `AIRFLOW_SECRET_KEY` → secure session key.
- `AIRFLOW_ADMIN_PASSWORD` → your login password for the Airflow UI.

**NiFi Configuration:**
- `NIFI_PASSWORD` → your login password for the NiFi UI *(must be at least 12 characters)*.

**GCP & Data Storage (Bigtable/BigQuery):**
- `BIGTABLE_PROJECT_ID` & `BIGTABLE_INSTANCE_ID` → your GCP project and Bigtable instance names.
- `BIGQUERY_PROJECT_ID` & `BIGQUERY_DATASET` → your GCP project and BigQuery dataset names.
- **Service Account Keys:** Download your JSON keys and place them in the `./infrastructure/keys/` directory on your host machine. They are automatically mapped via the `BIGQUERY_KEY_PATH` and `TERRAFORM_KEY_PATH` variables.

**Full Stack Integrations (Optional but recommended):**
- `BREVO_API_KEY` → your Brevo API key for sending email notifications.
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` → your Google OAuth credentials for user login.

### 3. Build & Run the Platform
This project is orchestrated entirely via Docker Compose.

To build all 13 containers (first build takes ~5-10 minutes):
```bash
docker compose build
```

To start the entire platform in the background:
```bash
docker compose up -d
```

### 4. Verify the Services

Once started, the platform exposes the following interfaces:
- **Frontend Dashboard (Angular)**: [http://localhost:4200](http://localhost:4200)
- **Backend API Docs (FastAPI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Airflow UI**: [http://localhost:8081](http://localhost:8081)
- **dbt Documentation**: [http://localhost:8085](http://localhost:8085)

### 5. Initialize the Database
On the first run, initialize the PostgreSQL database schema for the backend:
```bash
docker compose exec backend alembic upgrade head
```

### 6. Run the Scrapers Manually (Optional)
Airflow handles this daily, but to run the scraping engine manually right now:
```bash
docker compose run scraper
```
*(Scraped data will be downloaded to your local `./data/raw/` folder)*

### 7. Stopping the Platform
To shut down the platform safely:
```bash
docker compose down
```
*(Use `docker compose down -v` if you want to also destroy the database volumes)*
