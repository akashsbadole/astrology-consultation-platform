"""
Thin wrapper around the Razorpay SDK. Two responsibilities, kept
separate: creating an order (client-initiated, low-stakes) and verifying
a webhook signature (server-to-server, MUST be correct or the wallet
credit path is forgeable).
"""
import hashlib
import hmac
import os

import razorpay

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")

_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


def create_order(amount_paise: int, receipt: str, notes: dict) -> dict:
    """notes is where we stamp what this order is FOR (wallet recharge vs
    store checkout, and whose) — the webhook handler reads it back to
    decide what to do on payment.captured, since Razorpay's webhook
    payload alone doesn't know our application's semantics."""
    return _client.order.create(
        {"amount": amount_paise, "currency": "INR", "receipt": receipt, "notes": notes}
    )


def verify_webhook_signature(payload_body: bytes, received_signature: str) -> bool:
    """Verifies the X-Razorpay-Signature header against the raw request
    body using HMAC-SHA256 with the webhook secret. Reimplemented here
    (rather than calling the SDK's helper) specifically so it's testable
    with a locally-computed signature — no live Razorpay webhook secret
    or network access needed to verify this logic is correct. The
    algorithm is exactly what Razorpay's own docs specify and what their
    SDK does internally, not a divergent approximation."""
    if not RAZORPAY_WEBHOOK_SECRET:
        return False
    expected_signature = hmac.new(
        RAZORPAY_WEBHOOK_SECRET.encode("utf-8"), payload_body, hashlib.sha256
    ).hexdigest()
    # Constant-time comparison — a naive `==` leaks timing information
    # about how many leading bytes matched, exactly the kind of
    # side-channel that turns "we verify signatures" into "we verify
    # signatures, eventually, given enough timing samples."
    return hmac.compare_digest(expected_signature, received_signature)
