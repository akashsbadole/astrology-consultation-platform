"""
Centralized settings, loaded from environment variables.
Never hardcode secrets here — this file only defines shape and defaults.
"""
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_MIN_SECRET_LENGTH = 32
_KNOWN_PLACEHOLDER_MARKERS = ("REPLACE_ME", "change-me", "your-web-client-id", "example.com")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str

    # JWT
    jwt_access_secret: str
    jwt_refresh_secret: str
    jwt_access_expire_minutes: int = 15
    jwt_refresh_expire_days: int = 30
    jwt_algorithm: str = "HS256"

    # Google OAuth — the web client ID is what verifies tokens from ALL platforms
    # (Android/iOS client IDs are configured on the mobile app side only; the
    # backend always verifies against the single web client ID as the audience).
    google_web_client_id: str

    # CORS
    allowed_origins: list[str] = ["http://localhost:3000"]
    app_base_url: str = "http://localhost:3000"  # used to build links in password-reset/verification emails

    # Redis is only required in production. Locally (environment != "production")
    # the app uses in-memory fallbacks for rate limiting, login lockout, OTP and
    # token stores, so it runs with no Redis server at all. Set ENVIRONMENT=
    # production (or REDIS_ENABLED=true) to switch Redis on.
    redis_url: str = "redis://localhost:6379"
    environment: str = "development"  # "development" | "production"
    redis_enabled: bool | None = None  # explicit override of the default below

    # Refresh-token cookie security. `Secure` cookies are refused by browsers
    # over plain http://, which silently breaks the web login flow in local dev
    # (the cookie is dropped, so the middleware bounces every navigation back to
    # /login). Only enable `Secure` in production, where TLS is present.
    cookie_secure: bool | None = None  # explicit override; else derived from environment

    @property
    def use_redis(self) -> bool:
        if self.redis_enabled is not None:
            return self.redis_enabled
        return self.environment.strip().lower() == "production"

    @property
    def secure_cookies(self) -> bool:
        if self.cookie_secure is not None:
            return self.cookie_secure
        return self.environment.strip().lower() == "production"

    @field_validator("jwt_access_secret", "jwt_refresh_secret")
    @classmethod
    def _reject_weak_or_placeholder_secrets(cls, value: str, info) -> str:
        # Fail loudly at startup rather than silently booting with a
        # secret an attacker could guess or find in this repo's own
        # .env.example. A container that crash-loops on a bad secret is a
        # far better failure mode than one that runs "successfully" with
        # JWTs anyone can forge.
        if any(marker in value for marker in _KNOWN_PLACEHOLDER_MARKERS):
            raise ValueError(
                f"{info.field_name} looks like a placeholder value from .env.example — "
                "generate a real one: python3 -c \"import secrets; print(secrets.token_urlsafe(48))\""
            )
        if len(value) < _MIN_SECRET_LENGTH:
            raise ValueError(f"{info.field_name} must be at least {_MIN_SECRET_LENGTH} characters")
        return value

    @field_validator("jwt_refresh_secret")
    @classmethod
    def _reject_reused_access_secret(cls, value: str, info) -> str:
        access_secret = info.data.get("jwt_access_secret")
        if access_secret is not None and value == access_secret:
            raise ValueError(
                "jwt_refresh_secret must be DIFFERENT from jwt_access_secret — "
                "reusing one secret for both means compromising either token type compromises both"
            )
        return value


settings = Settings()
