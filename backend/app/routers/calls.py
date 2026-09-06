import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.livekit_client import create_room_token
from app.models.astrologer import Astrologer
from app.models.consultation import Consultation
from app.models.user import User

router = APIRouter(prefix="/calls", tags=["calls"])


@router.post("/{consultation_id}/token")
async def get_call_token(
    consultation_id: uuid.UUID, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)
):
    consultation = await session.get(Consultation, consultation_id)
    if consultation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Consultation not found")

    astrologer = await session.get(Astrologer, consultation.astrologer_id)
    is_party = user.id == consultation.client_id or (astrologer and user.id == astrologer.user_id)
    if not is_party:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not a party to this consultation")

    # Room name = consultation ID — the client never names or creates its
    # own room; this is the only place a valid token can come from.
    token = create_room_token(room_name=str(consultation_id), identity=str(user.id))
    return {"token": token, "room_name": str(consultation_id)}
