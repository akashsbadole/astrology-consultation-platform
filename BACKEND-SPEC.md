# Backend Logic & API Specification
### Astrology Consultation Platform — every endpoint, every event, every calculation

---

## 0. How this document relates to CLAUDE.md

`CLAUDE.md` is the build plan (architecture, module order, package choices). **This document is the actual backend contract** — every REST endpoint, every WebSocket event, every calculation, and how they wire together into complete request-to-settlement flows. Give this to whoever (or whatever AI agent) is implementing `apps/api` and `apps/kundli-engine` — it should not need to guess an endpoint shape or a formula from anywhere else.

Two services make up the backend:
- **`apps/api`** (NestJS) — everything client/astrologer/admin-facing: REST + WebSocket, auth, wallet, matching, billing, payments.
- **`apps/kundli-engine`** (FastAPI) — pure calculation microservice. **Not exposed to the internet directly** — `apps/api`'s `kundli/` module proxies to it internally, so all client auth/rate-limiting stays in one place.

All endpoints below are prefixed `/api/v1` (omitted for brevity). All request/response bodies are JSON. All money values are integers in **paise**.

---

## 1. Auth Module

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/otp/send` | Public, rate-limited | Send OTP to a phone number |
| POST | `/auth/otp/verify` | Public | Verify OTP, issue tokens |
| POST | `/auth/refresh` | Refresh token (cookie or body) | Rotate tokens |
| POST | `/auth/logout` | Access token | Invalidate refresh token |
| GET | `/auth/me` | Access token | Current session's user summary |

**`POST /auth/otp/send`** — body `{ phone }`
- Rate limit: 5 requests/hour per phone number **and** per IP (both checked independently — either limit blocks).
- Generate a 6-digit OTP, hash it (do not store plaintext), store `otp_hash` + `expires_at` (5 min TTL) in Redis keyed by phone.
- Dispatch via SMS provider. Return `{ success: true }` regardless of whether the phone is a new or existing user (don't leak account existence).

**`POST /auth/otp/verify`** — body `{ phone, otp }`
- Look up the Redis entry; reject if missing/expired (`410 Gone`) or if the hash doesn't match (`401 Unauthorized`). Delete the entry on success (single use).
- If no `users` row exists for this phone, create one with `role: client`.
- Issue an access token (JWT, 15 min expiry, payload: `{ userId, role }`) and a refresh token (opaque random string, 30-day expiry, stored hashed in a `refresh_tokens` table with `userId`, `expiresAt`, `revokedAt`).
- Web: set refresh token as an **httpOnly, Secure, SameSite=Strict cookie**. Mobile: return it in the JSON body for the client to store in `expo-secure-store`.

**`POST /auth/refresh`**
- Look up the presented refresh token's hash; reject if not found, expired, or already revoked (`401` — and if already revoked, this is a signal of possible token theft; consider revoking *all* of that user's refresh tokens as a precaution).
- Mark the presented token revoked, issue a brand-new access + refresh token pair (**rotation** — a refresh token is single-use).

**`POST /auth/logout`** — revokes the current refresh token; client discards its access token locally.

---

## 2. Users Module

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/users/me` | Access token | Full profile |
| PATCH | `/users/me` | Access token | Update name, email, preferred language |
| DELETE | `/users/me` | Access token | Account deletion request (DPDP) |
| GET | `/users/me/consultations` | Access token | Paginated consultation history |
| GET | `/users/me/favorites` | Access token | Favorited astrologers |
| POST | `/users/me/favorites/:astrologerId` | Access token | Add favorite |
| DELETE | `/users/me/favorites/:astrologerId` | Access token | Remove favorite |

**`DELETE /users/me`** — does not hard-delete immediately. Sets `users.deletion_requested_at`, anonymizes PII (name, email) after a grace period (e.g., 7 days, in case of accidental request), but **retains financial records** (wallet ledger, consultation billing rows) in anonymized form — required for tax/audit compliance even after account deletion. Document this distinction explicitly in the privacy policy.

---

