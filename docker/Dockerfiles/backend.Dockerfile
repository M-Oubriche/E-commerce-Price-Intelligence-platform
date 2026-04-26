FROM python:3.11-slim

WORKDIR /app

# Install system dependencies required for database drivers
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# If requirements exist, install them
COPY requirements.txt* ./
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

# Copy application code
COPY . .

# Expose the API port
EXPOSE 8000

# The command is overridden in docker-compose.yml for dev (hot reload)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
