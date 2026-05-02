FROM apache/nifi:1.25.0

USER root

# Install Python and Bigtable dependencies so NiFi can execute our advanced ingestion logic
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv
RUN python3 -m venv /opt/nifi/venv
# Install Python dependencies (added python-dotenv so scrapers can load .env)
# --timeout 300: give each download 5 minutes (avoids failures on slow connections)
# --retries 5: retry 5 times before giving up
RUN /opt/nifi/venv/bin/pip install --no-cache-dir --timeout 300 --retries 5 google-cloud-bigtable psycopg2-binary requests beautifulsoup4 pydantic cryptography python-dotenv

# Create scripts directory for NiFi
RUN mkdir -p /opt/nifi/scripts
COPY nifi/scripts/nifi_ingest.py /opt/nifi/scripts/nifi_ingest.py
RUN chown -R nifi:nifi /opt/nifi/scripts

USER nifi