## 3. Wallet Module

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/wallet/balance` | Access token | Current balance |
| GET | `/wallet/transactions` | Access token | Paginated ledger |
| POST | `/wallet/recharge/order` | Access token | Create a Razorpay order for recharge |
| POST | `/payments/razorpay/webhook` | Signature-verified, no user auth | Confirms payment, credits wallet (shared with Store module — see Section 12) |

**`POST /wallet/recharge/order`** — body `{ amountPaise }`
- Minimum recharge amount enforced (e.g., ₹100) to keep Razorpay's per-transaction fee from eating small recharges.
- Create a Razorpay order (`razorpay.orders.create`), store a `pending` row in `wallet_transactions`-adjacent `payment_orders` table with `razorpay_order_id`, return the order details for the client to open Razorpay Checkout.
- **The wallet is not credited here** — only on the verified webhook (Section 12). This is the one path that must never trust the client's "payment succeeded" callback alone.

**Internal service methods** (not HTTP endpoints — used by other modules):
```
WalletService.debit(walletId, amountPaise, type, referenceId):
  BEGIN TRANSACTION
    SELECT balance_paise FROM wallets WHERE id = walletId FOR UPDATE
    IF balance_paise < amountPaise: ROLLBACK, return INSUFFICIENT_BALANCE
    UPDATE wallets SET balance_paise -= amountPaise
    INSERT INTO wallet_transactions (walletId, amountPaise: -amountPaise, type, referenceId)
  COMMIT

WalletService.credit(walletId, amountPaise, type, referenceId):
  BEGIN TRANSACTION
    UPDATE wallets SET balance_paise += amountPaise WHERE id = walletId
    INSERT INTO wallet_transactions (walletId, amountPaise: +amountPaise, type, referenceId)
  COMMIT
```
Every debit/credit in the entire platform (consultation billing, store purchase, referral bonus, refund) goes through these two functions — never a direct `UPDATE wallets` anywhere else in the codebase. This is what makes the nightly reconciliation job (Section 15.3) meaningful.

**Nightly reconciliation job:** for every wallet, `SUM(wallet_transactions.amountPaise)` must equal `wallets.balance_paise`. Alert on any drift — this catches bugs, not just fraud.

---

## 4. Astrologer Module

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/astrologers` | Public | Search/list with filters + ranking |
| GET | `/astrologers/:id` | Public | Profile detail |
| POST | `/astrologers/apply` | Access token | Submit astrologer application |
| PATCH | `/astrologers/:id/status` | Admin | Approve/reject/suspend (state machine) |
| PATCH | `/astrologers/me/availability` | Astrologer | Toggle online/offline |
| PATCH | `/astrologers/me/rate` | Astrologer | Update per-minute rate (within platform bands) |
| GET | `/astrologers/:id/reviews` | Public | Paginated reviews |
| POST | `/consultations/:id/review` | Access token (client) | Submit review — one per completed consultation |

**`GET /astrologers`** — query params: `specialization`, `language`, `minPrice`, `maxPrice`, `onlineOnly`, `sortBy` (`ranking` default, or `priceAsc`/`priceDesc`), `page`.

