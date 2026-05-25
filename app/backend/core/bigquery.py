import asyncio
import json
import logging
from datetime import date, datetime
from concurrent.futures import ThreadPoolExecutor
from google.cloud import bigquery
from core.config import settings
from core.redis import redis_get, redis_set

logger = logging.getLogger(__name__)

_bq_client: bigquery.Client | None = None
_executor = ThreadPoolExecutor(max_workers=2)


def serialize_row(row: dict) -> dict:
    out = {}
    for k, v in row.items():
        if isinstance(v, (date, datetime)):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


def get_bq_client() -> bigquery.Client:
    global _bq_client
    if _bq_client is None:
        _bq_client = bigquery.Client(project=settings.BIGQUERY_PROJECT_ID)
    return _bq_client


async def execute_bq_query(query: str) -> list[dict]:
    client = get_bq_client()
    loop = asyncio.get_running_loop()
    try:
        query_job = await loop.run_in_executor(_executor, client.query, query)
        results = await loop.run_in_executor(_executor, query_job.result)
        return [serialize_row(dict(row)) for row in results]
    except Exception as e:
        logger.error(f"BigQuery Error: {str(e)}")
        raise


async def cached_bq_query(endpoint: str, query: str, ttl: int = 300, days_back: int | None = None) -> list[dict]:
    cache_key = f"analytics:{endpoint}:d{days_back}" if days_back else f"analytics:{endpoint}"

    # Try Redis cache with independent try/block — failure won't cascade
    try:
        cached = await asyncio.wait_for(redis_get(cache_key), timeout=5.0)
        if cached is not None:
            return json.loads(cached)
    except asyncio.TimeoutError:
        logger.warning(f"Redis timeout for {endpoint}")
    except Exception as exc:
        logger.warning(f"Redis unavailable for {endpoint}: {exc}")

    # Fall through to BigQuery directly
    try:
        data = await execute_bq_query(query)
    except Exception as bq_err:
        logger.error(f"BigQuery Error for {endpoint}: {str(bq_err)}")
        return []

    # Best-effort cache write (fire-and-forget)
    try:
        await asyncio.wait_for(redis_set(cache_key, json.dumps(data), ttl), timeout=5.0)
    except Exception:
        pass

    return data
