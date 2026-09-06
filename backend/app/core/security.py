"""
Password hashing and JWT issuance/verification.

Rules encoded here (do not relax these when adding features elsewhere):
- Passwords are hashed with argon2, never stored or logged in plaintext.
- Access tokens are short-lived and carry only {sub, role, type: "access"}.
- Refresh tokens are opaque random strings, stored HASHED in the database
  (never store a usable refresh token in plaintext anywhere) and are
  single-use — every refresh call rotates it.
"""
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_expire_minutes)
    payload = {"sub": user_id, "role": role, "type": "access", "exp": expire}
    return jwt.encode(payload, settings.jwt_access_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.jwt_access_secret, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None


def generate_refresh_token() -> str:
    """Opaque random token — not a JWT. Returned to the client as-is,
    but only the hash of it is ever persisted server-side."""
    return secrets.token_urlsafe(48)


def as_aware_utc(dt: datetime) -> datetime:
    """Some DB drivers (SQLite/aiosqlite in particular) don't reliably
    round-trip tzinfo even on a DateTime(timezone=True) column. Normalize
    defensively wherever a DB-sourced datetime is compared against
    datetime.now(timezone.utc) — otherwise that comparison raises
    TypeError on offset-naive vs offset-aware, intermittently, depending
    on which DB backend happens to be running."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


# Computed once at import (an argon2 hash, same cost as a real password
# hash). Used by the login route to verify against when no user exists,
# so that "account not found" and "account found but wrong password" take
# the same amount of time — without this, an attacker can distinguish the
# two cases (and enumerate valid emails) purely by measuring response
# latency, even though the error MESSAGE is already identical for both.
DUMMY_PASSWORD_HASH = pwd_context.hash("timing-safety-dummy-password-never-used-for-login")


def hash_refresh_token(token: str) -> str:
    # A refresh token is a high-entropy random string already, so a fast
    # hash (sha256) is fine here — this is not a password, it doesn't need
    # argon2's deliberate slowness. We only need to avoid storing it plainly.
    import hashlib

    return hashlib.sha256(token.encode()).hexdigest()
