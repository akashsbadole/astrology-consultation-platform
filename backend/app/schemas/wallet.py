import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.wallet import TransactionType


class RechargeOrderRequest(BaseModel):
    amount_paise: int = Field(ge=10000, description="Minimum recharge ₹100 (10000 paise)")


class WalletBalance(BaseModel):
    balance_paise: int


class TransactionOut(BaseModel):
    id: uuid.UUID
    amount_paise: int
    type: TransactionType
    reference_id: uuid.UUID | None
    created_at: datetime

    class Config:
        from_attributes = True
