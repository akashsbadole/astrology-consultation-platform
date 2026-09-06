import uuid
from datetime import date, time

from pydantic import BaseModel, Field


class GenerateKundliRequest(BaseModel):
    label: str | None = Field(default=None, max_length=100)
    birth_date: date
    birth_time: time
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    timezone_offset_hours: float = Field(
        ge=-12, le=14,
        description="Hours offset from UTC in effect AT THE BIRTH LOCATION AND TIME, e.g. 5.5 for IST. "
        "Caller resolves this — historical offsets differ from a place's current offset.",
    )


class KundliSummary(BaseModel):
    id: uuid.UUID
    label: str | None
    birth_date: date
    created_at: str

    class Config:
        from_attributes = True


class KundliDetail(BaseModel):
    id: uuid.UUID
    label: str | None
    birth_date: date
    birth_time: time
    latitude: float
    longitude: float
    chart: dict

    class Config:
        from_attributes = True


class MatchRequest(BaseModel):
    chart_a_id: uuid.UUID
    chart_b_id: uuid.UUID
