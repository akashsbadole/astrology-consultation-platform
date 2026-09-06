import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel

import app.models.astrologer  # noqa: F401
import app.models.user  # noqa: F401


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ConsultationMode(str, enum.Enum):
    chat = "chat"
    audio = "audio"
    video = "video"


class ConsultationStatus(str, enum.Enum):
    matching = "matching"
    active = "active"
    ended = "ended"
    expired = "expired"


class Consultation(SQLModel, table=True):
    __tablename__ = "consultations"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    client_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    astrologer_id: uuid.UUID = Field(foreign_key="astrologers.id", index=True, nullable=False)
    mode: ConsultationMode = Field(nullable=False)
    status: ConsultationStatus = Field(default=ConsultationStatus.matching, index=True)

    is_free_session: bool = Field(default=False)
    free_seconds_remaining: int = Field(default=0)

    started_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    ended_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    total_billed_paise: int = Field(default=0)
    commission_paise: int = Field(default=0)
    end_reason: str | None = Field(default=None)

    created_at: datetime = Field(default_factory=_utcnow, sa_column=Column(DateTime(timezone=True)))
