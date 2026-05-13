# docker/Dockerfiles/airflow.Dockerfile
# 2.9.3 is the latest stable 2.x release.

FROM apache/airflow:2.9.3-python3.11

# Switch to root to install system tools
USER root
RUN apt-get update && \
    apt-get install -y curl && \
    # Download a newer Docker CLI so it works on both Windows and Linux
    curl -fsSL https://download.docker.com/linux/static/stable/x86_64/docker-24.0.9.tgz -o docker.tgz && \
    tar xzvf docker.tgz && \
    mv docker/docker /usr/local/bin/ && \
    rm -rf docker docker.tgz && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
USER airflow

# Copy our DAG dependencies and install them
# We copy only the requirements file first — Docker layer caching means
# pip install won't re-run unless requirements.txt actually changes
COPY airflow/requirements.txt /tmp/airflow-requirements.txt

RUN pip install --no-cache-dir -r /tmp/airflow-requirements.txt
