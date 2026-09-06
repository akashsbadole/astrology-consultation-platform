import uuid
from datetime import date, datetime, time, timezone

from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel
from sqlmodel import JSON

from app.models.user import User  # noqa: F401 - ensures User is registered before FK resolution


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class KundliChart(SQLModel, table=True):
    __tablename__ = "kundli_charts"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)

    label: str | None = Field(default=None)  # e.g. "Self", "Spouse candidate" - user-facing name for saved charts
    birth_date: date = Field(nullable=False)
    birth_time: time = Field(nullable=False)
    latitude: float = Field(nullable=False)
    longitude: float = Field(nullable=False)
    timezone_offset_hours: float = Field(nullable=False)  # e.g. 5.5 for IST

    chart_json: dict = Field(default_factory=dict, sa_column=Column(JSON))

    created_at: datetime = Field(default_factory=_utcnow, sa_column=Column(DateTime(timezone=True)))
