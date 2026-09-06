import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.consultation import ConsultationMode, ConsultationStatus


class RequestConsultationRequest(BaseModel):
    astrologer_id: uuid.UUID
    mode: ConsultationMode


class ConsultationOut(BaseModel):
    id: uuid.UUID
    astrologer_id: uuid.UUID
    mode: ConsultationMode
    status: ConsultationStatus
    is_free_session: bool
    total_billed_paise: int
    started_at: datetime | None = None
    ended_at: datetime | None = None

    class Config:
        from_attributes = True
