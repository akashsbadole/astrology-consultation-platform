import uuid

from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)
    role: UserRole

    def validate_self_registerable_role(self) -> None:
        """Admin accounts are never created through self-registration —
        they're provisioned manually (seed script / an existing admin).
        Called explicitly in the route so the rule is visible, not buried
        in a validator someone might not think to check."""
        if self.role == UserRole.admin:
            raise ValueError("Admin accounts cannot self-register")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    id_token: str
    role: UserRole


class RefreshRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class VerifyEmailRequest(BaseModel):
    token: str


class UpdateProfileRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    avatar_url: str | None = Field(default=None, max_length=500)


class UserPublic(BaseModel):
    id: uuid.UUID
    email: str
    role: UserRole
    full_name: str | None
    avatar_url: str | None
    email_verified: bool

    class Config:
        from_attributes = True


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str | None = None  # omitted for web — it's set as an httpOnly cookie instead
    token_type: str = "bearer"
    user: UserPublic
