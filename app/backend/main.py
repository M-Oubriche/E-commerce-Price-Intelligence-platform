from fastapi import FastAPI
import os

app = FastAPI(title="PulsePrice API")

@app.get("/")
async def root():
    return {
        "message": "Backend is running!",
        "database_url_configured": "DATABASE_URL" in os.environ,
        "redis_url_configured": "REDIS_URL" in os.environ
    }
