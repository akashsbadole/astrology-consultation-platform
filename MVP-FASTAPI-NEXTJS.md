# MVP Build Plan — FastAPI + Next.js
### (Web-first MVP — Expo mobile deferred to Phase 2, same backend reused later)

---

## 0. What changed from the earlier full-platform spec, and why it's fine

CLAUDE.md and BACKEND-SPEC.md speced a NestJS API + a separate FastAPI Kundli microservice + an Expo/Next.js monorepo — the right shape for the full-scale platform. For an MVP, that's two backend languages and a cross-platform monorepo before you've validated anything. This document consolidates to:

- **One backend: FastAPI**, with the Kundli engine as an in-process module, not a separate microservice.
- **One frontend: Next.js (web only)**. No Expo yet.

**This is not wasted work when you add mobile later** — FastAPI doesn't care who calls it. When you're ready for Expo, it becomes a second consumer of the same API; nothing here gets rewritten.

---

## 1. MVP Feature Scope

| In scope | Deferred to Phase 2 |
|---|---|
| Auth (OTP + JWT) | Video calling |
| Wallet + Razorpay recharge | Integrated e-commerce (Spiritual Store) |
| Astrologer marketplace (search, profile, simplified admin approval) | Referral program |
| Free Kundli generation (full calculation pipeline) | TDS automation (compute commission; withhold TDS manually at first) |
| Kundli Matching (Ashtakoot) — cheap to include once the engine exists | Full audit logging / RBAC beyond 3 roles |
| Panchang + horoscope content (SEO/acquisition) — same reason | Secrets manager (env vars are fine pre-scale) |
| Chat consultation with real-time, server-authoritative billing | Multi-instance billing worker (Celery) — single-instance is fine at MVP traffic |
| Minimal admin (approve astrologers, view basic revenue) | Dispute/refund workflow, analytics dashboard |

Audio/video is deferred deliberately, not just for time — recall from the Astrotalk research that chat is where the bulk of usage and revenue actually sits; video is genuinely a Phase 2 feature, not a corner being cut.

---

## 2. Architecture

No Turborepo needed yet — just two projects:

```
astrology-mvp/
├── backend/          # FastAPI
│   └── app/
│       ├── main.py
│       ├── core/            # config, security, db session, redis client
│       ├── models/          # SQLModel table models
│       ├── schemas/         # Pydantic request/response schemas (where they diverge from models)
│       ├── routers/         # auth.py, wallet.py, astrologers.py, kundli.py, consultations.py, admin.py
│       ├── services/        # wallet_service.py, billing_service.py, kundli_engine.py, ashtakoot.py, ranking.py
│       ├── sockets/         # chat_socket.py (fastapi-socketio handlers)
│       └── workers/         # billing_tick.py (APScheduler job)
│   ├── alembic/              # migrations
│   └── pyproject.toml
└── frontend/          # Next.js 15 App Router, TypeScript, Tailwind
    ├── app/
    └── lib/api-client.ts     # typed client generated from FastAPI's OpenAPI schema
```

**Frontend↔backend typing:** point `openapi-typescript` at `http://localhost:8000/openapi.json` (FastAPI generates this automatically from your Pydantic schemas) to get a typed API client with zero hand-written interfaces — this is the single-language-pair equivalent of what Zod gave you across a TS-only stack.