Default ranking calculation (applied server-side, not client-sortable to `ranking` explicitly — it's just the default):
```
bayesian_rating = (C × m + Σ ratings) / (C + rating_count)
  where m = platform-wide average rating (recompute periodically, e.g. nightly; start at 4.2 pre-launch)
        C = confidence constant (start at 10; tune once you have real review-volume data)

final_score = bayesian_rating
            + (isOnline ? ONLINE_BOOST : 0)          // small fixed constant, e.g. 0.3
            + recency_factor(lastActiveAt)            // small decay bonus for recent activity, e.g. max 0.2, decaying to 0 after 7 days
```
Sort descending by `final_score`. Recompute `avgRating`/`ratingCount` on the `astrologers` row via trigger or app-level update whenever a review lands — don't recompute the aggregate on every search request.

**Astrologer status state machine** (`PATCH /astrologers/:id/status`, admin-only):
```
pending → interview → probation → active
                                 → suspended (from active, on violation or complaint threshold)
pending → rejected (terminal)
```
Each transition writes an `audit_logs` row (`actor: adminId`, `action: 'astrologer.status_change'`, `metadata: { from, to, reason }`).

**`PATCH /astrologers/me/rate`** — validate the requested rate falls within a platform-configured band per specialization tier (e.g., ₹5–₹100/min) — don't allow an unrestricted free-text price; unconstrained pricing is how a two-sided marketplace gets gamed.

---

## 5. Kundli Module (proxies `apps/kundli-engine`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/kundli/generate` | Access token | Generate and persist a birth chart |
| GET | `/kundli/me` | Access token | List of the user's saved charts |
| GET | `/kundli/:id` | Access token (owner) | Retrieve a saved chart |
| GET | `/kundli/:id/navamsa` | Access token (owner) | D9 divisional chart |
| GET | `/kundli/:id/dosha` | Access token (owner) | Dosha detection results |
| GET | `/kundli/:id/pdf` | Access token (owner) | Downloadable PDF report (premium-gated) |
| POST | `/kundli/match` | Access token | Ashtakoot Guna Milan compatibility |
| GET | `/panchang/today` | Public, cached | Today's Panchang |
| GET | `/horoscope/:sign/:period` | Public, cached | Horoscope content (`period`: daily/weekly/monthly/yearly) |

**`POST /kundli/generate`** — body `{ name, dob, tob, placeOfBirth: { lat, lon, timezoneOffset } }`
1. `apps/api` validates input (Zod), resolves `placeOfBirth` from a places/geocoding API if the client sent a place name rather than raw coordinates.
2. Proxies to `apps/kundli-engine`'s internal `POST /generate` with the resolved lat/lon/UTC offset.
3. `apps/kundli-engine` runs the calculation pipeline:
   ```
   1. Convert birth date/time (at the resolved historical UTC offset) → Julian Day.
   2. Query pyswisseph for tropical geocentric longitudes: Sun, Moon, Mars, Mercury,
      Jupiter, Venus, Saturn. Compute Rahu (node) and Ketu (Rahu + 180°).
   3. Apply Lahiri ayanamsa: sidereal_longitude = tropical_longitude − ayanamsa(julian_day)
      (via swe.set_sid_mode(SIDM_LAHIRI))
   4. Sign:      sign_index = floor(sidereal_longitude / 30)
   5. Nakshatra: nakshatra_index = floor(sidereal_longitude / 13.3333)
      Pada:      floor((sidereal_longitude mod 13.3333) / 3.3333) + 1
   6. Ascendant: from Local Sidereal Time (Julian Day + longitude), latitude, and
      obliquity of the ecliptic — swe.houses(), whole-sign system.
   7. Houses: whole-sign — Ascendant's sign = house 1, subsequent signs in order.
   8. Vimshottari Dasha (use VedicAstro's compute_vimshottari_dasa() rather than
      hand-rolling):
        starting_planet = ruler of Moon's birth nakshatra (fixed 27-entry lookup)
        Years per planet (sums to 120): Ketu 7, Venus 20, Sun 6, Moon 10, Mars 7,
        Rahu 18, Jupiter 16, Saturn 19, Mercury 17
        balance_of_first_dasha = (1 − fraction_of_nakshatra_travelled) × full_years
        Antardasha length = (sub_planet_years / 120) × mahadasha_years
   9. Return { planets, ascendant, houses, nakshatra, dasha_timeline }
   ```
4. `apps/api` persists the returned JSON to `kundli_charts` and returns it to the client.

**`GET /kundli/:id/navamsa`** — computed on demand from the stored `chart_json` (no need to call the Python service again):
```
navamsa_number = floor((longitude mod 30) / 3.3333)     // 0–8
sign_type = sign_index mod 3   // 0 = movable, 1 = fixed, 2 = dual
starting_sign_index =
    movable ? sign_index
  : fixed   ? (sign_index + 8) mod 12
  : dual    ? (sign_index + 4) mod 12
navamsa_sign_index = (starting_sign_index + navamsa_number) mod 12
```

**`GET /kundli/:id/dosha`**:
```
Mangal Dosha: Mars occupies house 1, 2, 4, 7, 8, or 12 from the Ascendant.
              (Return which reference point was used — some schools also check
              from the Moon or Venus; expose this as a query param `reference=ascendant|moon|venus`.)

Shani Sade Sati: query the Kundli engine for TODAY's transiting Saturn position
                  (not the birth chart), check if it falls in the 12th, 1st, or 2nd
                  sign from the natal Moon sign.

Kaal Sarp Dosh: all seven classical planets (Sun–Saturn) fall within the
                 longitudinal arc between Rahu and Ketu, on one side only.
```

**`POST /kundli/match`** — body `{ chartAId, chartBId }` (or raw birth details for a chart not yet saved)

Ashtakoot Guna Milan — 8 kootas, each computed from both charts' Moon nakshatra and Moon sign, summing to 36:

| Koota | Max | Computed from |
|---|---|---|
| Varna | 1 | Rashi → 4-tier classification |
| Vashya | 2 | Rashi → 5-group classification |
| Tara | 3 | Nakshatra distance, mod 9 groups |
| Yoni | 4 | Nakshatra → 14-symbol classification, 14×14 friendship matrix |
| Graha Maitri | 5 | Natural friendship between the two Moon-sign lords, 7×7 table |
| Gana | 6 | Nakshatra → temperament group (Deva/Manushya/Rakshasa), 3×3 table |
| Bhakoot | 7 | Numeric sign-distance between the two Moon signs (certain distances score 0) |
| Nadi | 8 | Nakshatra → 3-group classification (Aadi/Madhya/Antya) — same-Nadi scores 0 |

Implementation: four static lookup tables (27-entry nakshatra properties, 12-entry rashi properties, 14×14 Yoni matrix, 7×7 Graha Maitri matrix) encoded as constants in `apps/kundli-engine`. Response returns **the per-koota breakdown, not just the total** — this is what users and astrologers actually want to see:
```json
{
  "totalScore": 24,
  "maxScore": 36,
  "kootas": [
    { "name": "Varna", "score": 1, "max": 1 },
    { "name": "Nadi", "score": 0, "max": 8, "note": "Nadi Dosha present" }
    // ... remaining 6
  ]
}
```
Display convention (UI-layer decision, not a backend rule): <18 discouraged, 18–24 acceptable, 24+ favorable.

**`GET /panchang/today`** and **`GET /horoscope/:sign/:period`** are public and cache-heavy (Redis, TTL until midnight IST) — these exist for SEO/organic traffic, not per-user computation; don't put them behind the Kundli engine's per-request compute path if a cached daily value suffices.
```
Tithi  = floor(((Moon_longitude − Sun_longitude) mod 360) / 12) + 1      // 1–30
Yoga   = floor(((Moon_longitude + Sun_longitude) mod 360) / 13.3333) + 1  // 1–27
Karana = half of a Tithi — 11 Karanas total (4 fixed, 7 repeating) per lunar month
```

---

## 6. Consultation Lifecycle Module

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/consultations/request` | Client | Request instant consultation |
| POST | `/consultations/schedule` | Client | Book a future slot |
| GET | `/consultations/scheduled` | Access token | Upcoming scheduled bookings |
| POST | `/consultations/:id/accept` | Astrologer | Accept a request/scheduled booking |
| POST | `/consultations/:id/start` | System (triggered when both parties join) | Begin billing |
| POST | `/consultations/:id/end` | Client, Astrologer, or Admin | Manually end |
| GET | `/consultations/:id` | Access token (party to it) | Current status (for reconnect) |
| GET | `/consultations/:id/report` | Access token (owner) | Downloadable session summary PDF |

**`POST /consultations/request`** — body `{ astrologerId, mode }` (`mode`: `chat`/`audio`/`video`)
1. Check astrologer is `active` and currently online.
2. Check client's wallet balance ≥ one minute of the astrologer's rate (`ratePerMinutePaise`) — reject with `402 Payment Required` and a clear "recharge to continue" reason otherwise. **Exception:** if this is the client's first-ever consultation, skip the balance check entirely (the free-first-session hook) and flag the resulting consultation `isFreeSession: true`.
3. Create a `consultations` row, `status: matching`. Notify the astrologer (push notification + WebSocket event if they're connected).
4. Astrologer has a timeout window (e.g., 60s) to `POST /consultations/:id/accept` — on timeout, mark `status: expired` and suggest alternate astrologers to the client.

**`POST /consultations/:id/start`** — called by the system once both the client and astrologer have joined the chat room / LiveKit room (not by either client directly):
- Set `startedAt = now()`.
- Register the session in Redis (`session:{id} → { ratePerMinutePaise, mode, clientWalletId }`) and enqueue the recurring billing tick job in BullMQ (Section 7).
- `isFreeSession` consultations still get a session record and a timer (so the UI is consistent) but the billing tick is a no-op until the free allowance (e.g., first 5 minutes) is exhausted, at which point normal billing takes over automatically without a new API call.

**`POST /consultations/:id/end`** — either party or admin can end. Deregisters the BullMQ job, sets `endedAt`, triggers `SettlementService.settle()` (Section 8), and unlocks `POST /consultations/:id/review` for the client.

---

## 7. Real-Time Billing Engine (BullMQ processor — no public endpoint)

This is the single most important piece of backend logic on the platform — it runs identically underneath chat, audio, and video, so it lives once in the `billing/` module and is invoked by `chat/` and `calls/`, never duplicated.

```
Every TICK_INTERVAL_SECONDS (e.g. 10s), for every session in Redis with an active BullMQ job:

  1. Read { ratePerMinutePaise, mode, clientWalletId, isFreeSession, freeSecondsRemaining } from Redis.

  2. IF isFreeSession AND freeSecondsRemaining > 0:
        decrement freeSecondsRemaining by TICK_INTERVAL_SECONDS
        push balance_update (still free) to client via WebSocket
        CONTINUE to next session (no debit)

  3. amount_to_debit = round(ratePerMinutePaise × (TICK_INTERVAL_SECONDS / 60))

  4. result = WalletService.debit(clientWalletId, amount_to_debit, 'consultation_debit', consultationId)
       (this is the atomic SELECT...FOR UPDATE debit from Section 3)

  5. IF result == INSUFFICIENT_BALANCE:
        force-close the LiveKit room / Socket.io room for this consultation
        POST-equivalent internal call: end consultation (Section 6), reason: 'balance_exhausted'
        push session_ended event to both client and astrologer via WebSocket
        STOP processing this session (remove its BullMQ job)

  6. ELSE:
        increment consultation.totalBilledPaise by amount_to_debit (in-memory/Redis running total;
          flushed to Postgres on session end, not on every tick, to avoid a DB write every 10 seconds)
        push balance_update { remainingBalance, elapsedSeconds } to the client via WebSocket
          — this is DISPLAY ONLY. The client never uses this to decide anything; it only renders it.
```

**Why this can't live client-side, even "just for the timer":** if the client computes its own elapsed time and only reports it at session end, a client with a modified app (or just a bad network reconnect) can under-report duration. The tick loop is the only source of truth for what's owed, running entirely server-side, checking the actual wallet balance on every tick.

---

## 8. Settlement & Payouts

**`SettlementService.settle(consultationId)`** — called by `POST /consultations/:id/end`:
```
1. Flush consultation.totalBilledPaise (accumulated from the tick loop) to Postgres.
2. commissionPaise = round(totalBilledPaise × commissionRate)   // default 0.5 (50/50), see Section 4 rate bands
3. astrologerEarningPaise = totalBilledPaise − commissionPaise
4. Credit the astrologer's PENDING payout ledger (not their real wallet yet —
   payouts are batched, see below) with astrologerEarningPaise.
