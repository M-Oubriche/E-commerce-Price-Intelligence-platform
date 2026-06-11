import os
from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.python import PythonOperator
from google.cloud import bigtable
from google.cloud.bigtable.column_family import MaxVersionsGCRule

# Default args for the DAG
default_args = {
    'owner': 'data-engineering',
    'depends_on_past': False,
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=1),
}

def create_table_and_families():
    """
    Connects to Bigtable (real or emulator based on BIGTABLE_EMULATOR_HOST)
    and ensures the target table and its column families exist.
    """
    project_id  = os.environ.get("BIGTABLE_PROJECT_ID")
    instance_id = os.environ.get("BIGTABLE_INSTANCE_ID")
    if not project_id or not instance_id:
        raise EnvironmentError(
            "BIGTABLE_PROJECT_ID and BIGTABLE_INSTANCE_ID must be set. "
            "Check your .env file and docker-compose.yml."
        )
    table_id = "ecommerce_prices"

    # Bigtable client initialization.
    # Note: When BIGTABLE_EMULATOR_HOST is set, it automatically points to the emulator.
    # Admin context requires admin=True
    client = bigtable.Client(project=project_id, admin=True)
    instance = client.instance(instance_id)

    # Target column families per Data Model Specification Layer 2
    column_families = [
        "price_cf",
        "metadata_cf",
        "availability_cf",
        "seller_cf",
        "ratings_cf",
        "specs_cf",
        "ingestion_cf"
    ]

    table = instance.table(table_id)
    if not table.exists():
        print(f"Table {table_id} does not exist. Creating...")
        table.create()
    else:
        print(f"Table {table_id} already exists.")

    existing_families = table.list_column_families()

    for cf in column_families:
        if cf not in existing_families:
            print(f"Creating column family: {cf}")
            # keeping history (versions) is useful for price changes over time
            gc_rule = MaxVersionsGCRule(10)
            table.column_family(cf, gc_rule).create()
        else:
            print(f"Column family {cf} already exists.")
            
    print("Bigtable initialization completed successfully.")


with DAG(
    'init_bigtable_schema',
    default_args=default_args,
    description='Initialize Bigtable Table and Column Families',
    schedule_interval='@once',  # Run once manually
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=['infrastructure', 'initialization'],
) as dag:

    init_task = PythonOperator(
        task_id='create_table_and_families',
        python_callable=create_table_and_families,
    )
