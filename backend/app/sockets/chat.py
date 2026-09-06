"""
Socket.IO chat, mounted onto the FastAPI app (fastapi-socketio). Room
membership is verified server-side against the actual consultation
participants — a client-sent consultation_id alone is never trusted.
"""
import uuid

from fastapi_socketio import SocketManager
from sqlmodel import select

from app.core.db import get_session
from app.core.security import decode_access_token
from app.models.astrologer import Astrologer
from app.models.chat import ChatMessage
from app.models.consultation import Consultation, ConsultationStatus


async def _verify_party(session, consultation_id: str, user_id: str) -> Consultation | None:
    try:
        consultation = await session.get(Consultation, uuid.UUID(consultation_id))
    except ValueError:
        return None
    if consultation is None:
        return None
    astrologer = await session.get(Astrologer, consultation.astrologer_id)
    if str(consultation.client_id) == user_id or (astrologer and str(astrologer.user_id) == user_id):
        return consultation
    return None


def register_chat_events(sio: SocketManager):
    @sio.on("connect")
    async def connect(sid, environ, auth):
        token = (auth or {}).get("token")
        payload = decode_access_token(token) if token else None
        if payload is None:
            return False  # reject the connection
        await sio.save_session(sid, {"user_id": payload["sub"]})

    @sio.on("join_room")
    async def join_room(sid, data):
        session_data = await sio.get_session(sid)
        user_id = session_data["user_id"]
        consultation_id = data.get("consultationId")

        async for session in get_session():
            consultation = await _verify_party(session, consultation_id, user_id)
            if consultation is None:
                await sio.emit("error", {"message": "Not authorized for this consultation"}, to=sid)
                return
            break

        await sio.enter_room(sid, consultation_id)

    @sio.on("send_message")
    async def send_message(sid, data):
        session_data = await sio.get_session(sid)
        user_id = session_data["user_id"]
        consultation_id = data.get("consultationId")
        text = data.get("text")
        attachment_url = data.get("attachmentUrl")

        async for session in get_session():
            consultation = await _verify_party(session, consultation_id, user_id)
            if consultation is None:
                await sio.emit("error", {"message": "Not authorized"}, to=sid)
                return

            message = ChatMessage(
                consultation_id=uuid.UUID(consultation_id), sender_id=uuid.UUID(user_id),
                text=text, attachment_url=attachment_url,
            )
            session.add(message)
            await session.commit()
            await session.refresh(message)
            break

        await sio.emit(
            "message_received",
            {"id": str(message.id), "senderId": user_id, "text": text, "attachmentUrl": attachment_url,
             "createdAt": message.created_at.isoformat()},
            room=consultation_id,
        )

    @sio.on("typing")
    async def typing(sid, data):
        consultation_id = data.get("consultationId")
        await sio.emit("typing", {}, room=consultation_id, skip_sid=sid)
