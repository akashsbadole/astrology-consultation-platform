import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.db import get_session
from app.core.deps import require_role
from app.models.astrologer import Astrologer, AstrologerStatus
from app.models.consultation import Consultation, ConsultationStatus
from app.models.user import User, UserRole

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_role(UserRole.admin))])


@router.get("/astrologers/pending")
async def pending_astrologers(session: AsyncSession = Depends(get_session)):
    result = await session.exec(
        select(Astrologer).where(Astrologer.status.in_([AstrologerStatus.pending, AstrologerStatus.interview]))
    )
    astrologers = result.all()
    out = []
    for a in astrologers:
        owner = await session.get(User, a.user_id)
        out.append({
            "id": str(a.id), "email": owner.email if owner else None, "full_name": owner.full_name if owner else None,
            "status": a.status, "experience_years": a.experience_years, "specializations": a.specializations,
        })
    return out


@router.patch("/astrologers/{astrologer_id}/approve")
async def approve_astrologer(astrologer_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    astrologer = await session.get(Astrologer, astrologer_id)
    if astrologer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Astrologer not found")
    # pending -> interview -> probation -> active, one step per call —
    # mirrors the real verification funnel rather than a single toggle.
    transitions = {
        AstrologerStatus.pending: AstrologerStatus.interview,
        AstrologerStatus.interview: AstrologerStatus.probation,
        AstrologerStatus.probation: AstrologerStatus.active,
    }
    next_status = transitions.get(astrologer.status)
    if next_status is None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=f"Cannot advance from status {astrologer.status}")
    astrologer.status = next_status
    session.add(astrologer)
    await session.commit()
    return {"id": str(astrologer.id), "status": astrologer.status}


@router.patch("/astrologers/{astrologer_id}/reject")
async def reject_astrologer(astrologer_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    astrologer = await session.get(Astrologer, astrologer_id)
    if astrologer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Astrologer not found")
    astrologer.status = AstrologerStatus.rejected
    session.add(astrologer)
    await session.commit()
    return {"id": str(astrologer.id), "status": astrologer.status}


@router.patch("/users/{user_id}/deactivate")
async def deactivate_user(user_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_active = False
    session.add(user)
    await session.commit()
    return {"id": str(user.id), "is_active": user.is_active}


@router.get("/analytics/revenue")
async def revenue_summary(session: AsyncSession = Depends(get_session)):
    result = await session.exec(
        select(func.count(Consultation.id), func.sum(Consultation.total_billed_paise), func.sum(Consultation.commission_paise))
        .where(Consultation.status == ConsultationStatus.ended)
    )
    count, total_billed, total_commission = result.first()
    return {
        "completed_consultations": count or 0,
        "total_billed_paise": total_billed or 0,
        "total_commission_paise": total_commission or 0,
    }
