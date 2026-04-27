FROM apache/nifi:1.25.0

USER root

# Install Python and Bigtable dependencies so NiFi can execute our advanced ingestion logic
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv
RUN python3 -m venv /opt/nifi/venv
RUN /opt/nifi/venv/bin/pip install --no-cache-dir google-cloud-bigtable psycopg2-binary requests beautifulsoup4 pydantic cryptography

# Create scripts directory for NiFi
RUN mkdir -p /opt/nifi/scripts
COPY scripts/nifi_ingest.py /opt/nifi/scripts/nifi_ingest.py
RUN chown -R nifi:nifi /opt/nifi/scripts

USER nifi
