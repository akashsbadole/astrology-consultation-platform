"""
Shared pattern for both password-reset and email-verification tokens:
random opaque token, hashed before storage (same reasoning as refresh
tokens — never store a usable secret in plaintext), short TTL, single use
(deleted on consumption).
"""
import hashlib
import os
import secrets

import redis.asyncio as redis

_redis = redis.from_url(os.environ.get("REDIS_URL", "redis://redis:6379"), decode_responses=True)

PASSWORD_RESET_TTL_SECONDS = 30 * 60
EMAIL_VERIFY_TTL_SECONDS = 24 * 60 * 60


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def issue_token(prefix: str, user_id: str, ttl_seconds: int) -> str:
    token = secrets.token_urlsafe(32)
    await _redis.set(f"{prefix}:{_hash(token)}", user_id, ex=ttl_seconds)
    return token


async def consume_token(prefix: str, token: str) -> str | None:
    """Returns the user_id if valid, and deletes it (single use). None if
    invalid/expired."""
    key = f"{prefix}:{_hash(token)}"
    user_id = await _redis.get(key)
    if user_id is not None:
        await _redis.delete(key)
    return user_id
