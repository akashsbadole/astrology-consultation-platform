import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user, require_role
from app.models.astrologer import Astrologer, AstrologerStatus, Review
from app.models.user import User, UserRole
from app.schemas.astrologer import (
    ApplyRequest,
    AstrologerPublic,
    ReviewCreate,
    ReviewOut,
    StatusUpdateRequest,
    UpdateAvailabilityRequest,
    UpdateRateRequest,
)
from app.services.ranking import ranking_score

router = APIRouter(prefix="/astrologers", tags=["astrologers"])


def _to_public(astrologer: Astrologer, full_name: str | None) -> AstrologerPublic:
    return AstrologerPublic(
        id=astrologer.id, user_id=astrologer.user_id, full_name=full_name, bio=astrologer.bio,
        experience_years=astrologer.experience_years, specializations=astrologer.specializations,
        languages=astrologer.languages, rate_per_minute_paise=astrologer.rate_per_minute_paise,
        is_online=astrologer.is_online, avg_rating=astrologer.avg_rating,
        rating_count=astrologer.rating_count, status=astrologer.status,
    )


@router.post("/apply", status_code=status.HTTP_201_CREATED)
async def apply(body: ApplyRequest, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    if user.role != UserRole.astrologer:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Only astrologer-role accounts can apply")

    existing = await session.exec(select(Astrologer).where(Astrologer.user_id == user.id))
    if existing.first() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Application already submitted")

    astrologer = Astrologer(
        user_id=user.id, bio=body.bio, experience_years=body.experience_years,
        specializations=body.specializations, languages=body.languages,
    )
    session.add(astrologer)
    await session.commit()
    await session.refresh(astrologer)
    return _to_public(astrologer, user.full_name)


@router.get("", response_model=list[AstrologerPublic])
async def search(
    session: AsyncSession = Depends(get_session),
    specialization: str | None = None,
    language: str | None = None,
    online_only: bool = False,
    limit: int = 20,
    offset: int = 0,
):
    result = await session.exec(select(Astrologer).where(Astrologer.status == AstrologerStatus.active))
    astrologers = result.all()

    if specialization:
        astrologers = [a for a in astrologers if specialization in a.specializations]
    if language:
        astrologers = [a for a in astrologers if language in a.languages]
    if online_only:
        astrologers = [a for a in astrologers if a.is_online]

    astrologers.sort(key=lambda a: ranking_score(a.avg_rating, a.rating_count, a.is_online), reverse=True)
    page = astrologers[offset : offset + limit]

    results = []
    for a in page:
        owner = await session.get(User, a.user_id)
        results.append(_to_public(a, owner.full_name if owner else None))
    return results


@router.get("/{astrologer_id}", response_model=AstrologerPublic)
async def get_astrologer(astrologer_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    astrologer = await session.get(Astrologer, astrologer_id)
    if astrologer is None or astrologer.status != AstrologerStatus.active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Astrologer not found")
    owner = await session.get(User, astrologer.user_id)
    return _to_public(astrologer, owner.full_name if owner else None)


@router.patch("/me/availability", response_model=AstrologerPublic)
async def update_availability(
    body: UpdateAvailabilityRequest, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)
):
    result = await session.exec(select(Astrologer).where(Astrologer.user_id == user.id))
    astrologer = result.first()
    if astrologer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No astrologer profile for this account")
    astrologer.is_online = body.is_online
    astrologer.last_active_at = datetime.now(timezone.utc)
    session.add(astrologer)
    await session.commit()
    await session.refresh(astrologer)
    return _to_public(astrologer, user.full_name)


@router.patch("/me/rate", response_model=AstrologerPublic)
async def update_rate(
    body: UpdateRateRequest, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)
):
    result = await session.exec(select(Astrologer).where(Astrologer.user_id == user.id))
    astrologer = result.first()
    if astrologer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No astrologer profile for this account")
    astrologer.rate_per_minute_paise = body.rate_per_minute_paise  # bounds enforced by the schema's Field(ge=, le=)
    session.add(astrologer)
    await session.commit()
    await session.refresh(astrologer)
    return _to_public(astrologer, user.full_name)


@router.patch("/{astrologer_id}/status", dependencies=[Depends(require_role(UserRole.admin))])
async def update_status(
    astrologer_id: uuid.UUID, body: StatusUpdateRequest, session: AsyncSession = Depends(get_session)
):
    astrologer = await session.get(Astrologer, astrologer_id)
    if astrologer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Astrologer not found")
    astrologer.status = body.status
    session.add(astrologer)
    await session.commit()
    return {"id": str(astrologer.id), "status": astrologer.status}


@router.get("/{astrologer_id}/reviews", response_model=list[ReviewOut])
async def list_reviews(astrologer_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    result = await session.exec(
        select(Review).where(Review.astrologer_id == astrologer_id).order_by(Review.created_at.desc())
    )
    return result.all()


@router.post("/{astrologer_id}/reviews", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
async def create_review(
    astrologer_id: uuid.UUID, body: ReviewCreate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)
):
    astrologer = await session.get(Astrologer, astrologer_id)
    if astrologer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Astrologer not found")

    existing = await session.exec(select(Review).where(Review.consultation_id == body.consultation_id))
    if existing.first() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="This consultation has already been reviewed")

    review = Review(
        astrologer_id=astrologer_id, client_id=user.id, consultation_id=body.consultation_id,
        rating=body.rating, comment=body.comment,
    )
    session.add(review)

    # Recompute the running average incrementally rather than re-scanning
    # every review on every write.
    new_count = astrologer.rating_count + 1
    astrologer.avg_rating = (astrologer.avg_rating * astrologer.rating_count + body.rating) / new_count
    astrologer.rating_count = new_count
    session.add(astrologer)

    await session.commit()
    await session.refresh(review)
    return review
