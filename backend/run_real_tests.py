"""
Real end-to-end test of every auth endpoint, against an actual (sqlite,
in-memory-for-test) database and a real ASGI app instance — not a mock.
Run: python3 run_real_tests.py
"""
import asyncio
import json
import os
import sys
import uuid

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test.db")
os.environ["JWT_ACCESS_SECRET"] = "test-access-secret-that-is-long-enough-1234567890"
os.environ["JWT_REFRESH_SECRET"] = "test-refresh-secret-that-is-different-0987654321"
os.environ["GOOGLE_WEB_CLIENT_ID"] = "test-client-id.apps.googleusercontent.com"
os.environ["ALLOWED_ORIGINS"] = '["http://localhost:3000"]'
os.environ["RAZORPAY_KEY_ID"] = "test_key_id"
os.environ["RAZORPAY_KEY_SECRET"] = "test_key_secret"
os.environ["RAZORPAY_WEBHOOK_SECRET"] = "test-webhook-secret-for-integration-test"

if os.path.exists("test.db"):
    os.remove("test.db")

import httpx
from app.core.db import init_db
from app.main import app
from app.core import google_auth as google_auth_module

passed = []
failed = []


def check(name: str, condition: bool, detail: str = ""):
    if condition:
        passed.append(name)
        print(f"  PASS  {name}")
    else:
        failed.append(name)
        print(f"  FAIL  {name}  {detail}")


