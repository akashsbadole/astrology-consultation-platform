import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime
from sqlmodel import JSON, Field, SQLModel

import app.models.user  # noqa: F401


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AstrologerStatus(str, enum.Enum):
    pending = "pending"
    interview = "interview"
    probation = "probation"
    active = "active"
    suspended = "suspended"
    rejected = "rejected"


class Astrologer(SQLModel, table=True):
    __tablename__ = "astrologers"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", unique=True, index=True, nullable=False)

    status: AstrologerStatus = Field(default=AstrologerStatus.pending, index=True)
    bio: str | None = Field(default=None)
    experience_years: int = Field(default=0)
    specializations: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    languages: list[str] = Field(default_factory=list, sa_column=Column(JSON))

    rate_per_minute_paise: int = Field(default=500)  # ₹5/min default, platform-band-validated on update
    is_online: bool = Field(default=False)

    avg_rating: float = Field(default=0.0)
    rating_count: int = Field(default=0)
    last_active_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True)))

    created_at: datetime = Field(default_factory=_utcnow, sa_column=Column(DateTime(timezone=True)))


class Review(SQLModel, table=True):
    __tablename__ = "reviews"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    astrologer_id: uuid.UUID = Field(foreign_key="astrologers.id", index=True, nullable=False)
    client_id: uuid.UUID = Field(foreign_key="users.id", nullable=False)
    consultation_id: uuid.UUID = Field(unique=True, nullable=False)  # one review per consultation
    rating: int = Field(ge=1, le=5, nullable=False)
    comment: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=_utcnow, sa_column=Column(DateTime(timezone=True)))
