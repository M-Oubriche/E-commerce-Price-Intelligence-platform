# airflow/dags/health_check.py
# PURPOSE: Verify the entire Airflow setup is working correctly.
# Just a verification DAG not something else
# HOW TO USE:
#   1. Open http://localhost:8081
#   2. Log in with your admin credentials (defined in ur .env file)
#   3. Find "health_check" in the DAG list
#   4. Toggle it ON (unpause it-the button is in the left side)
#   5. Click the "Trigger DAG" button (on the right side)

from __future__ import annotations

import os
from datetime import datetime, timedelta

from airflow.decorators import dag, task


DEFAULT_ARGS = {
    "owner": "devops",
    # On failure, retry once after 2 minutes
    "retries": 1,
    "retry_delay": timedelta(minutes=2),
}


@dag(
    dag_id="health_check",
    description="DevOps verification: confirms Airflow, volumes, and env vars are healthy",
    # schedule=None means this DAG NEVER runs automatically
    # It only runs when you manually trigger it
    schedule=None,
    start_date=datetime(2026, 1, 1),
    # catchup=False: if Airflow restarts, do NOT try to run missed schedules
    catchup=False,
    default_args=DEFAULT_ARGS,
    tags=["devops", "health", "verification"],
)
def health_check():

    @task
    def task_1_airflow_is_alive():
        """
        Simplest possible task.
        If this turns green, the scheduler is running
        and is successfully executing Python tasks.
        """
        print("=" * 50)
        print("TASK 1 PASSED: Airflow scheduler is alive.")
        print("   The scheduler picked up this DAG and executed this task.")
        print("=" * 50)
        return "alive"

    @task
    def task_2_volume_is_mounted():
        """
        Checks that ./data/raw is mounted inside the Airflow container.
        This is the same path the scraper writes to on the host machine.

        If this task FAILS: your volumes section in docker-compose.yml
        is wrong. Check that the bind mount path matches exactly.
        """
        raw_data_path = "/data/raw"

        print("=" * 50)
        print(f"Checking volume mount at: {raw_data_path}")

        # Check 1: does the path exist at all?
        if not os.path.exists(raw_data_path):
            raise FileNotFoundError(
                f"TASK 2 FAILED: {raw_data_path} does not exist inside the container.\n"
                "Fix: verify the volumes section in docker-compose.yml contains:\n"
                "  - ./data/raw:/data/raw"
            )

        # Check 2: is it a directory (not a file)?
        if not os.path.isdir(raw_data_path):
            raise NotADirectoryError(
                f"TASK 2 FAILED: {raw_data_path} exists but is not a directory."
            )

        # Check 3: list contents
        files = os.listdir(raw_data_path)
        print(f"TASK 2 PASSED: Volume mounted correctly at {raw_data_path}")
        print(f"   Files currently in /data/raw: {len(files)}")
        if files:
            print(f"   Sample: {files[:5]}")
        else:
            print("   (Empty — scraper hasn't run yet. That's fine for this check.)")
        print("=" * 50)

        return {"path": raw_data_path, "file_count": len(files)}

    @task
    def task_3_env_vars_are_set():
        """
        Confirms that Airflow's required environment variables are present.

        IMPORTANT: This task checks for EXISTENCE only — it never prints
        the actual values. Printing secrets in logs is a security risk
        even in local development. Build the habit now.

        If this task FAILS: check your .env file and docker-compose.yml
        environment section.
        """
        # These are the variables Airflow itself needs to function
        required_vars = [
            "AIRFLOW__CORE__EXECUTOR",
            "AIRFLOW__DATABASE__SQL_ALCHEMY_CONN",
            "AIRFLOW__CORE__FERNET_KEY",
            "AIRFLOW__WEBSERVER__SECRET_KEY",
        ]

        print("=" * 50)
        missing = []
        for var in required_vars:
            value = os.environ.get(var)
            if value:
                # Print only that it's set — never the value
                print(f"{var} is set")
            else:
                print(f"{var} is MISSING")
                missing.append(var)

        if missing:
            raise EnvironmentError(
                f"TASK 3 FAILED: Missing environment variables: {missing}\n"
                "Fix: check your .env file and the environment section "
                "in docker-compose.yml"
            )

        print("TASK 3 PASSED: All required environment variables are present.")
        print("=" * 50)
        return "env_ok"

    # Run in sequence — easier to read logs and pinpoint failures
    task_1_airflow_is_alive() >> task_2_volume_is_mounted() >> task_3_env_vars_are_set()


# This line is what makes Airflow discover the DAG
# Without it, the file is just a Python script — Airflow ignores it
health_check()