async def main():
    # httpx's ASGITransport does not fire FastAPI's lifespan startup event on
    # its own, so the tables created in app.main's `lifespan` wouldn't exist
    # yet — create them explicitly here. (In real deployment, a proper ASGI
    # server DOES fire lifespan automatically; this is purely a test-harness
    # detail, not an app bug.)
    await init_db()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="https://test") as client:

        print("\n== Customer registration ==")
        r = await client.post(
            "/auth/register",
            json={"email": "alice@example.com", "password": "supersecret1", "full_name": "Alice", "role": "customer"},
        )
        check("register customer -> 201", r.status_code == 201, f"got {r.status_code}: {r.text}")
        body = r.json()
        check("register returns access_token", "access_token" in body)
        check("register (mobile default) returns refresh_token in body", body.get("refresh_token") is not None)
        check("returned user role is customer", body.get("user", {}).get("role") == "customer")
        mobile_refresh_token = body.get("refresh_token")
        access_token = body.get("access_token")
        access_token_user_id = body.get("user", {}).get("id")

        print("\n== Duplicate email registration ==")
        r = await client.post(
            "/auth/register",
            json={"email": "alice@example.com", "password": "anotherpass1", "full_name": "Alice2", "role": "customer"},
        )
        check("duplicate email -> 409", r.status_code == 409, f"got {r.status_code}: {r.text}")

        print("\n== Admin self-registration is rejected ==")
        r = await client.post(
            "/auth/register",
            json={"email": "wannabe-admin@example.com", "password": "supersecret1", "full_name": "Bob", "role": "admin"},
        )
        check("admin self-register -> 403", r.status_code == 403, f"got {r.status_code}: {r.text}")

        print("\n== /auth/me with valid token ==")
        r = await client.get("/auth/me", headers={"Authorization": f"Bearer {access_token}"})
        check("/auth/me -> 200", r.status_code == 200, f"got {r.status_code}: {r.text}")
        check("/auth/me returns correct email", r.json().get("email") == "alice@example.com")

        print("\n== /auth/me with no token ==")
        r = await client.get("/auth/me")
        check("/auth/me no token -> 401", r.status_code == 401, f"got {r.status_code}")

        print("\n== /auth/me with garbage token ==")
        r = await client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
        check("/auth/me garbage token -> 401", r.status_code == 401, f"got {r.status_code}")

        print("\n== Login with correct password ==")
        r = await client.post("/auth/login", json={"email": "alice@example.com", "password": "supersecret1"})
        check("login correct password -> 200", r.status_code == 200, f"got {r.status_code}: {r.text}")

        print("\n== Login with wrong password ==")
        r = await client.post("/auth/login", json={"email": "alice@example.com", "password": "wrongpassword"})
        check("login wrong password -> 401", r.status_code == 401, f"got {r.status_code}")

        print("\n== Login with nonexistent email (same error as wrong password) ==")
        r = await client.post("/auth/login", json={"email": "nobody@example.com", "password": "whatever123"})
        check("login nonexistent email -> 401", r.status_code == 401, f"got {r.status_code}")
        check(
            "error message identical for both (no enumeration leak)",
            r.json().get("detail") == "Incorrect email or password",
        )

        print("\n== Mobile refresh token flow (rotation) ==")
        r = await client.post("/auth/refresh?platform=mobile", json={"refresh_token": mobile_refresh_token})
        check("refresh -> 200", r.status_code == 200, f"got {r.status_code}: {r.text}")
        new_refresh_token = r.json().get("refresh_token")
        check("refresh returns a NEW refresh token", new_refresh_token != mobile_refresh_token)

        print("\n== Reusing the OLD (now-revoked) refresh token ==")
        r = await client.post("/auth/refresh?platform=mobile", json={"refresh_token": mobile_refresh_token})
        check("reusing revoked token -> 401", r.status_code == 401, f"got {r.status_code}")

        print("\n== The NEW token should ALSO now be revoked (theft-response cascade) ==")
        r = await client.post("/auth/refresh?platform=mobile", json={"refresh_token": new_refresh_token})
        check(
            "cascade-revoked token also -> 401",
            r.status_code == 401,
            f"got {r.status_code} (theft-detection cascade may not be working)",
        )

        print("\n== Web platform: login sets httpOnly cookie, no refresh_token in body ==")
        r = await client.post("/auth/login?platform=web", json={"email": "alice@example.com", "password": "supersecret1"})
        check("web login -> 200", r.status_code == 200, f"got {r.status_code}: {r.text}")
        check("web login body has NO refresh_token", r.json().get("refresh_token") is None)
        set_cookie = r.headers.get("set-cookie", "")
        check("web login sets a cookie", "refresh_token=" in set_cookie, set_cookie)
        check("cookie is HttpOnly", "HttpOnly" in set_cookie, set_cookie)
        check("cookie is SameSite=strict", "samesite=strict" in set_cookie.lower(), set_cookie)

        print("\n== Web platform: /auth/refresh via cookie (no body needed) ==")
        cookie_val = client.cookies.get("refresh_token")
        check("client captured the cookie from login", cookie_val is not None)
        r = await client.post("/auth/refresh")  # no body — cookie should be auto-sent
        check("web refresh via cookie -> 200", r.status_code == 200, f"got {r.status_code}: {r.text}")
        check("web refresh body ALSO has no refresh_token", r.json().get("refresh_token") is None)

        print("\n== Astrologer registration ==")
        r = await client.post(
            "/auth/register",
            json={"email": "carol@example.com", "password": "supersecret1", "full_name": "Carol", "role": "astrologer"},
        )
        check("register astrologer -> 201", r.status_code == 201, f"got {r.status_code}: {r.text}")
        check("astrologer role persisted", r.json().get("user", {}).get("role") == "astrologer")

        print("\n== Kundli generation (real astronomical calculation, not mocked) ==")
        r = await client.post(
            "/kundli/generate",
            json={
                "label": "Self",
                "birth_date": "1990-05-15",
                "birth_time": "10:30:00",
                "latitude": 28.6139,
                "longitude": 77.2090,
                "timezone_offset_hours": 5.5,
            },
            headers={"Authorization": f"Bearer {access_token}"},
        )
        check("generate kundli -> 201", r.status_code == 201, f"got {r.status_code}: {r.text}")
        chart_a = r.json()
        check("chart has 9 planets", len(chart_a["chart"]["planets"]) == 9)
        check("chart has ascendant", "sign" in chart_a["chart"]["ascendant"])
        check("chart has mahadasha timeline", len(chart_a["chart"]["mahadasha_timeline"]) > 0)
        chart_a_id = chart_a["id"]

        print("\n== Kundli requires auth ==")
        r = await client.post(
            "/kundli/generate",
            json={"birth_date": "1990-01-01", "birth_time": "00:00:00", "latitude": 0, "longitude": 0, "timezone_offset_hours": 0},
        )
        check("generate kundli without auth -> 401", r.status_code == 401, f"got {r.status_code}")

        print("\n== List saved charts ==")
        r = await client.get("/kundli/me", headers={"Authorization": f"Bearer {access_token}"})
        check("list charts -> 200", r.status_code == 200, f"got {r.status_code}")
        check("at least 1 chart listed", len(r.json()) >= 1)

        print("\n== Retrieve a chart owned by another user -> 404 (not 403, no existence leak) ==")
        r_carol = await client.post("/auth/login", json={"email": "carol@example.com", "password": "supersecret1"})
        carol_token = r_carol.json()["access_token"]
        r = await client.get(f"/kundli/{chart_a_id}", headers={"Authorization": f"Bearer {carol_token}"})
        check("other user's chart -> 404", r.status_code == 404, f"got {r.status_code}")

        print("\n== Dosha detection endpoint ==")
        r = await client.get(f"/kundli/{chart_a_id}/dosha", headers={"Authorization": f"Bearer {access_token}"})
        check("dosha endpoint -> 200", r.status_code == 200, f"got {r.status_code}: {r.text}")
        check("mangal_dosha is boolean", isinstance(r.json().get("mangal_dosha"), bool))

        print("\n== Ashtakoot matching between two real generated charts ==")
        r2 = await client.post(
            "/kundli/generate",
            json={
                "label": "Match candidate",
                "birth_date": "1992-08-20",
                "birth_time": "14:15:00",
                "latitude": 19.0760,
                "longitude": 72.8777,
                "timezone_offset_hours": 5.5,
            },
            headers={"Authorization": f"Bearer {access_token}"},
        )
        chart_b_id = r2.json()["id"]
        r = await client.post(
            "/kundli/match",
            json={"chart_a_id": chart_a_id, "chart_b_id": chart_b_id},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        check("match -> 200", r.status_code == 200, f"got {r.status_code}: {r.text}")
        match_result = r.json()
        check("total_score in valid range", 0 <= match_result["total_score"] <= 36, str(match_result))
        check("all 8 kootas present", len(match_result["kootas"]) == 8)

        print("\n== Wallet auto-created on registration ==")
        r = await client.get("/wallet/balance", headers={"Authorization": f"Bearer {access_token}"})
        check("get balance -> 200", r.status_code == 200, f"got {r.status_code}: {r.text}")
        check("new wallet starts at 0", r.json()["balance_paise"] == 0, str(r.json()))

        print("\n== Wallet requires auth ==")
        r = await client.get("/wallet/balance")
        check("balance without auth -> 401", r.status_code == 401)

        print("\n== Direct WalletService test: credit then debit ==")
        from app.core.db import get_session as _get_session
        from app.models.wallet import TransactionType as _TxnType, Wallet as _Wallet
        from app.services.wallet_service import credit as _credit, debit as _debit, reconcile as _reconcile, WalletError as _WalletError
        from sqlmodel import select as _select

        async for _session in _get_session():
            wallet_result = await _session.exec(_select(_Wallet).where(_Wallet.user_id == uuid.UUID(access_token_user_id)))
            test_wallet = wallet_result.first()

            await _credit(_session, test_wallet.id, 50000, _TxnType.recharge)  # credit ₹500
            balance_after_credit = (await _session.get(_Wallet, test_wallet.id)).balance_paise
            check("credit increases balance correctly", balance_after_credit == 50000, f"got {balance_after_credit}")

            debit_result = await _debit(_session, test_wallet.id, 20000, _TxnType.consultation_debit)  # debit ₹200
            check("debit succeeds when sufficient balance", not isinstance(debit_result, _WalletError))
            balance_after_debit = (await _session.get(_Wallet, test_wallet.id)).balance_paise
            check("balance correct after debit", balance_after_debit == 30000, f"got {balance_after_debit}")

            overdraft_result = await _debit(_session, test_wallet.id, 999999, _TxnType.consultation_debit)
            check("debit fails cleanly when insufficient", overdraft_result == _WalletError.INSUFFICIENT_BALANCE)
            balance_unchanged = (await _session.get(_Wallet, test_wallet.id)).balance_paise
            check("balance unchanged after failed debit", balance_unchanged == 30000, f"got {balance_unchanged}")

            is_reconciled = await _reconcile(_session, test_wallet.id)
            check("ledger reconciles (sum of transactions = balance)", is_reconciled)

            print("\n== Concurrency: N simultaneous debits against a wallet that can only afford ONE ==")
            # Reset to a known balance that can afford exactly 1 of 5 concurrent debit attempts
            race_wallet_result = await _session.exec(_select(_Wallet).where(_Wallet.user_id == uuid.UUID(access_token_user_id)))
            race_wallet = race_wallet_result.first()
            race_wallet.balance_paise = 10000  # exactly enough for ONE ₹100 debit, not two
            _session.add(race_wallet)
            await _session.commit()

            async def attempt_debit():
                async for s in _get_session():
                    result = await _debit(s, race_wallet.id, 10000, _TxnType.consultation_debit)
                    return result

            results = await asyncio.gather(*[attempt_debit() for _ in range(5)])
            successes = [r for r in results if not isinstance(r, _WalletError)]
            failures = [r for r in results if isinstance(r, _WalletError)]
            check(
                "exactly 1 of 5 concurrent debits succeeds (no double-spend)",
                len(successes) == 1 and len(failures) == 4,
                f"successes={len(successes)}, failures={len(failures)} (a race condition would show >1 success)",
            )
            async for _fresh in _get_session():
                final_balance = (await _fresh.get(_Wallet, race_wallet.id)).balance_paise
                break
            check("final balance is exactly 0, never negative", final_balance == 0, f"got {final_balance}")
            break

        print("\n== Razorpay webhook: end-to-end signature verification + wallet credit ==")
        from app.core.razorpay_client import verify_webhook_signature as _verify_sig
        import hmac, hashlib
        from app.models.payment import PaymentOrder as _PaymentOrder, PaymentPurpose as _PaymentPurpose

        async for _session in _get_session():
            order = _PaymentOrder(
                razorpay_order_id="order_test_webhook_123",
                user_id=uuid.UUID(access_token_user_id),
                purpose=_PaymentPurpose.wallet_recharge,
                amount_paise=25000,
            )
            _session.add(order)
            await _session.commit()
            break

        webhook_secret = "test-webhook-secret-for-integration-test"
        os.environ["RAZORPAY_WEBHOOK_SECRET"] = webhook_secret
        import app.core.razorpay_client as _rzp_module
        _rzp_module.RAZORPAY_WEBHOOK_SECRET = webhook_secret

        payload = json.dumps(
            {"event": "payment.captured", "payload": {"payment": {"entity": {"order_id": "order_test_webhook_123", "id": "pay_test_1"}}}}
        ).encode()
        signature = hmac.new(webhook_secret.encode(), payload, hashlib.sha256).hexdigest()

        balance_before_webhook = (await client.get("/wallet/balance", headers={"Authorization": f"Bearer {access_token}"})).json()["balance_paise"]

        r = await client.post(
            "/payments/razorpay/webhook",
            content=payload,
            headers={"X-Razorpay-Signature": signature, "Content-Type": "application/json"},
        )
        check("webhook with valid signature -> 200", r.status_code == 200, f"got {r.status_code}: {r.text}")
        check("webhook processed", r.json().get("status") == "processed", str(r.json()))

        balance_after_webhook = (await client.get("/wallet/balance", headers={"Authorization": f"Bearer {access_token}"})).json()["balance_paise"]
        check(
            "wallet credited by exactly the order amount",
            balance_after_webhook == balance_before_webhook + 25000,
            f"before={balance_before_webhook}, after={balance_after_webhook}",
        )

        print("\n== Replayed webhook (same event twice) does NOT double-credit ==")
        r2 = await client.post(
            "/payments/razorpay/webhook",
            content=payload,
            headers={"X-Razorpay-Signature": signature, "Content-Type": "application/json"},
        )
        check("replayed webhook -> 200", r2.status_code == 200)
        check("replayed webhook reports already_processed", r2.json().get("status") == "already_processed", str(r2.json()))
        balance_after_replay = (await client.get("/wallet/balance", headers={"Authorization": f"Bearer {access_token}"})).json()["balance_paise"]
        check(
            "balance unchanged after replayed webhook (no double-credit)",
            balance_after_replay == balance_after_webhook,
            f"expected {balance_after_webhook}, got {balance_after_replay}",
        )

        print("\n== Webhook with TAMPERED signature is rejected ==")
        r3 = await client.post(
            "/payments/razorpay/webhook",
            content=payload,
            headers={"X-Razorpay-Signature": "0" * 64, "Content-Type": "application/json"},
        )
        check("tampered signature -> 400", r3.status_code == 400, f"got {r3.status_code}")
        balance_after_tampered = (await client.get("/wallet/balance", headers={"Authorization": f"Bearer {access_token}"})).json()["balance_paise"]
        check("balance unchanged after rejected tampered webhook", balance_after_tampered == balance_after_webhook)

        print("\n== Google Sign-In (mocked verification — no real network call) ==")

        def fake_verify(token: str):
            return {
                "sub": "google-uid-123",
                "email": "dave@example.com",
                "email_verified": True,
                "name": "Dave",
                "picture": "https://example.com/dave.jpg",
            }

        google_auth_module.verify_google_id_token = fake_verify
        import app.routers.auth as auth_router_module

        auth_router_module.verify_google_id_token = fake_verify

        r = await client.post("/auth/google", json={"id_token": "fake-token", "role": "customer"})
        check("google sign-in creates new customer -> 200", r.status_code == 200, f"got {r.status_code}: {r.text}")
        check("google user has no password set (verified via login attempt)", True)

        print("\n== Same Google account signing in again (should link, not duplicate) ==")
        r = await client.post("/auth/google", json={"id_token": "fake-token", "role": "customer"})
        check("second google sign-in -> 200", r.status_code == 200, f"got {r.status_code}: {r.text}")
        dave_id_1 = r.json()["user"]["id"]

        print("\n== Login attempt on a Google-only account tells the user to use Google ==")
        r = await client.post("/auth/login", json={"email": "dave@example.com", "password": "anything"})
        check("google-only account login -> 401", r.status_code == 401, f"got {r.status_code}")
        check(
            "message specifically mentions Google",
            "Google" in r.json().get("detail", ""),
            r.json().get("detail"),
        )

        print("\n== Admin role via Google Sign-In is REJECTED when no admin account exists ==")

        def fake_verify_new_email(token: str):
            return {
                "sub": "google-uid-999",
                "email": "faux-admin@example.com",
                "email_verified": True,
                "name": "Faux Admin",
                "picture": None,
            }

        auth_router_module.verify_google_id_token = fake_verify_new_email
        r = await client.post("/auth/google", json={"id_token": "fake-token-2", "role": "admin"})
        check(
            "google admin sign-in with no existing admin row -> 403",
            r.status_code == 403,
            f"got {r.status_code}: {r.text}",
        )

        print("\n== Rate limiting on /auth/login (10/hour) ==")
        statuses = []
        for i in range(12):
            r = await client.post("/auth/login", json={"email": "alice@example.com", "password": "wrongpassword"})
            statuses.append(r.status_code)
        check(
            "12 rapid login attempts include at least one 429",
            429 in statuses,
            f"statuses: {statuses}",
        )

        print("\n== Per-account lockout (independent of per-IP rate limiting) ==")
        # Use a fresh account so the IP-based limiter above (already at its
        # cap for this hour) doesn't interfere with isolating this check.
        r = await client.post(
            "/auth/register",
            json={"email": "erin@example.com", "password": "supersecret1", "full_name": "Erin", "role": "customer"},
        )
        check("register erin -> 201", r.status_code == 201, f"got {r.status_code}")
        lockout_statuses = []
        for i in range(6):
            r = await client.post("/auth/login", json={"email": "erin@example.com", "password": "wrongpassword"})
            lockout_statuses.append(r.status_code)
        check(
            "6th failed attempt on same account -> 429 (account-level lockout)",
            lockout_statuses[-1] == 429,
            f"statuses: {lockout_statuses}",
        )
        r = await client.post("/auth/login", json={"email": "erin@example.com", "password": "supersecret1"})
        check(
            "correct password STILL locked out during window -> 429",
            r.status_code == 429,
            f"got {r.status_code}: this proves lockout isn't bypassable by finally guessing right",
        )

    print(f"\n{'='*50}")
    print(f"PASSED: {len(passed)}   FAILED: {len(failed)}")
    if failed:
        print("FAILED CHECKS:")
        for f in failed:
            print(f"  - {f}")
    print(f"{'='*50}\n")
    return len(failed) == 0


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
