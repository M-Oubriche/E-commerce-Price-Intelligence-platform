import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

# --- CORRECTION DES IMPORTS (Plus de "app.") ---
from core.config import settings
from core.database import Base
import models # Import the models package to register all models with Base
# ----------------------------------------------

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Mode hors ligne."""
    # Utilisation des variables APP_ spécifiques à ton travail
    url = (
        f"postgresql+asyncpg://{settings.APP_POSTGRES_USER}:{settings.APP_POSTGRES_PASSWORD}@"
        f"{settings.APP_POSTGRES_HOST}:{settings.APP_POSTGRES_PORT}/{settings.APP_POSTGRES_DB}"
    )
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()

async def run_async_migrations() -> None:
    """Mode en ligne : Utilise asyncpg."""
    section = config.get_section(config.config_ini_section, {})
    
    # INJECTION DYNAMIQUE DE L'URL AVEC LES VARIABLES APP_
    section["sqlalchemy.url"] = (
        f"postgresql+asyncpg://{settings.APP_POSTGRES_USER}:{settings.APP_POSTGRES_PASSWORD}@"
        f"{settings.APP_POSTGRES_HOST}:{settings.APP_POSTGRES_PORT}/{settings.APP_POSTGRES_DB}"
    )

    connectable = async_engine_from_config(
        section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()

def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()