import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from sqlmodel import select
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


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Soft-delete: deactivate + anonymize PII per DPDP Act.
    The user row is kept for referential integrity but all PII is wiped."""
    from app.models.user import RefreshToken as RT
    from app.models.wallet import Wallet, WalletTransaction

    # Anonymize PII
    user.email = f"deleted_{user.id}@anonymized.local"
    user.phone = None
    user.full_name = None
    user.avatar_url = None
    user.google_id = None
    user.hashed_password = None
    user.is_active = False
    user.email_verified = False
    session.add(user)

    # Revoke all refresh tokens
    tokens = await session.exec(select(RT).where(RT.user_id == user.id, RT.revoked_at.is_(None)))
    for t in tokens:
        t.revoked_at = datetime.now(timezone.utc)
        session.add(t)

    # Anonymize wallet balance (keep ledger for audit)
    wallets = await session.exec(select(Wallet).where(Wallet.user_id == user.id))
    for w in wallets:
        w.balance_paise = 0
        session.add(w)

    await session.commit()
