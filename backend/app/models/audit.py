import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel


class AuditAction(str, enum.Enum):
    astrologer_approve = "astrologer.approve"
    astrologer_reject = "astrologer.reject"
    astrologer_suspend = "astrologer.suspend"
    user_deactivate = "user.deactivate"
    user_activate = "user.activate"
    refund_issue = "refund.issue"
    commission_adjust = "commission.adjust"


def _utcnow():
    return datetime.now(timezone.utc)


class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    actor_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    action: str = Field(nullable=False, max_length=100)
    target_id: uuid.UUID | None = Field(default=None, index=True)
    target_type: str | None = Field(default=None, max_length=50)
    metadata_json: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=_utcnow, sa_column=Column(DateTime(timezone=True)))
