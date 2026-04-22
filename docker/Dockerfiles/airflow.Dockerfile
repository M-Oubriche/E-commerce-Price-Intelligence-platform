# docker/Dockerfiles/airflow.Dockerfile
# 2.9.3 is the latest stable 2.x release.

FROM apache/airflow:2.9.3-python3.11

# Copy our DAG dependencies and install them
# We copy only the requirements file first — Docker layer caching means
# pip install won't re-run unless requirements.txt actually changes
COPY airflow/requirements.txt /tmp/airflow-requirements.txt

RUN pip install --no-cache-dir -r /tmp/airflow-requirements.txt
