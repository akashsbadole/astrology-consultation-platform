"""
Runs ONCE, before the application's worker processes start — see
docker-compose.yml's `migrate` service. Deliberately NOT called from
app/main.py's lifespan: with more than one gunicorn worker, every worker
runs lifespan independently, and multiple processes issuing
`CREATE TABLE` concurrently race each other (one succeeds, the others
crash with "table already exists"). Separating this into its own one-off
step, run to completion before the app containers start, avoids that
entirely — and it's also the natural slot to swap in `alembic upgrade
head` later, once you move off create_all to real migrations.

Run directly: python -m app.scripts.init_db
"""
import asyncio

# CRITICAL: SQLModel.metadata is only populated as a side effect of a model
# module actually being imported somewhere — it is NOT automatically
# discovered. Without this import, create_all() silently creates ZERO
# tables (no error, no warning) because SQLModel.metadata is empty at that
# point. This is why the test suite never caught it: importing app.main
# transitively imports app.routers.auth, which imports app.models.user as
# a side effect — but this standalone script has no reason to import
# app.main, so nothing pulled the models in until this explicit import was
# added. Add every new model module here as the schema grows.
import app.models.astrologer  # noqa: F401
import app.models.chat  # noqa: F401
import app.models.consultation  # noqa: F401
import app.models.kundli  # noqa: F401
import app.models.payment  # noqa: F401
import app.models.store  # noqa: F401
import app.models.user  # noqa: F401
import app.models.wallet  # noqa: F401
from app.core.db import engine, init_db


async def main() -> None:
    await init_db()
    # Explicitly dispose the engine before the process exits — this is a
    # short-lived script, not a long-running app.
    await engine.dispose()
    print("Database schema initialized.")


if __name__ == "__main__":
    asyncio.run(main())
