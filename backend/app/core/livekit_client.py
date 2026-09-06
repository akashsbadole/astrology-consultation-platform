"""
LiveKit — self-hosted, Apache-2.0, built on WebRTC. Token issuance only
happens here, server-side; the client never names or creates its own
room. Requires a running LiveKit server (see docker-compose.yml) — token
generation itself is pure crypto and needs no network call, so it's
fully testable without one.
"""
import os

from livekit import api

LIVEKIT_API_KEY = os.environ.get("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.environ.get("LIVEKIT_API_SECRET", "")


def create_room_token(room_name: str, identity: str, ttl_seconds: int = 3600) -> str:
    token = (
        api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity(identity)
        .with_grants(api.VideoGrants(room_join=True, room=room_name))
        .with_ttl(__import__("datetime").timedelta(seconds=ttl_seconds))
    )
    return token.to_jwt()
