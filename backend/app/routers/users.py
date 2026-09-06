from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.auth import UpdateProfileRequest, UserPublic

router = APIRouter(prefix="/users", tags=["users"])


@router.patch("/me", response_model=UserPublic)
async def update_profile(
    body: UpdateProfileRequest, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)
):
    # Deliberately does NOT allow changing email or password here — email
    # changes need re-verification and interact with Google-linked
    # accounts; password changes go through the dedicated (rate-limited,
    # current-password-checked) flow, not a generic profile PATCH.
    if body.full_name is not None:
        user.full_name = body.full_name
    if body.avatar_url is not None:
        user.avatar_url = body.avatar_url
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return UserPublic.model_validate(user)