| Layer | Choice | Notes |
|---|---|---|
| Backend framework | **FastAPI** | One service, routers per domain |
| Kundli engine | **In-process module**, `pyswisseph` + `flatlib` (sidereal) + `VedicAstro` | No network hop to a separate service at this scale |
| ORM | **SQLModel** for most tables (built by FastAPI's own author — one model class serves as both the Pydantic schema and the SQLAlchemy table) | Drop to raw SQLAlchemy Core for the wallet debit, which needs explicit `SELECT ... FOR UPDATE` transaction control |
| Database | **PostgreSQL (Neon)** | Same as before |
| Cache / pub-sub | **Upstash Redis**, via `redis-py` (asyncio mode) | |
| Billing tick worker | **APScheduler**, running in-process inside the FastAPI app | Simplest correct option for a single-instance MVP; upgrade path is Celery + Redis once you run more than one API instance (Section 8 flags this explicitly so it isn't forgotten later) |
| Chat | **`fastapi-socketio`** | Mounts Socket.io directly onto the FastAPI app — your Next.js frontend still uses the familiar `socket.io-client`, no separate Node service needed |
| Calls (Phase 2) | `livekit-api` (Python SDK) when you get there | Confirmed to exist — no rewrite needed to add it later |
| Payments | **`razorpay`** (official Python SDK) | Same webhook-signature-verification rule applies |
| Auth | **`python-jose`** (JWT) + **`passlib[argon2]`** | Or `fastapi-users` if you want a more batteries-included package — hand-rolled is fine and gives you more control at this scope |
| Rate limiting | **`slowapi`** (Redis-backed) | FastAPI's own docs point here — it's the de facto standard for this |
| Validation | **Pydantic** | Native to FastAPI — no separate library needed, unlike the Zod addition on the Node side |
| Production server | **Uvicorn (with `uvloop`+`httptools`, installed via `uvicorn[standard]`) behind Gunicorn** | `gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app` — standard, current setup |

---

## 3. MVP Endpoints (trimmed from BACKEND-SPEC.md, adapted to a single service)

### Auth
| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/otp/send` | Rate-limited (slowapi), 5/hr per phone+IP |
| POST | `/auth/otp/verify` | Verify, create user if new, issue tokens |
| POST | `/auth/refresh` | Rotate refresh token |
| GET | `/auth/me` | Current session |

### Wallet
| Method | Path | Purpose |
|---|---|---|
| GET | `/wallet/balance` | |
| GET | `/wallet/transactions` | Paginated ledger |
| POST | `/wallet/recharge/order` | Create Razorpay order |
| POST | `/payments/razorpay/webhook` | Signature-verified; credits wallet on `payment.captured` |

### Astrologers
| Method | Path | Purpose |
|---|---|---|
| GET | `/astrologers` | Search/filter, Bayesian ranking (Section 5) |
| GET | `/astrologers/:id` | Profile |
| POST | `/astrologers/apply` | Application (simplified — admin approves directly, skip the full interview-funnel tooling for MVP) |
| PATCH | `/astrologers/:id/status` | Admin: `pending → active` / `rejected` |
| PATCH | `/astrologers/me/availability` | Online/offline toggle |

### Kundli
| Method | Path | Purpose |
|---|---|---|
| POST | `/kundli/generate` | Full pipeline, in-process |
| GET | `/kundli/me` | User's saved charts |
| POST | `/kundli/match` | Ashtakoot Guna Milan |
| GET | `/panchang/today` | Cached daily |
| GET | `/horoscope/:sign/:period` | Cached |

### Consultations & Chat
| Method | Path | Purpose |
|---|---|---|
| POST | `/consultations/request` | Instant chat request |
| POST | `/consultations/:id/accept` | Astrologer accepts |
| POST | `/consultations/:id/end` | Manual end → settlement |
| GET | `/chat/:consultationId/messages` | History |
| WS | `/socket.io` (namespace `/chat`) | `join_room`, `send_message`, `balance_update`, `session_ended` — same event contract as BACKEND-SPEC.md Section 9 |

### Admin (minimal)
| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/astrologers/pending` | Approval queue |
| PATCH | `/admin/astrologers/:id/approve` | |
| GET | `/admin/analytics/revenue` | Basic aggregate — total billed, total commission, no dashboard polish yet |

---

## 4. Calculations Included (same math, same rigor — only the scope is trimmed)

**Kundli pipeline, Ashtakoot matching, Panchang** — identical to BACKEND-SPEC.md Sections 5 and to CLAUDE.md Section 7. Nothing about moving to FastAPI-only changes the astronomy or the matching math — copy those formulas over as-is; only the deployment shape (in-process vs. microservice call) changes.

**Billing tick — adapted for APScheduler:**
```python
# workers/billing_tick.py — runs every TICK_INTERVAL_SECONDS via APScheduler
async def billing_tick():
    for session_id in await redis.smembers("active_sessions"):
        session = await redis.hgetall(f"session:{session_id}")
        if session["is_free_session"] and int(session["free_seconds_remaining"]) > 0:
            await redis.hincrby(f"session:{session_id}", "free_seconds_remaining", -TICK_INTERVAL_SECONDS)
            await sio.emit("balance_update", {"stillFree": True}, room=session_id)
            continue

        amount_to_debit = round(int(session["rate_per_minute_paise"]) * (TICK_INTERVAL_SECONDS / 60))
        result = await wallet_service.debit(session["client_wallet_id"], amount_to_debit, "consultation_debit", session_id)

        if result == "INSUFFICIENT_BALANCE":
            await end_consultation(session_id, reason="balance_exhausted")   # closes the socket room, settles
            await redis.srem("active_sessions", session_id)
        else:
            await redis.hincrby(f"session:{session_id}", "total_billed_paise", amount_to_debit)
            await sio.emit("balance_update", {"remainingBalance": ..., "elapsedSeconds": ...}, room=session_id)
```
Same non-negotiable rule as before: **the client never decides billing — it only renders what this loop pushes to it.**

**Commission at settlement** — same 50/50 (or your chosen rate) split as BACKEND-SPEC.md Section 8. **TDS withholding is computed and displayed but not auto-remitted for the MVP** — you (or an accountant) handle the actual filing manually until volume justifies automating the payout batch job. Don't skip *computing* it, just skip *automating* the remittance.

---

## 5. Security Essentials for MVP (the non-negotiable subset)

Keep these even at MVP scale — they're cheap now and expensive to retrofit after a security incident:
- JWT rotation on refresh (Section 10.1 of BACKEND-SPEC.md, unchanged).
- **Razorpay webhook signature verification** — the Python SDK's `client.utility.verify_webhook_signature()` — non-negotiable from day one, this is the one endpoint with no user auth at all.
- Wallet debit through the single atomic `WalletService.debit()` function only — never an ad-hoc `UPDATE wallets` anywhere else in the codebase, even in a rushed MVP feature.
- `slowapi` rate limits on `/auth/otp/send`, `/wallet/recharge/order`, `/kundli/generate`.
- Socket room join verified server-side against the consultation's actual participants — never trust a client-sent room ID.

Fine to defer for MVP: full audit-log table, admin RBAC beyond a simple `is_admin` boolean, a dedicated secrets manager (environment variables + `.env` are acceptable pre-scale, just never committed to git).

---

## 6. Environment Variables (MVP subset)

```
DATABASE_URL=
UPSTASH_REDIS_URL=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
SWISSEPH_LICENSE_PATH=
JWT_SECRET=
SMS_PROVIDER_API_KEY=
```

---

## 7. Build Order

1. **Foundation** — FastAPI project scaffold, SQLModel + Alembic, Redis connection, JWT auth (OTP send/verify/refresh). *Acceptance: a user can log in and hit a protected `/auth/me`.*
2. **Kundli engine (in-process)** — full pipeline + Ashtakoot matching. Validate against 3 known reference charts before moving on.
3. **Wallet** — recharge via Razorpay, webhook-verified credit, atomic debit function.
4. **Astrologer marketplace** — simplified application/approval, search with ranking.
5. **Chat + billing engine** — `fastapi-socketio` rooms, APScheduler tick loop, force-end on zero balance.
6. **Minimal admin** — approval queue, basic revenue numbers.
7. **Polish + deploy** — Next.js frontend wired to the generated OpenAPI client, basic e2e test of the full recharge → consult → settle path.

---

## 8. When you're ready for Phase 2 (mobile, calling, e-commerce)

- Add Expo as a second frontend consuming the same FastAPI backend — no backend changes required for auth/wallet/kundli/chat.
- Add `livekit-api` and the two client SDKs when introducing calling — the billing tick loop is already written generically enough (keyed by `session_id`, not by mode) to extend to audio/video with a room-creation endpoint, not a rewrite.
- Move the billing tick from APScheduler to Celery + Redis **only once you run more than one API instance** — a single in-process scheduler silently double-fires or misses ticks across multiple instances, which APScheduler alone doesn't guard against.
- Re-introduce the full CLAUDE.md/BACKEND-SPEC.md scope (referrals, e-commerce, audit logging, RBAC, TDS automation) module by module, same acceptance-criteria discipline as before.
