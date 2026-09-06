import uuid

from fastapi import APIRouter, Depends, Request
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.core.razorpay_client import create_order
from app.models.payment import PaymentOrder, PaymentPurpose
from app.models.user import User
from app.models.wallet import WalletTransaction
from app.schemas.wallet import RechargeOrderRequest, TransactionOut, WalletBalance
from app.services.wallet_service import ensure_wallet

router = APIRouter(prefix="/wallet", tags=["wallet"])


@router.get("/balance", response_model=WalletBalance)
async def get_balance(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    wallet = await ensure_wallet(session, user.id)
    return WalletBalance(balance_paise=wallet.balance_paise)


@router.get("/transactions", response_model=list[TransactionOut])
async def list_transactions(
    user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session), limit: int = 50, offset: int = 0
):
    wallet = await ensure_wallet(session, user.id)
    result = await session.exec(
        select(WalletTransaction)
        .where(WalletTransaction.wallet_id == wallet.id)
        .order_by(WalletTransaction.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return result.all()


@router.post("/recharge/order")
@limiter.limit("10/hour")
async def create_recharge_order(
    request: Request,
    body: RechargeOrderRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # The wallet is NOT credited here — only on the verified webhook
    # (routers/payments.py). This is the one path that must never trust
    # the client's "payment succeeded" callback alone.
    razorpay_order = create_order(
        amount_paise=body.amount_paise,
        receipt=str(uuid.uuid4()),
        notes={"purpose": PaymentPurpose.wallet_recharge.value, "user_id": str(user.id)},
    )

    order_record = PaymentOrder(
        razorpay_order_id=razorpay_order["id"],
        user_id=user.id,
        purpose=PaymentPurpose.wallet_recharge,
        amount_paise=body.amount_paise,
    )
    session.add(order_record)
    await session.commit()

    return {"razorpay_order_id": razorpay_order["id"], "amount_paise": body.amount_paise, "currency": "INR"}
