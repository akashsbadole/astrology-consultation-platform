import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime
from sqlmodel import JSON, Field, SQLModel

import app.models.user  # noqa: F401


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ProductCategory(str, enum.Enum):
    gemstone = "gemstone"
    rudraksha = "rudraksha"
    yantra = "yantra"
    puja_service = "puja_service"


class Product(SQLModel, table=True):
    __tablename__ = "products"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(nullable=False)
    description: str | None = Field(default=None)
    category: ProductCategory = Field(nullable=False, index=True)
    price_paise: int = Field(nullable=False)
    stock_quantity: int = Field(default=0)  # ignored for puja_service (booked, not stocked)
    is_active: bool = Field(default=True)
    image_url: str | None = Field(default=None)


class OrderStatus(str, enum.Enum):
    pending_payment = "pending_payment"
    paid = "paid"
    fulfilled = "fulfilled"
    cancelled = "cancelled"


class Order(SQLModel, table=True):
    __tablename__ = "orders"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    status: OrderStatus = Field(default=OrderStatus.pending_payment, index=True)
    total_paise: int = Field(nullable=False)
    items: list[dict] = Field(default_factory=list, sa_column=Column(JSON))  # [{product_id, name, qty, price_paise}]
    created_at: datetime = Field(default_factory=_utcnow, sa_column=Column(DateTime(timezone=True)))
