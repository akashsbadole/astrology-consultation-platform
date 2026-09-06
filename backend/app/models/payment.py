import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel

import app.models.user  # noqa: F401


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class PaymentPurpose(str, enum.Enum):
    wallet_recharge = "wallet_recharge"
    store_purchase = "store_purchase"


class PaymentOrderStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"


class PaymentOrder(SQLModel, table=True):
    __tablename__ = "payment_orders"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    razorpay_order_id: str = Field(unique=True, index=True, nullable=False)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    purpose: PaymentPurpose = Field(nullable=False)
    amount_paise: int = Field(nullable=False)
    status: PaymentOrderStatus = Field(default=PaymentOrderStatus.pending)
    created_at: datetime = Field(default_factory=_utcnow, sa_column=Column(DateTime(timezone=True)))
