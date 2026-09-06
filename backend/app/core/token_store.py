"""
Shared pattern for both password-reset and email-verification tokens:
random opaque token, hashed before storage (same reasoning as refresh
tokens — never store a usable secret in plaintext), short TTL, single use
(deleted on consumption).
"""
import hashlib
import secrets
import time

import redis.asyncio as redis

from app.core.config import settings

# Redis-backed in production; an in-memory fallback is used in local/dev so the
# app runs with no Redis server.
_redis = (
    redis.from_url(settings.redis_url, decode_responses=True, protocol=2)
    if settings.use_redis
    else None
)
_local_tokens: dict[str, tuple[str, float]] = {}

PASSWORD_RESET_TTL_SECONDS = 30 * 60
EMAIL_VERIFY_TTL_SECONDS = 24 * 60 * 60


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _store_key(prefix: str, token_hash: str) -> str:
    return f"{prefix}:{token_hash}"


async def issue_token(prefix: str, user_id: str, ttl_seconds: int) -> str:
    token = secrets.token_urlsafe(32)
    key = _store_key(prefix, _hash(token))
    if _redis is not None:
        await _redis.set(key, user_id, ex=ttl_seconds)
    else:
        _local_tokens[key] = (user_id, time.time() + ttl_seconds)
    return token


async def consume_token(prefix: str, token: str) -> str | None:
    """Returns the user_id if valid, and deletes it (single use). None if
    invalid/expired."""
    key = _store_key(prefix, _hash(token))
    if _redis is not None:
        user_id = await _redis.get(key)
        if user_id is not None:
            await _redis.delete(key)
        return user_id
    entry = _local_tokens.pop(key, None)
    if entry is None:
        return None
    user_id, expire = entry
    if time.time() > expire:
        return None
    return user_id
