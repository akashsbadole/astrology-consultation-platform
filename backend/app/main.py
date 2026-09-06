import logging
import os
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import ORJSONResponse
from fastapi_socketio import SocketManager
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.logging import setup_logging
setup_logging()

if os.environ.get("SENTRY_DSN"):
    import sentry_sdk
    from sentry_sdk.integrations.logging import LoggingIntegration

    sentry_logging = LoggingIntegration(level=logging.INFO, event_level=logging.ERROR)

    sentry_sdk.init(
        dsn=os.environ.get("SENTRY_DSN"),
        integrations=[sentry_logging],
        traces_sample_rate=0.1,
        environment="production",
    )

from app.core.config import settings
from app.core.limiter import limiter
from app.routers import admin, astrologer, auth, calls, consultation, content, kundli, payments, store, users, wallet
from app.sockets.chat import register_chat_events
from app.workers.billing_tick import TICK_INTERVAL_SECONDS, run_billing_tick
from app.workers.reconciliation import reconcile_wallets

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Deliberately no schema creation here — see app/scripts/init_db.py.
    # The scheduler MUST start here, inside the running event loop —
    # starting it at module import time (before Uvicorn's event loop
    # exists) raises "RuntimeError: no running event loop" and crashes
    # every worker on boot.
    scheduler.add_job(run_billing_tick, "interval", seconds=TICK_INTERVAL_SECONDS, kwargs={"sio": sio})
    scheduler.add_job(reconcile_wallets, "cron", hour=3, minute=0)  # 3 AM daily
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(title="Astrology Platform API", lifespan=lifespan, default_response_class=ORJSONResponse)

sio = SocketManager(app=app, mount_location="/socket.io", cors_allowed_origins=settings.allowed_origins)
register_chat_events(sio)

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

# GZip: auth payloads are small individually, but compressing still helps
# on a VPS with limited outbound bandwidth, and costs virtually nothing
# in CPU at this response size. minimum_size avoids compressing tiny
# responses where the gzip header overhead would exceed the savings.
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request, exc):
    from fastapi.responses import JSONResponse

    return JSONResponse(
        status_code=429,
        content={"error": {"code": "RATE_LIMITED", "message": "Too many requests. Try again shortly."}},
    )


# Locked to actual app origins — never "*" once you deploy.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(kundli.router)
app.include_router(wallet.router)
app.include_router(payments.router)
app.include_router(astrologer.router)
app.include_router(consultation.router)
app.include_router(calls.router)
app.include_router(store.router)
app.include_router(admin.router)
app.include_router(content.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
