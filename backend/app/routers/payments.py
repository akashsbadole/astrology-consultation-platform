"""
This is the ONE endpoint on the entire platform with no user JWT — its
only protection is the signature check, which happens first, before any
payload parsing, no exceptions.
"""
import json

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.db import get_session
from app.core.razorpay_client import verify_webhook_signature
from app.models.payment import PaymentOrder, PaymentOrderStatus, PaymentPurpose
from app.models.wallet import TransactionType, Wallet
from app.services.wallet_service import credit

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/razorpay/webhook")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(default=""),
    session: AsyncSession = Depends(get_session),
):
    raw_body = await request.body()

    if not verify_webhook_signature(raw_body, x_razorpay_signature):
        # Reject BEFORE parsing the payload at all — an unverified caller
        # gets no information back beyond "no."
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid signature")

    event = json.loads(raw_body)
    event_type = event.get("event")

    if event_type != "payment.captured":
        # Always return 200 for events we don't act on — Razorpay retries
        # on non-200/timeout, and there's nothing to retry here.
        return {"status": "ignored", "event": event_type}

    razorpay_order_id = event["payload"]["payment"]["entity"]["order_id"]

    result = await session.exec(select(PaymentOrder).where(PaymentOrder.razorpay_order_id == razorpay_order_id))
    order = result.first()
    if order is None:
        # An event for an order we have no record of — log and ignore
        # rather than error, since erroring makes Razorpay retry forever.
        return {"status": "unknown_order"}

    if order.status == PaymentOrderStatus.completed:
        # Already processed (Razorpay can send the same webhook more than
        # once) — this is what makes the handler safe to call twice for
        # the same event, not just once.
        return {"status": "already_processed"}

    if order.purpose == PaymentPurpose.wallet_recharge:
        wallet_result = await session.exec(select(Wallet).where(Wallet.user_id == order.user_id))
        wallet = wallet_result.first()
        if wallet is not None:
            await credit(session, wallet.id, order.amount_paise, TransactionType.recharge, reference_id=order.id)

    order.status = PaymentOrderStatus.completed
    session.add(order)
    await session.commit()

    return {"status": "processed"}
