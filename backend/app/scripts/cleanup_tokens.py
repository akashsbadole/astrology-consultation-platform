"""
Deletes revoked and expired refresh_tokens rows older than a retention
window. Without this, the table grows forever — every login, refresh, and
logout INSERTs a row, and only ever marks old ones revoked, never removes
them. That's fine for weeks, but it's an unbounded growth pattern that
eventually shows up as slower queries on an unindexed-enough scan and
needless storage cost.

Run as a weekly cron job (see scripts/backup-db.sh for the same pattern):
  0 4 * * 0  docker compose exec -T backend python -m app.scripts.cleanup_tokens
"""
import asyncio
from datetime import datetime, timedelta, timezone

from sqlmodel import delete

import app.models.user  # noqa: F401 — see init_db.py for why this import is required
from app.core.db import engine, get_session
from app.models.user import RefreshToken

RETENTION_DAYS = 30


async def main() -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)

    async for session in get_session():
        result = await session.exec(
            delete(RefreshToken).where(
                RefreshToken.revoked_at.is_not(None),
                RefreshToken.revoked_at < cutoff,
            )
        )
        await session.commit()
        print(f"Deleted {result.rowcount} revoked refresh tokens older than {RETENTION_DAYS} days.")
        break  # get_session() is a generator meant for FastAPI's Depends(); one iteration is correct here

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
