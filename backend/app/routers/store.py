import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.models.store import Order, OrderStatus, Product
from app.models.user import User
from app.models.wallet import TransactionType, Wallet
from app.schemas.store import CheckoutRequest, OrderOut, ProductOut
from app.services.wallet_service import WalletError, debit

router = APIRouter(prefix="/store", tags=["store"])


@router.get("/products", response_model=list[ProductOut])
async def list_products(category: str | None = None, session: AsyncSession = Depends(get_session)):
    query = select(Product).where(Product.is_active == True)  # noqa: E712
    if category:
        query = query.where(Product.category == category)
    result = await session.exec(query)
    return result.all()


@router.get("/products/{product_id}", response_model=ProductOut)
async def get_product(product_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    product = await session.get(Product, product_id)
    if product is None or not product.is_active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.post("/checkout", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def checkout(
    body: CheckoutRequest, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)
):
    line_items = []
    total_paise = 0

    for item in body.items:
        product = await session.get(Product, item.product_id)
        if product is None or not product.is_active:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"Product {item.product_id} not found")
        if product.category != "puja_service" and product.stock_quantity < item.quantity:
            raise HTTPException(status.HTTP_409_CONFLICT, detail=f"Insufficient stock for {product.name}")

        line_total = product.price_paise * item.quantity
        total_paise += line_total
        line_items.append(
            {"product_id": str(product.id), "name": product.name, "quantity": item.quantity, "price_paise": product.price_paise}
        )

    order = Order(user_id=user.id, total_paise=total_paise, items=line_items, status=OrderStatus.pending_payment)

    if body.payment_method == "wallet":
        wallet_result = await session.exec(select(Wallet).where(Wallet.user_id == user.id))
        wallet = wallet_result.first()
        result = await debit(session, wallet.id, total_paise, TransactionType.store_purchase, reference_id=order.id)
        if result == WalletError.INSUFFICIENT_BALANCE:
            raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, detail="Insufficient wallet balance")
        order.status = OrderStatus.paid
    # razorpay path: order stays pending_payment until the shared webhook confirms it (see routers/payments.py)

    for item in body.items:
        if body.payment_method == "wallet":
            product = await session.get(Product, item.product_id)
            if product.category != "puja_service":
                product.stock_quantity -= item.quantity
                session.add(product)

    session.add(order)
    await session.commit()
    await session.refresh(order)
    return order


@router.get("/orders", response_model=list[OrderOut])
async def list_orders(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Order).where(Order.user_id == user.id).order_by(Order.created_at.desc()))
    return result.all()
