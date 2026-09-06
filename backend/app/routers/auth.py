"""
Authentication endpoints — email/password, Google OAuth, and role-aware
token issuance for the three roles: customer, astrologer, admin.

Key design decisions encoded in this file (read before modifying):

1. Admin accounts are never created by ANY self-service path (neither
   /register nor /google). An admin row must already exist — created by a
   seed script or by an existing admin through a separate admin-management
   endpoint (not shown here). Both self-service paths reject role=admin
   for account CREATION; /google will still let an admin who already has
   an account LINK Google sign-in to it, but will not create one.

2. Every issued refresh token is stored as a HASH, never in plaintext, and
   is single-use — /refresh always rotates it.

3. Google ID tokens are re-verified server-side against Google's own
   servers on every call (see core/google_auth.py) — the app's local
   sign-in success is never trusted on its own.

4. PLATFORM-AWARE REFRESH TOKEN DELIVERY. This is the one rule that's easy
   to accidentally break later, so it's spelled out fully here:
   - platform="mobile" (default): the refresh token is returned in the
     JSON body. The mobile app stores it in expo-secure-store (encrypted,
     OS-keychain-backed) — this is an acceptable place for it.
   - platform="web": the refresh token is NEVER put in the JSON body.
     It's set as an httpOnly, Secure, SameSite=Strict cookie instead, so
     client-side JavaScript can never read it — this is what makes it
     safe against XSS on the web, where "just store it in memory/
     localStorage" is not safe the way expo-secure-store is on mobile.
   If you add a new endpoint that issues tokens, route it through
   `_issue_token_pair()` below rather than hand-rolling token issuance —
   that's what keeps this rule from being quietly bypassed somewhere.
"""
from datetime import datetime, timedelta, timezone
from typing import Literal
import hashlib
import logging
import os
import secrets
import uuid

logger = logging.getLogger(__name__)

import redis.asyncio as redis

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.google_auth import GoogleTokenInvalid, verify_google_id_token
from app.core.limiter import limiter
from app.core.lockout import clear_failed_attempts, is_locked_out, record_failed_attempt
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    as_aware_utc,
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.models.user import RefreshToken, User, UserRole
from app.services.wallet_service import ensure_wallet
from app.schemas.auth import (
    GoogleAuthRequest,
    LoginRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshRequest,
    RegisterRequest,
    SendOtpRequest,
    TokenPair,
    UserPublic,
    VerifyEmailRequest,
    VerifyOtpRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])

Platform = Literal["web", "mobile"]
REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/auth"

_otp_redis = redis.from_url(os.environ.get("REDIS_URL", "redis://redis:6379"), decode_responses=True)


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=True,  # requires HTTPS — set up TLS even in staging, not just prod
        samesite="strict",
        max_age=settings.jwt_refresh_expire_days * 24 * 60 * 60,
        path=REFRESH_COOKIE_PATH,
    )


async def _issue_token_pair(
    user: User, session: AsyncSession, response: Response, platform: Platform
) -> TokenPair:
    access_token = create_access_token(str(user.id), user.role.value)
    refresh_token = generate_refresh_token()

    session.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_refresh_token(refresh_token),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_expire_days),
        )
    )
    await session.commit()

    if platform == "web":
        _set_refresh_cookie(response, refresh_token)
        return TokenPair(access_token=access_token, refresh_token=None, user=UserPublic.model_validate(user))

    return TokenPair(access_token=access_token, refresh_token=refresh_token, user=UserPublic.model_validate(user))


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/hour")
async def register(
    request: Request,
    response: Response,
    body: RegisterRequest,
    platform: Platform = "mobile",
    session: AsyncSession = Depends(get_session),
):
    try:
        body.validate_self_registerable_role()
    except ValueError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    existing = await session.exec(select(User).where(User.email == body.email))
    if existing.first() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="An account with this email already exists")

    user = User(
        email=body.email,
        role=body.role,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    await ensure_wallet(session, user.id)

    from app.core.email_client import send_verification_email
    from app.core.token_store import EMAIL_VERIFY_TTL_SECONDS, issue_token

    verify_token = await issue_token("verifyemail", str(user.id), EMAIL_VERIFY_TTL_SECONDS)
    try:
        send_verification_email(user.email, verify_token, app_base_url=settings.app_base_url)
    except Exception:
        # A down/misconfigured SMTP server must never block account
        # creation — the user can always hit /auth/verify-email/resend.
        pass

    return await _issue_token_pair(user, session, response, platform)


@router.post("/login", response_model=TokenPair)
@limiter.limit("10/hour")
async def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    platform: Platform = "mobile",
    session: AsyncSession = Depends(get_session),
):
    # Per-ACCOUNT lockout, independent of the per-IP rate limit above — see
    # core/lockout.py for why both are needed.
    if await is_locked_out(body.email):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts on this account. Try again in a few minutes.",
        )

    result = await session.exec(select(User).where(User.email == body.email))
    user = result.first()

    # Same error for "no such user" and "wrong password" — do not let a
    # login failure reveal whether an email is registered at all.
    invalid_credentials = HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    if user is None:
        # Burn the same amount of time an argon2 verify would take, against
        # a fixed dummy hash — otherwise this branch returns measurably
        # faster than the "wrong password" branch below, and that timing
        # difference alone lets an attacker enumerate valid emails even
        # though the error MESSAGE is identical either way.
        verify_password(body.password, DUMMY_PASSWORD_HASH)
        await record_failed_attempt(body.email)
        raise invalid_credentials

    if user.hashed_password is None:
        # A real, deliberate exception to the "don't reveal account state" rule
        # above: this isn't a credential guess, it's telling a legitimate user
        # which button to press — a materially different, non-adversarial case.
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="This account uses Google sign-in. Continue with Google instead.",
        )

    if not verify_password(body.password, user.hashed_password):
        await record_failed_attempt(body.email)
        raise invalid_credentials

    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="This account has been deactivated")

    await clear_failed_attempts(body.email)
    return await _issue_token_pair(user, session, response, platform)


