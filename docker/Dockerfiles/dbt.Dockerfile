# dbt.Dockerfile

FROM ghcr.io/dbt-labs/dbt-bigquery:1.8.0

WORKDIR /dbt

# Copy dbt_project.yml and packages.yml (if it exists) to allow dbt deps to run
COPY dbt/dbt_project.yml dbt/packages.yml* ./
RUN dbt deps || true
