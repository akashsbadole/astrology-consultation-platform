import uuid

from pydantic import BaseModel, Field

from app.models.store import OrderStatus, ProductCategory


class ProductOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    category: ProductCategory
    price_paise: int
    stock_quantity: int
    image_url: str | None

    class Config:
        from_attributes = True


class CheckoutItem(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(ge=1, le=20)


class CheckoutRequest(BaseModel):
    items: list[CheckoutItem] = Field(min_length=1)
    payment_method: str = Field(pattern="^(wallet|razorpay)$")


class OrderOut(BaseModel):
    id: uuid.UUID
    status: OrderStatus
    total_paise: int
    items: list[dict]

    class Config:
        from_attributes = True