5. Store commissionPaise on the consultations row for reporting.
```

**Weekly payout batch job** (scheduled BullMQ job, e.g. every Monday):
```
For each astrologer with a positive pending-payout balance:
  payout_before_tds = sum of that astrologer's pending payout ledger entries since last payout

  cumulative_fy_payout = sum of ALL payouts made to this astrologer so far this financial year

  IF cumulative_fy_payout + payout_before_tds > ₹50,000 (Section 194J threshold):
      tds = round(payout_before_tds × 0.10)
      net_payout = payout_before_tds − tds
      record a separate ledger line for `tds_withheld` (feeds Form 16A generation)
  ELSE:
      net_payout = payout_before_tds

  Initiate a Razorpay Route transfer of net_payout to the astrologer's linked account.
  On success: mark those pending-payout entries as settled, insert a wallet_transactions
    row (type: 'astrologer_payout') for audit-trail completeness even though this is a
    payout, not a wallet credit.
  On failure: leave entries pending, alert ops, retry on next batch run.
```

---

## 9. Chat Module (Socket.io gateway)

Not REST — documented as WebSocket events on the `/chat` namespace.

| Event (client → server) | Payload | Behavior |
|---|---|---|
| `connect` | JWT in handshake `auth` | Reject with a connection error if invalid/expired |
| `join_room` | `{ consultationId }` | Server verifies the connecting user is actually a party to this consultation before allowing the join — never trust a client-sent room ID alone |
| `send_message` | `{ consultationId, text? , attachmentUrl? }` | Persist to Postgres, broadcast `message_received` to the room |
| `typing` | `{ consultationId }` | Broadcast `typing` to the other party, no persistence |
| `read_receipt` | `{ consultationId, messageId }` | Broadcast, update `messages.readAt` |

| Event (server → client) | Payload | When |
|---|---|---|
| `message_received` | full message object | On any `send_message` in the room |
| `balance_update` | `{ remainingBalance, elapsedSeconds }` | Every billing tick (Section 7) |
| `session_ended` | `{ reason }` | On manual end or `balance_exhausted` |

| Method | Path | Purpose |
|---|---|---|
| GET | `/chat/:consultationId/messages` | Paginated message history (Postgres, not Redis — Redis is only for live pub/sub fan-out across API instances via `@socket.io/redis-adapter`) |
| POST | `/chat/:consultationId/attachment` | Returns a pre-signed S3 upload URL for an image/voice note; client uploads directly to S3, then sends the resulting URL via `send_message` |

---

## 10. Calls Module (LiveKit)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/calls/:consultationId/token` | Access token (party to the consultation) | Issue a LiveKit room access token |
| POST | `/calls/:consultationId/end` | Admin (dispute handling) | Force-end an active call |

