"""
Verifies a Google ID token sent up from the mobile app after
@react-native-google-signin/google-signin completes on-device.

The backend NEVER trusts the mobile app's claim of "this is who signed in" —
it independently re-verifies the token against Google's servers using the
official google-auth library, and checks the audience (`aud`) matches our
own web client ID, which is what prevents a token minted for a different
app from being replayed against this backend.
"""
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.core.config import settings

_google_request = google_requests.Request()


class GoogleTokenInvalid(Exception):
    pass


def verify_google_id_token(token: str) -> dict:
    """
    Returns the verified token payload on success:
        { "email": ..., "email_verified": True, "name": ..., "picture": ..., "sub": <google user id> }
    Raises GoogleTokenInvalid on any verification failure — callers should
    turn this into a 401, never a generic 500.
    """
    try:
        idinfo = id_token.verify_oauth2_token(
            token, _google_request, settings.google_web_client_id
        )
    except ValueError as exc:
        raise GoogleTokenInvalid(str(exc)) from exc

    if not idinfo.get("email_verified", False):
        raise GoogleTokenInvalid("Google account email is not verified")

    return idinfo
