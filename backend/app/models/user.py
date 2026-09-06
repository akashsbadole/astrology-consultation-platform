import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel


class UserRole(str, enum.Enum):
    customer = "customer"
    astrologer = "astrologer"
    admin = "admin"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# All timestamp columns are explicit DateTime(timezone=True). Without this,
# SQLAlchemy defaults to a naive DateTime column — the value stores fine,
# but reading it back gives you a naive datetime, and comparing that
# against datetime.now(timezone.utc) raises TypeError at runtime. This
# bites on Postgres too, not just SQLite — it's not a test-only concern.
def _tz_aware_column():
    return Column(DateTime(timezone=True))


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(unique=True, index=True, nullable=False)
    role: UserRole = Field(nullable=False)

    # Nullable because a user who only ever signs in with Google has no password.
    hashed_password: str | None = Field(default=None)

    # Set when the account is linked to Google. A user CAN have both a
    # password and a google_id (e.g. registered by email, later linked Google).
    google_id: str | None = Field(default=None, index=True, unique=True)

    full_name: str | None = Field(default=None)
    avatar_url: str | None = Field(default=None)

    is_active: bool = Field(default=True)
    email_verified: bool = Field(default=False)
    created_at: datetime = Field(default_factory=_utcnow, sa_column=_tz_aware_column())


class RefreshToken(SQLModel, table=True):
    __tablename__ = "refresh_tokens"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    token_hash: str = Field(nullable=False, index=True)
    expires_at: datetime = Field(sa_column=_tz_aware_column())
    revoked_at: datetime | None = Field(default=None, sa_column=_tz_aware_column())
    created_at: datetime = Field(default_factory=_utcnow, sa_column=_tz_aware_column())
