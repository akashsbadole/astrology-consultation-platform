"""
Real SMTP sending via Python's stdlib smtplib — works with any SMTP
provider (SES, Postmark, SendGrid's SMTP endpoint, or a real mail server)
by just setting the env vars. No provider-specific SDK lock-in.
"""
import os
import smtplib
from email.mime.text import MIMEText

SMTP_HOST = os.environ.get("SMTP_HOST", "localhost")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "1025"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM = os.environ.get("SMTP_FROM", "no-reply@example.com")
SMTP_USE_TLS = os.environ.get("SMTP_USE_TLS", "false").lower() == "true"


def send_email(to: str, subject: str, body: str) -> None:
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = to

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        if SMTP_USE_TLS:
            server.starttls()
        if SMTP_USER:
            server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM, [to], msg.as_string())


def send_password_reset_email(to: str, reset_token: str, app_base_url: str) -> None:
    link = f"{app_base_url}/reset-password?token={reset_token}"
    send_email(
        to=to, subject="Reset your password",
        body=f"Click to reset your password (valid 30 minutes): {link}\n\nIf you didn't request this, ignore this email.",
    )


def send_verification_email(to: str, verify_token: str, app_base_url: str) -> None:
    link = f"{app_base_url}/verify-email?token={verify_token}"
    send_email(to=to, subject="Verify your email", body=f"Click to verify your email: {link}")
