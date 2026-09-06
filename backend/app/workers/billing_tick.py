"""
Runs every TICK_INTERVAL_SECONDS via APScheduler (in-process — see
MVP-FASTAPI-NEXTJS.md Section 8 for why this is the right call at
single-instance scale, and when to graduate to Celery).
"""
from sqlmodel import select

from app.core.db import get_session
from app.models.consultation import Consultation, ConsultationStatus
from app.services.billing_service import tick

TICK_INTERVAL_SECONDS = 10


async def run_billing_tick(sio=None):
    async for session in get_session():
        result = await session.exec(select(Consultation).where(Consultation.status == ConsultationStatus.active))
        active_consultations = result.all()

        for consultation in active_consultations:
            outcome = await tick(session, consultation.id, TICK_INTERVAL_SECONDS)
            if sio is not None:
                if outcome["action"] == "session_ended":
                    await sio.emit("session_ended", {"reason": outcome["reason"]}, room=str(consultation.id))
                elif outcome["action"] in ("billed", "free_tick"):
                    await sio.emit(
                        "balance_update",
                        {k: v for k, v in outcome.items() if k != "action"},
                        room=str(consultation.id),
                    )
        break
