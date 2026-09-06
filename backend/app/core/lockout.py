"""
Per-ACCOUNT login lockout, on top of (not instead of) the per-IP rate
limiting in core/limiter.py.

Why both are needed: slowapi's rate limiting is keyed by IP. That stops a
single attacker hammering many accounts from one machine, but does
nothing against a distributed attack — many different IPs, each making a
handful of attempts, all targeting ONE victim's account. This module
closes that gap by tracking failed attempts per email address, in Redis
(shared across all backend instances, same reasoning as the rate limiter
itself).

Failed attempts are recorded for BOTH "wrong password" and "email doesn't
exist" — using the same code path for both is what keeps this from
becoming a new email-enumeration side channel (see DUMMY_PASSWORD_HASH in
security.py for the timing half of that same guarantee).
"""
import os

import redis.asyncio as redis

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_WINDOW_SECONDS = 15 * 60  # 15 minutes

_redis = redis.from_url(os.environ.get("REDIS_URL", "redis://redis:6379"), decode_responses=True)


def _key(email: str) -> str:
    return f"login_fail:{email.lower().strip()}"


async def is_locked_out(email: str) -> bool:
    count = await _redis.get(_key(email))
    return count is not None and int(count) >= MAX_FAILED_ATTEMPTS


async def record_failed_attempt(email: str) -> None:
    key = _key(email)
    # INCR + EXPIRE (only set TTL on the first failure) so the window is
    # 15 minutes from the FIRST recent failure, not extended forever by
    # each subsequent one — a slow trickle of attempts still eventually
    # expires instead of locking the account out indefinitely.
    count = await _redis.incr(key)
    if count == 1:
        await _redis.expire(key, LOCKOUT_WINDOW_SECONDS)


async def clear_failed_attempts(email: str) -> None:
    await _redis.delete(_key(email))
