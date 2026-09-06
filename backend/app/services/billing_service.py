"""
The single most important piece of logic on the platform. Runs
identically underneath chat, audio, and video — one engine, not three.

The client NEVER decides billing. It only renders what this pushes to it.
"""
import uuid
from datetime import datetime, timezone

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.astrologer import Astrologer
from app.models.consultation import Consultation, ConsultationStatus
from app.models.wallet import TransactionType, Wallet
from app.services.wallet_service import WalletError, debit

DEFAULT_COMMISSION_RATE = 0.5  # 50/50 split - see astrology-platform-blueprint.md's Astrotalk benchmark
FREE_SESSION_SECONDS = 300      # 5 minutes


async def tick(session: AsyncSession, consultation_id: uuid.UUID, tick_interval_seconds: int) -> dict:
    """One billing tick for one consultation. Returns a dict describing
    what happened, for the caller (WS handler / scheduler) to act on —
    this function does not itself touch sockets or the scheduler."""
    consultation = await session.get(Consultation, consultation_id)
    if consultation is None or consultation.status != ConsultationStatus.active:
        return {"action": "noop"}

    if consultation.is_free_session and consultation.free_seconds_remaining > 0:
        consultation.free_seconds_remaining = max(0, consultation.free_seconds_remaining - tick_interval_seconds)
        session.add(consultation)
        await session.commit()
        return {"action": "free_tick", "free_seconds_remaining": consultation.free_seconds_remaining}

    astrologer = await session.get(Astrologer, consultation.astrologer_id)
    rate = astrologer.rate_per_minute_paise
    amount_to_debit = round(rate * (tick_interval_seconds / 60))

    client_wallet_result = await session.exec(select(Wallet).where(Wallet.user_id == consultation.client_id))
    client_wallet = client_wallet_result.first()

    result = await debit(session, client_wallet.id, amount_to_debit, TransactionType.consultation_debit, reference_id=consultation.id)

    if result == WalletError.INSUFFICIENT_BALANCE:
        await settle(session, consultation.id, reason="balance_exhausted")
        return {"action": "session_ended", "reason": "balance_exhausted"}

    consultation.total_billed_paise += amount_to_debit
    session.add(consultation)
    await session.commit()
    return {"action": "billed", "amount_paise": amount_to_debit, "total_billed_paise": consultation.total_billed_paise}


async def settle(session: AsyncSession, consultation_id: uuid.UUID, reason: str) -> Consultation:
    """Ends a consultation and computes the commission split. Astrologer
    earnings go to a pending-payout balance (not their real wallet) —
    payouts are batched (see BACKEND-SPEC.md Section 8), not instant."""
    consultation = await session.get(Consultation, consultation_id)
    consultation.status = ConsultationStatus.ended
    consultation.ended_at = datetime.now(timezone.utc)
    consultation.end_reason = reason
    consultation.commission_paise = round(consultation.total_billed_paise * DEFAULT_COMMISSION_RATE)
    session.add(consultation)
    await session.commit()
    await session.refresh(consultation)
    return consultation
