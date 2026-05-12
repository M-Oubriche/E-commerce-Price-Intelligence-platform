from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from core.config import settings

# On construit l'URL pour une connexion asynchrone (asyncpg)
DATABASE_URL = f"postgresql+asyncpg://{settings.APP_POSTGRES_USER}:{settings.APP_POSTGRES_PASSWORD}@{settings.APP_POSTGRES_HOST}:{settings.APP_POSTGRES_PORT}/{settings.APP_POSTGRES_DB}"

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

