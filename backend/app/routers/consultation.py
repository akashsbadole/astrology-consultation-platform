import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.models.astrologer import Astrologer, AstrologerStatus
from app.models.consultation import Consultation, ConsultationStatus
from app.models.user import User
from app.models.wallet import Wallet
from app.schemas.consultation import ConsultationOut, RequestConsultationRequest
from app.services.billing_service import FREE_SESSION_SECONDS, settle

router = APIRouter(prefix="/consultations", tags=["consultations"])


@router.get("")
async def list_consultations(
    page: int = 1,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    page_size = 20
    # If user is an astrologer, filter to their consultations
    astrologer_result = await session.exec(select(Astrologer).where(Astrologer.user_id == user.id))
    astrologer = astrologer_result.first()

    query = select(Consultation)
    if astrologer:
        query = query.where(Consultation.astrologer_id == astrologer.id)
    else:
        query = query.where(Consultation.client_id == user.id)

    from sqlmodel import func
    count_result = await session.exec(select(func.count()).select_from(query.subquery()))
    total = count_result.one()
    pages = max(1, (total + page_size - 1) // page_size)

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await session.exec(query)
    items = result.all()
    return {
        "items": [ConsultationOut.model_validate(c) for c in items],
        "total": total,
        "page": page,
        "pages": pages,
    }


async def _has_ever_had_a_consultation(session: AsyncSession, client_id: uuid.UUID) -> bool:
    result = await session.exec(select(Consultation).where(Consultation.client_id == client_id))
    return result.first() is not None


@router.post("/request", response_model=ConsultationOut, status_code=status.HTTP_201_CREATED)
async def request_consultation(
    body: RequestConsultationRequest, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)
):
    astrologer = await session.get(Astrologer, body.astrologer_id)
    if astrologer is None or astrologer.status != AstrologerStatus.active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Astrologer not available")
    if not astrologer.is_online:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Astrologer is currently offline")

    is_first_session = not await _has_ever_had_a_consultation(session, user.id)

    if not is_first_session:
        wallet_result = await session.exec(select(Wallet).where(Wallet.user_id == user.id))
        wallet = wallet_result.first()
        min_required = astrologer.rate_per_minute_paise
        if wallet is None or wallet.balance_paise < min_required:
            raise HTTPException(
                status.HTTP_402_PAYMENT_REQUIRED,
                detail="Insufficient wallet balance to start a consultation. Please recharge.",
            )

    consultation = Consultation(
        client_id=user.id, astrologer_id=astrologer.id, mode=body.mode,
        status=ConsultationStatus.matching,
        is_free_session=is_first_session,
        free_seconds_remaining=FREE_SESSION_SECONDS if is_first_session else 0,
    )
    session.add(consultation)
    await session.commit()
    await session.refresh(consultation)
    return consultation


@router.post("/{consultation_id}/accept", response_model=ConsultationOut)
async def accept_consultation(
    consultation_id: uuid.UUID, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)
):
    consultation = await session.get(Consultation, consultation_id)
    if consultation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Consultation not found")

    astrologer = await session.get(Astrologer, consultation.astrologer_id)
    if astrologer.user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not your consultation to accept")
    if consultation.status != ConsultationStatus.matching:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=f"Consultation is not in matching state (currently: {consultation.status})")

    consultation.status = ConsultationStatus.active
    from datetime import datetime, timezone

    consultation.started_at = datetime.now(timezone.utc)
    session.add(consultation)
    await session.commit()
    await session.refresh(consultation)
    return consultation


@router.post("/{consultation_id}/end", response_model=ConsultationOut)
async def end_consultation(
    consultation_id: uuid.UUID, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)
):
    consultation = await session.get(Consultation, consultation_id)
    if consultation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Consultation not found")

    astrologer = await session.get(Astrologer, consultation.astrologer_id)
    is_party = user.id == consultation.client_id or user.id == astrologer.user_id
    if not is_party:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not a party to this consultation")

    if consultation.status != ConsultationStatus.active:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Consultation is not active")

    return await settle(session, consultation.id, reason="manual_end")


@router.get("/{consultation_id}", response_model=ConsultationOut)
async def get_consultation(
    consultation_id: uuid.UUID, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)
):
    consultation = await session.get(Consultation, consultation_id)
    if consultation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Consultation not found")
    astrologer = await session.get(Astrologer, consultation.astrologer_id)
    if user.id != consultation.client_id and user.id != astrologer.user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Consultation not found")
    return consultation
