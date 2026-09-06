import os

from slowapi import Limiter
from slowapi.util import get_remote_address

# Redis-backed, NOT the default in-memory store. In-memory rate limiting
# only works correctly with exactly one worker process — the moment this
# runs with multiple Uvicorn/Gunicorn workers (which a real VPS deployment
# does, see docker/backend/Dockerfile), each worker would keep its own
# separate counter, silently multiplying the effective rate limit by the
# worker count. Redis gives every worker a shared, correct counter.
#
# REDIS_URL defaults to the docker-compose service name ("redis") so this
# works out of the box in that environment; override it for local dev
# outside Docker (e.g. "redis://localhost:6379").
REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379")

limiter = Limiter(key_func=get_remote_address, storage_uri=REDIS_URL)
