# Contributing Guide

Thank you for contributing to the **Real-Time E-commerce Price Intelligence Platform**.
This document defines the workflow, coding standards, and collaboration rules for all team members.

---

## Table of Contents

1. [Team Roles & Ownership](#team-roles--ownership)
2. [Branching Strategy](#branching-strategy)
3. [Commit Message Guidelines](#commit-message-guidelines)
4. [Pull Request Workflow](#pull-request-workflow)
5. [Documentation Update Rules](#documentation-update-rules)
6. [General Rules](#general-rules)

---

## Team Roles & Ownership

Each role is responsible for specific folders. **You must only modify folders that belong to your role**, unless explicitly discussed with the team.

---

### DevOps / DataOps

**Responsibilities:** Infrastructure, containerization, CI/CD pipelines, orchestration, monitoring, secrets management, and data quality tooling.

**Owned folders:**

```
.github/workflows/
docker/
docker-compose.yml
infrastructure/
  ├── terraform/
  ├── monitoring/
  └── scripts/
.env.example
```

**Also responsible for:**

- Maintaining `docker-compose.yml` at root
- Updating `.env.example` when new environment variables are introduced
- Writing and maintaining GitHub Actions workflows
- Ensuring all services are properly containerized

---

### Data Engineering

**Responsibilities:** Data ingestion pipelines (NiFi & Airflow), scraping, storage schema, and dbt transformations.

**Owned folders:**

```
airflow/
  ├── dags/
  └── plugins/
nifi/
  ├── templates/
  └── flows/
scrapers/
  └── ecommerce_scraper/
dbt/
  ├── models/
  ├── tests/
  ├── macros/
  ├── dbt_project.yml
  └── profiles.yml.example
```

**Also responsible for:**

- Documenting every DAG and NiFi flow clearly
- Never committing `profiles.yml` or any credentials

---

### Data Analysis

**Responsibilities:** Statistical analysis, reporting, and dashboard insights.

**Owned folders:**

```
analytics/
  ├── notebooks/
  └── reports/
```

**Also responsible for:**

- Keeping notebooks clean and well-commented
- Exporting final reports to `analytics/reports/`

---

### Full Stack

**Responsibilities:** Dashboard frontend (Angular) and backend API (FastAPI).

**Owned folders:**

```
app/
  ├── frontend/
  └── backend/
```

**Also responsible for:**

- Keeping `app/backend/requirements.txt` updated
- Documenting all API endpoints

---

### Shared Ownership (All Roles)

> - tests/ → Everyone writes tests for their own components
> - README.md → Updated by whoever finishes a phase

---

## Branching Strategy

```
main
└── feature/*
```

### `main` — Stable Branch

- Always deployable and stable
- No one pushes directly to `main`
- Only accepts merges via approved Pull Requests
- Requires at least 1 reviewer approval

### `feature/*` — Feature Branches

- Name format: `feature/<role>/<short-description>`

Examples:

```
feature/devops/docker-compose-setup
feature/data-engineering/airflow-dag-scraper
feature/data-analysis/price-stats-notebook
feature/fullstack/fastapi-price-endpoint
```

### Branch Lifecycle

1. git checkout main
2. git pull origin main
3. git checkout -b feature/your-role/your-task
4. ... do your work ...
5. git push origin feature/your-role/your-task
6. Open a Pull Request → main
7. Get reviewed → merge → delete branch

> Rule: Never work directly on `main`. No exceptions.

---

## Commit Message Guidelines

Format: `<type>(<scope>): <short description>`

### Types

| Type     | When to Use                          |
| -------- | ------------------------------------ |
| feat     | Adding a new feature                 |
| fix      | Fixing a bug                         |
| chore    | Maintenance, setup, config           |
| docs     | Documentation changes only           |
| refactor | Code restructure, no behavior change |
| test     | Adding or updating tests             |
| ci       | Changes to CI/CD pipelines           |
| infra    | Terraform or infrastructure changes  |

### Scopes by Role

| Role             | Scopes                                       |
| ---------------- | -------------------------------------------- |
| DevOps/DataOps   | docker, ci, infra, monitoring, airflow, nifi |
| Data Engineering | scraper, dag, nifi, dbt, bigtable            |
| Data Analysis    | notebook, stats, report                      |
| Full Stack       | frontend, backend, api                       |

### Examples

> - feat(dag): add daily price refresh DAG for Airflow
> - fix(scraper): handle 429 rate limit with exponential backoff
> - chore(docker): add Dockerfile for NiFi service
> - docs(readme): update local setup instructions
> - infra(terraform): add Bigtable instance and table config
> - ci(github-actions): add lint and test workflow on push
> - test(dbt): add uniqueness test for product row key

### Rules

- Lowercase everything
- Imperative tense: "add", "fix" — not "added", "fixed"
- No vague messages: `fix stuff`, `update`, `wip` are not acceptable

---

## Pull Request Workflow

### Before Opening a PR

- [ ] Branch is up to date with main
- [ ] Code runs locally without errors
- [ ] Tests written or updated
- [ ] README updated if setup/usage changed
- [ ] No secrets in commits

### Syncing Before PR

```
git checkout main
git pull origin main
git checkout feature/your-role/your-task
git merge main
git push origin feature/your-role/your-task
```

### PR Description Template

When opening a PR on GitHub, fill in the following template:

- ### What does this PR do?

A short, clear description of the change and why it was made.

- ### Role
  - [ ] DevOps/DataOps
  - [ ] Data Engineering
  - [ ] Data Analysis
  - [ ] Full Stack

- ### Folders changed

List every folder or file you modified.

- ### How to test

Step-by-step instructions to verify this works locally.
Example:

1. Run docker compose up
2. Open Airflow at localhost:8080
3. Trigger the DAG manually and verify it runs successfully

- ### Checklist
  - [ ] Tests pass
  - [ ] README updated (if needed)
  - [ ] No secrets committed
  - [ ] Branch is up to date with main

- ### Review Rules
  - At least 1 approval required before merging
  - Author cannot approve their own PR
  - Use "Request Changes" if fixes needed before approval

- ### Merging
  - Always use "Squash and Merge"
  - Delete branch after merging
  - Never use "Rebase and Merge" or "Create a Merge Commit"

---

## Documentation Update Rules

Rule: Every completed phase must update the README.

| Situation                        | Who Updates      |
| -------------------------------- | ---------------- |
| New service added                | DevOps/DataOps   |
| New DAG or scraper working       | Data Engineering |
| New notebook or report published | Data Analysis    |
| New API endpoint or New page ... | Full Stack       |
| New env variable added           | Whoever added it |

You finish a task → update README before opening PR.

---

## General Rules

| Rule                        | Detail                                                 |
| --------------------------- | ------------------------------------------------------ |
| Never commit secrets        | No .env, profiles.yml, API keys, JSON keyfiles         |
| Never push to main directly | Always use feature branches + PR                       |
| Keep branches short-lived   | Open PR as soon as task is done                        |
| One task per branch         | Don't mix multiple features in one branch              |
| Communicate blockers        | Raise issues immediately — don't stay stuck silently   |
| Respect folder ownership    | Don't modify another role's folders without discussion |
| Test before pushing         | Run your changes locally before pushing                |

---

> Mistakes happen — what matters is catching them early and fixing them properly.

---

> Good luck for everyone, best ragards.
