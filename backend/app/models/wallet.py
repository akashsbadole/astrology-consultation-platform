import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel

import app.models.user  # noqa: F401 - ensures User is registered before FK resolution


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TransactionType(str, enum.Enum):
    recharge = "recharge"
    consultation_debit = "consultation_debit"
    store_purchase = "store_purchase"
    astrologer_payout = "astrologer_payout"
    referral_bonus = "referral_bonus"
    refund = "refund"


class Wallet(SQLModel, table=True):
    __tablename__ = "wallets"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", unique=True, index=True, nullable=False)
    balance_paise: int = Field(default=0, nullable=False)  # always an integer, never a float — see WalletService


class WalletTransaction(SQLModel, table=True):
    __tablename__ = "wallet_transactions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    wallet_id: uuid.UUID = Field(foreign_key="wallets.id", index=True, nullable=False)
    amount_paise: int = Field(nullable=False)  # signed: +credit / -debit
    type: TransactionType = Field(nullable=False)
    reference_id: uuid.UUID | None = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=_utcnow, sa_column=Column(DateTime(timezone=True)))
    # Append-only by convention, enforced in code (WalletService never
    # issues an UPDATE or DELETE against this table) — not a DB-level
    # constraint here, but every write path funnels through one function,
    # which is what makes that convention actually hold in practice.