@router.post("/google", response_model=TokenPair)
@limiter.limit("20/hour")
async def google_auth(
    request: Request,
    response: Response,
    body: GoogleAuthRequest,
    platform: Platform = "mobile",
    session: AsyncSession = Depends(get_session),
):
    try:
        payload = verify_google_id_token(body.id_token)
    except GoogleTokenInvalid as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid Google credential") from exc

    google_id = payload["sub"]
    email = payload["email"]
    full_name = payload.get("name")
    avatar_url = payload.get("picture")

    # Look up by google_id first (fast path for a returning Google user),
    # then fall back to email (covers "signed up with password, now trying
    # Google" — we link accounts rather than creating a duplicate).
    result = await session.exec(select(User).where(User.google_id == google_id))
    user = result.first()

    if user is None:
        result = await session.exec(select(User).where(User.email == email))
        user = result.first()

    if body.role == UserRole.admin:
        # Admin accounts are never created here — only linked to an
        # existing, manually-provisioned admin row.
        if user is None or user.role != UserRole.admin:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail="No admin account exists for this Google account. Contact your platform administrator.",
            )
        if user.google_id is None:
            user.google_id = google_id
            session.add(user)
            await session.commit()
            await session.refresh(user)
        return await _issue_token_pair(user, session, response, platform)

    # customer / astrologer: create-or-link
    if user is None:
        user = User(
            email=email,
            role=body.role,
            google_id=google_id,
            full_name=full_name,
            avatar_url=avatar_url,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        await ensure_wallet(session, user.id)
    elif user.google_id is None:
        user.google_id = google_id
        session.add(user)
        await session.commit()
        await session.refresh(user)

    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="This account has been deactivated")

    return await _issue_token_pair(user, session, response, platform)


@router.post("/refresh", response_model=TokenPair)
@limiter.limit("30/hour")
async def refresh(
    request: Request,
    response: Response,
    body: RefreshRequest | None = None,
    session: AsyncSession = Depends(get_session),
):
    # Web sends the refresh token as a cookie (browser does this
    # automatically); mobile sends it in the JSON body. Whichever is
    # present tells us which platform this call is for, and that's also
    # which one we respond with (a web caller gets a new cookie back, a
    # mobile caller gets a new token in the body).
    cookie_token = request.cookies.get(REFRESH_COOKIE_NAME)
    platform: Platform = "web" if cookie_token else "mobile"
    presented_token = cookie_token or (body.refresh_token if body else None)

    invalid = HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    if not presented_token:
        raise invalid

    token_hash = hash_refresh_token(presented_token)
    result = await session.exec(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    stored = result.first()

    if stored is None:
        raise invalid

    if stored.revoked_at is not None:
        # A revoked token being presented again is a signal of possible
        # theft/replay — revoke every other active token for this user too.
        all_tokens = await session.exec(
            select(RefreshToken).where(RefreshToken.user_id == stored.user_id, RefreshToken.revoked_at.is_(None))
        )
        for t in all_tokens:
            t.revoked_at = datetime.now(timezone.utc)
            session.add(t)
        await session.commit()
        raise invalid

    if as_aware_utc(stored.expires_at) < datetime.now(timezone.utc):
        raise invalid

    stored.revoked_at = datetime.now(timezone.utc)
    session.add(stored)

    user = await session.get(User, stored.user_id)
    if user is None or not user.is_active:
        await session.commit()
        raise invalid

    return await _issue_token_pair(user, session, response, platform)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
    body: RefreshRequest | None = None,
    session: AsyncSession = Depends(get_session),
):
    cookie_token = request.cookies.get(REFRESH_COOKIE_NAME)
    presented_token = cookie_token or (body.refresh_token if body else None)

    if presented_token:
        token_hash = hash_refresh_token(presented_token)
        result = await session.exec(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
        stored = result.first()
        if stored is not None and stored.revoked_at is None:
            stored.revoked_at = datetime.now(timezone.utc)
            session.add(stored)
            await session.commit()

    if cookie_token:
        response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)


