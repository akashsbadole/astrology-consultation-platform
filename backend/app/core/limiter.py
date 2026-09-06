from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

# In production the rate limiter is backed by Redis so every worker shares one
# correct counter (in-memory counting would multiply the effective limit by the
# worker count). Locally (environment != "production") we use slowapi's built-in
# in-memory store so the app runs with no Redis server at all.
if settings.use_redis:
    limiter = Limiter(
        key_func=get_remote_address,
        storage_uri=settings.redis_url,
        # Force RESP2 (protocol=2). redis-py 8.x otherwise attempts the RESP3
        # `HELLO` handshake on connect, which older / incompatible Redis servers
        # reject with "unknown command 'HELLO'". RESP2 works with every Redis >= 2.0.
        storage_options={"protocol": 2},
    )
else:
    limiter = Limiter(key_func=get_remote_address, storage_uri="memory://")
