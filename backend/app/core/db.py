from collections.abc import AsyncGenerator

from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings

# NOTE: for Neon/Postgres, the driver segment of DATABASE_URL should be
# "postgresql+asyncpg://..." — swap it in config/deployment, not here.
#
# Pool tuning, not left at defaults:
# - pool_size/max_overflow: with 2 gunicorn workers (the Dockerfile
#   default) each holding their own pool, 5+10 per worker gives headroom
#   for concurrent requests without opening far more DB connections than
#   a small managed Postgres instance's connection limit allows. Scale
#   these up together with WEB_CONCURRENCY if you resize the VPS.
# - pool_recycle: many managed Postgres providers (including Neon) will
#   silently close idle connections server-side after a timeout. Without
#   pool_recycle, the pool doesn't know that happened and hands out a
#   dead connection, which surfaces as a confusing "connection reset" in
#   production despite everything looking fine in local dev.
engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    pool_recycle=1800,  # 30 minutes
)


async def init_db() -> None:
    """Run Alembic migrations instead of create_all — this supports
    schema evolution after initial deployment."""
    import subprocess
    import sys
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    # expire_on_commit=False is required for async sessions: by default,
    # SQLAlchemy expires every tracked object's attributes after ANY
    # commit, and the next attribute access tries to lazily reload from
    # the DB — which needs an await, but something like
    # UserPublic.model_validate(user) calls that synchronously. Without
    # this flag, any commit elsewhere in the same request (e.g. inserting
    # a RefreshToken row) silently breaks reading `user.email` afterward.
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session
