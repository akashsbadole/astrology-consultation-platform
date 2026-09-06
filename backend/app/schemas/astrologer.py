import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.astrologer import AstrologerStatus

MIN_RATE_PAISE = 500      # ₹5/min
MAX_RATE_PAISE = 10000    # ₹100/min


class ApplyRequest(BaseModel):
    bio: str | None = Field(default=None, max_length=2000)
    experience_years: int = Field(ge=0, le=70)
    specializations: list[str] = Field(min_length=1, max_length=10)
    languages: list[str] = Field(min_length=1, max_length=10)


class UpdateRateRequest(BaseModel):
    rate_per_minute_paise: int = Field(ge=MIN_RATE_PAISE, le=MAX_RATE_PAISE)


class UpdateAvailabilityRequest(BaseModel):
    is_online: bool


class StatusUpdateRequest(BaseModel):
    status: AstrologerStatus


class AstrologerPublic(BaseModel):
    id: uuid.UUID
    # The owning User's id — lets a client match "my astrologer profile"
    # against /auth/me (Astrologer.id is its own row PK, not the user's).
    user_id: uuid.UUID
    full_name: str | None
    bio: str | None
    experience_years: int
    specializations: list[str]
    languages: list[str]
    rate_per_minute_paise: int
    is_online: bool
    avg_rating: float
    rating_count: int
    status: AstrologerStatus

    class Config:
        from_attributes = True


class ReviewCreate(BaseModel):
    consultation_id: uuid.UUID
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)


class ReviewOut(BaseModel):
    id: uuid.UUID
    rating: int
    comment: str | None
    created_at: datetime

    class Config:
        from_attributes = True