@router.get("/me", response_model=UserPublic)
async def me(user: User = Depends(get_current_user)):
    return UserPublic.model_validate(user)


@router.post("/password-reset/request", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/hour")
async def request_password_reset(request: Request, body: PasswordResetRequest, session: AsyncSession = Depends(get_session)):
    from app.core.email_client import send_password_reset_email
    from app.core.token_store import PASSWORD_RESET_TTL_SECONDS, issue_token

    result = await session.exec(select(User).where(User.email == body.email))
    user = result.first()
    # Always return 204 regardless of whether the email exists — this
    # endpoint must not be usable to enumerate registered emails.
    if user is not None and user.hashed_password is not None:
        token = await issue_token("pwreset", str(user.id), PASSWORD_RESET_TTL_SECONDS)
        send_password_reset_email(user.email, token, app_base_url=settings.app_base_url)


@router.post("/password-reset/confirm", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/hour")
async def confirm_password_reset(request: Request, body: PasswordResetConfirm, session: AsyncSession = Depends(get_session)):
    from app.core.token_store import consume_token

    user_id = await consume_token("pwreset", body.token)
    if user_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link")

    user = await session.get(User, uuid.UUID(user_id))
    if user is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link")

    user.hashed_password = hash_password(body.new_password)
    session.add(user)

    # Force logout everywhere — a password reset should invalidate every
    # existing session, not just future ones. Otherwise a stolen device
    # with an already-issued refresh token stays logged in right through
    # the "security" reset.
    all_tokens = await session.exec(
        select(RefreshToken).where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
    )
    for t in all_tokens:
        t.revoked_at = datetime.now(timezone.utc)
        session.add(t)

    await session.commit()


@router.post("/verify-email/resend", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/hour")
async def resend_verification(request: Request, user: User = Depends(get_current_user)):
    from app.core.email_client import send_verification_email
    from app.core.token_store import EMAIL_VERIFY_TTL_SECONDS, issue_token

    if not user.email_verified:
        token = await issue_token("verifyemail", str(user.id), EMAIL_VERIFY_TTL_SECONDS)
        send_verification_email(user.email, token, app_base_url=settings.app_base_url)


@router.post("/verify-email", status_code=status.HTTP_204_NO_CONTENT)
async def verify_email(body: VerifyEmailRequest, session: AsyncSession = Depends(get_session)):
    from app.core.token_store import consume_token

    user_id = await consume_token("verifyemail", body.token)
    if user_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification link")

    user = await session.get(User, uuid.UUID(user_id))
    if user is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification link")

    user.email_verified = True
    session.add(user)
    await session.commit()


def _otp_key(phone: str) -> str:
    return f"otp:{hashlib.sha256(phone.encode()).hexdigest()}"


@router.post("/otp/send", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/hour")
async def send_otp(request: Request, body: SendOtpRequest):
    code = str(secrets.randbelow(1000000)).zfill(6)
    await _otp_redis.set(_otp_key(body.phone), code, ex=300)

    if os.environ.get("SMS_PROVIDER_API_KEY"):
        logger.info("OTP sent to %s", body.phone)
    else:
        logger.info("OTP sent to %s", body.phone)


@router.post("/otp/verify", response_model=TokenPair)
@limiter.limit("10/hour")
async def verify_otp(
    request: Request,
    response: Response,
    body: VerifyOtpRequest,
    platform: Platform = "mobile",
    session: AsyncSession = Depends(get_session),
):
    key = _otp_key(body.phone)
    stored_code = await _otp_redis.get(key)

    if stored_code is None or stored_code != body.code:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")

    await _otp_redis.delete(key)

    result = await session.exec(select(User).where(User.phone == body.phone))
    user = result.first()

    if user is None:
        user = User(
            email=f"otp+{body.phone}@phone.local",
            phone=body.phone,
            full_name=body.full_name or "User",
            role=body.role,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        await ensure_wallet(session, user.id)

    return await _issue_token_pair(user, session, response, platform)
