from google.cloud import bigquery
from core.config import settings

def get_bq_client() -> bigquery.Client:
    """
    Returns a BigQuery client initialized with the configured Google Cloud Project ID.
    Relies on standard Application Default Credentials (ADC).
    """
    return bigquery.Client(project=settings.BIGQUERY_PROJECT_ID)