**`POST /calls/:consultationId/token`**:
- Verify the requester is the client or astrologer on this specific consultation (never issue a token for a room the requester isn't part of).
- Generate a **short-lived** LiveKit token (`livekit-server-sdk`), scoped to `roomName: consultationId` and `identity: userId`. The room itself is created server-side on first token issuance for that consultation — the client never names or creates its own room.
- Once both parties have connected to the LiveKit room (webhook from LiveKit or a join-confirmation from both clients), trigger `POST /consultations/:id/start` internally.

---

## 11. Store Module (Integrated E-Commerce)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/store/products` | Public | Catalog, filterable by category |
| GET | `/store/products/:id` | Public | Product detail |
| GET | `/store/cart` | Access token | Current cart |
| POST | `/store/cart` | Access token | Add item |
| PATCH | `/store/cart/:itemId` | Access token | Update quantity |
| DELETE | `/store/cart/:itemId` | Access token | Remove item |
| POST | `/store/checkout` | Access token | Create order + payment |
| GET | `/store/orders` | Access token | Order history |
| GET | `/store/orders/:id` | Access token (owner) | Order detail + fulfillment status |
| GET | `/store/recommendations` | Access token | Kundli-based product suggestions |

**`GET /store/recommendations`** — reads the user's most recent `kundli_charts.chart_json`, checks the dosha results (Section 5) and looks up a static `dosha_to_product` mapping table (e.g., Mangal Dosha → red coral / Hanuman-related items) to suggest relevant remedies. This is a lookup against admin-curated mappings, not a generative recommendation — keep it simple and editable by non-engineers via the admin panel.

**`POST /store/checkout`** — body `{ paymentMethod: 'wallet' | 'razorpay' }`
- `wallet`: call `WalletService.debit(...)` directly, inline, no redirect needed.
- `razorpay`: create a Razorpay order exactly as in Section 3's recharge flow, confirmed via the same shared webhook (Section 12) — distinguish recharge vs. store purchase via the order's `notes` metadata set at creation time.
- On confirmed payment (either path): create `orders` + `order_items` rows, decrement inventory, notify admin fulfillment queue.

---

## 12. Payments Module

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/payments/razorpay/webhook` | Signature-verified only | Single shared webhook receiver for recharge + checkout |

```
1. Verify the request signature using razorpay.validateWebhookSignature() — reject (400)
   immediately on failure, before parsing the payload at all.
2. Read event.payload.payment.entity.order_id and its `notes` metadata to determine
   whether this was a wallet recharge or a store checkout.
3. On `payment.captured`:
     if recharge: WalletService.credit(walletId, amountPaise, 'recharge', razorpayOrderId)
     if checkout: finalize the order per Section 11
4. On `payment.failed`: mark the corresponding payment_orders/order row failed, no wallet/order side-effects.
5. Always return 200 quickly (Razorpay retries on non-200/timeout) — do any slow
   follow-up work (notifications, etc.) asynchronously, not inline in the webhook handler.
```

This is the **one endpoint on the entire platform with no user JWT** — its only protection is the signature check, so that check is non-negotiable and goes first, before any other logic.

---

## 13. Referral Module

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/referral/code` | Access token | User's own referral code |
| POST | `/referral/apply` | Access token | Apply a code (once, at signup) |

```
on WalletService.credit(..., type: 'recharge', ...) firing for a user's FIRST-EVER recharge:
  IF this user was referred by someone (referred_by_user_id set at signup):
      bonus = round(amountPaise × REFERRAL_BONUS_RATE)   // e.g. 0.10
      WalletService.credit(referrer_wallet_id, bonus, 'referral_bonus', referredUserId)
```
Hook this off the recharge webhook handler (Section 12), not as a separate cron — it should fire the moment the qualifying recharge is confirmed.

---

## 14. Notifications Module

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/notifications/register-device` | Access token | Store FCM token for push |

Internal `NotificationService.send(userId, type, payload)` is called from: astrologer-online alerts (favorited astrologers), consultation-accepted, session-ending-soon (low balance warning at e.g. 1 minute remaining — a genuinely useful nudge, not just a monetization dark pattern, since it lets the client top up before an abrupt cutoff), payout-processed, astrologer-application-status-change.

---

## 15. Admin Module

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/admin/astrologers/pending` | Admin | Approval queue |
| PATCH | `/admin/astrologers/:id/approve` | Admin | Approve → `interview` or `active` per current stage |
| PATCH | `/admin/astrologers/:id/reject` | Admin | Reject with reason |
| PATCH | `/admin/commission-rate` | Admin | Update global or per-astrologer commission override |
| GET | `/admin/disputes` | Admin | Open disputes/refund requests |
| PATCH | `/admin/disputes/:id/resolve` | Admin | Resolve — may trigger a refund |
| GET | `/admin/analytics/revenue` | Admin | Aggregate revenue dashboard data |
| GET | `/admin/analytics/usage` | Admin | Consultation volume, active astrologers, etc. |
| GET | `/admin/audit-logs` | Admin | Full audit trail, filterable by actor/action/date |
| POST | `/admin/notifications/broadcast` | Admin | Push campaign to a user segment |

**`PATCH /admin/disputes/:id/resolve`** with a refund decision:
```
WalletService.credit(clientWalletId, refundAmountPaise, 'refund', consultationOrOrderId)
IF the disputed consultation already had a payout settled to the astrologer:
    deduct refundAmountPaise's commission-adjusted share from that astrologer's NEXT payout batch
    (never claw back an already-completed bank transfer — net it against the next cycle instead)
```

Every admin mutation in this module writes to `audit_logs` — `actorId`, `action`, `targetId`, `metadata` — no exceptions, including this one.

---

## 16. End-to-End Flow Walkthroughs

### Flow A — First-time client, free session, then paid
1. `POST /auth/otp/send` → `/auth/otp/verify` → tokens issued, user created.
2. `POST /kundli/generate` → free Kundli shown immediately (acquisition hook, no wallet involved).
3. `GET /astrologers` → browse, pick one.
4. `POST /consultations/request` → wallet check **skipped** (first session) → `status: matching`.
5. Astrologer `POST /consultations/:id/accept`.
6. Both join chat/call → system calls `POST /consultations/:id/start` → `isFreeSession: true`, `freeSecondsRemaining: 300`.
7. Billing tick (Section 7) burns down `freeSecondsRemaining` with no debit; once exhausted, ticks switch to real debits automatically — no separate API call needed for that transition.
8. Client's balance hits zero → billing engine force-ends → `session_ended` event → `SettlementService.settle()`.
9. Client prompted to `POST /wallet/recharge/order` to continue with future sessions.

### Flow B — Astrologer onboarding
1. `POST /astrologers/apply` (`status: pending`).
2. Admin reviews → `PATCH /astrologers/:id/status` → `interview`.
3. (Off-platform: phone + video interview rounds.)
4. Admin → `status: probation` — astrologer can now go live but is flagged for closer monitoring (e.g., lower search ranking weight, or a "new" badge) for 30 days.
5. Admin → `status: active` after probation review.

### Flow C — Kundli matching for marriage compatibility
1. `POST /kundli/generate` twice (or reference two existing saved charts).
2. `POST /kundli/match` with both chart IDs → Ashtakoot scoring (Section 5) → per-koota breakdown returned.
3. Client can then `POST /consultations/request` with an astrologer to discuss the result — the match score is not a final answer by itself, it's a lead-in to a paid consultation.

### Flow D — Store purchase driven by a dosha result
1. `GET /kundli/:id/dosha` → Mangal Dosha flagged.
2. `GET /store/recommendations` → surfaces the mapped remedy product.
3. `POST /store/cart` → `POST /store/checkout` (wallet or Razorpay) → `POST /payments/razorpay/webhook` (if Razorpay) confirms → order created.

### Flow E — Weekly payout with TDS
1. Across the week, many `SettlementService.settle()` calls accumulate pending-payout ledger entries per astrologer.
2. Monday batch job (Section 8) sums them, checks the ₹50,000 FY cumulative threshold, withholds TDS where applicable, initiates Razorpay Route transfers.
3. Astrologer sees the net payout and a TDS line item in their earnings dashboard; Form 16A data is exportable at financial year-end from the `tds_withheld` ledger lines.

---

## 17. Error Handling Conventions

Standard error response shape across every endpoint:
```json
{ "error": { "code": "INSUFFICIENT_BALANCE", "message": "Wallet balance too low to start this consultation." } }
```
- `400` — validation failure (Zod/class-validator rejection).
- `401` — missing/invalid/expired auth.
- `402` — wallet balance insufficient (used deliberately, not just generically thrown as 400).
- `403` — authenticated but not authorized for this resource (wrong role, or not a party to this consultation/room).
- `404` — resource not found (including "not found" for resources that exist but belong to another user — never leak existence via a 403 vs 404 distinction on ownership checks).
- `409` — state conflict (e.g., trying to `/accept` a consultation that already expired).
- `429` — rate limited (OTP, recharge attempts).
- `500` — unhandled; alert, don't leak internals in the response body.

---

## 18. Rate Limits Summary

| Endpoint | Limit |
|---|---|
| `/auth/otp/send` | 5/hour per phone, 5/hour per IP |
| `/auth/otp/verify` | 10/hour per phone (brute-force guard on the OTP itself) |
| `/wallet/recharge/order` | 10/hour per user |
| `/kundli/generate` | 20/hour per user (compute cost on the Python service) |
| `/consultations/request` | 10/hour per user (prevents astrologer-spamming) |
| All other authenticated endpoints | A general default (e.g., 100/min per user) via `@nestjs/throttler`, tightened per-route only where listed above |
