from fastapi.security import OAuth2PasswordBearer
from typing import AsyncGenerator
from core.database import AsyncSessionLocal

# Cette ligne dit à Swagger où aller chercher le token
reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl="api/v1/auth/login"
)

async def get_db() -> AsyncGenerator:
    async with AsyncSessionLocal() as session:
        yield session

