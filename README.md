# E-commerce-Price-Intelligence-platform

A production-grade hybrid batch + streaming data platform for real-time e-commerce price monitoring and advanced analytics.

---

## Project Status

| Phase                                       | Status          | Date       |
| ------------------------------------------- | --------------- | ---------- |
| Phase 1: Project Setup & Infrastructure     | Complete        | 03-03-2026 |
| Phase 2: Local Environment (Docker Compose) | In Progress ... | —          |

---

## Architecture Overview

> Architecture diagram will be added here once the infrastructure phase is complete.

---

## Tech Stack

| Layer               | Technology                            |
| ------------------- | ------------------------------------- |
| Scraping            | Scrapy, BeautifulSoup, Selenium       |
| Streaming Ingestion | Apache NiFi                           |
| Batch Orchestration | Apache Airflow                        |
| Storage             | Google Cloud Bigtable                 |
| Transformation      | dbt                                   |
| Analytics           | Python, Pandas, SciPy, statsmodels    |
| Dashboard           | Angular (frontend), FastAPI (backend) |
| Visualization       | Plotly                                |
| Infrastructure      | Docker, Kubernetes, Terraform, GCP    |
| Monitoring          | Prometheus, Grafana                   |
| CI/CD               | GitHub Actions                        |

---

## Repository Structure

```
price-intelligence-platform/
│
├── .github/workflows/        # CI/CD pipelines
├── docker/Dockerfiles/       # One Dockerfile per service
├── airflow/                  # DAGs and plugins
├── nifi/                     # Flow templates and configs
├── dbt/                      # Models, tests, macros
├── scrapers/                 # Scraping logic
├── analytics/                # Notebooks and reports
├── app/                      # Frontend (Angular) + Backend (FastAPI)
├── infrastructure/           # Terraform, Monitoring, Scripts
├── tests/                    # Global tests
├── docker-compose.yml        # Local environment
└── .env.example              # Environment variables template
```

> For folder ownership per role, see [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## Prerequisites

> This section will be updated as each service is configured.

Before running this project locally, make sure you have:

- [ ] Git
- [ ] Docker Desktop (with Docker Compose)
- [ ] A GCP account _(required for Bigtable deployment)_

---

## Getting Started Locally

> Step-by-step local setup instructions will be added here once Docker Compose is configured (Phase 2).

---

## Deployment

> GCP deployment instructions will be added here once Terraform is configured (Phase 4).

---

## Monitoring & Observability

> Grafana dashboard access and Prometheus setup will be documented here (Phase 5).

---

## Pipeline Overview

> **Owner: Data Engineering**
> This section will be filled once scrapers, NiFi flows, Airflow DAGs, and dbt models are working.

<!--
When ready, document:
- How the scraper runs and what it collects
- NiFi flow description and routing logic
- Airflow DAGs names, schedule, and dependencies
- dbt models: staging → cleaned → aggregated
-->

---

## Analytics & Statistics

> **Owner: Data Analysis**
> This section will be filled once notebooks and reports are working.

<!--
When ready, document:
- What statistical analysis is performed (descriptive + inferential)
- How to run the notebooks (step by step)
- Where generated reports are saved
- Key insights and findings
-->

---

## Dashboard

> **Owner: Full Stack**
> This section will be filled once Angular frontend and FastAPI backend are working.

<!--
When ready, document:
- How to run the frontend locally (Angular)
- How to run the backend API locally (FastAPI)
- List of available API endpoints
- Dashboard features and pages overview
-->

---

## Team

| Role             | Responsibilities                                              |
| ---------------- | ------------------------------------------------------------- |
| DevOps / DataOps | Infrastructure, Docker, CI/CD, monitoring, secrets management |
| Data Engineering | Scrapers, NiFi flows, Airflow DAGs, dbt models                |
| Data Analysis    | Statistical analysis, notebooks, reports                      |
| Full Stack       | Angular dashboard, FastAPI backend                            |

---

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before making any changes.
It contains the branching strategy, commit guidelines, PR workflow, and folder ownership rules.

---

## License

This project is licensed under the MIT License — see [LICENSE](./LICENSE) for details.
