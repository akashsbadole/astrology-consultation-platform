import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel

import app.models.user  # noqa: F401


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ChatMessage(SQLModel, table=True):
    __tablename__ = "chat_messages"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    consultation_id: uuid.UUID = Field(index=True, nullable=False)
    sender_id: uuid.UUID = Field(foreign_key="users.id", nullable=False)
    text: str | None = Field(default=None)
    attachment_url: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=_utcnow, sa_column=Column(DateTime(timezone=True)))
