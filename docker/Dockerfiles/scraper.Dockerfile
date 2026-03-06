
# Base image
FROM python:3.11-slim


# Environment settings
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app


# Working directory

WORKDIR /app


# System dependencies + Chrome installation
# Using modern keyrings method (apt-key deprecated)

RUN apt-get update && apt-get install -y \
    gcc \
    libxml2-dev \
    libxslt1-dev \
    libffi-dev \
    curl \
    wget \
    gnupg \
    unzip \
    && wget -q -O /usr/share/keyrings/google-chrome.gpg \
    https://dl.google.com/linux/linux_signing_key.pub \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] \
    http://dl.google.com/linux/chrome/deb/ stable main" \
    > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*


# Python dependencies
# Copy requirements first for layer caching
# If requirements dont change image wont rebuild: "optimisation"
COPY scrapers/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && rm requirements.txt

# Copy scraper source code into image
COPY scrapers/ ./scrapers/


# Data output folder inside container
RUN mkdir -p /data/raw


# Default command
#note: this will be overrided later
CMD ["bash"]