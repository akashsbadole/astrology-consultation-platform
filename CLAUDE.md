# AI Build Instructions — Astrology Consultation Platform
### (Expo + Next.js monorepo — feed this to Claude Code / Cursor / any coding agent)

---

## 0. How to use this document

This is a build specification, not a single mega-prompt. **Do not ask an AI agent to build the whole thing in one shot** — it will produce shallow, half-wired code across too many files at once. Instead:

1. Drop this file into the repo root as `CLAUDE.md` (or paste it as the first message in a new coding session).
2. Pair it with a `TODO.md` that lists the modules in Section 4, in order, as checkboxes.
3. Work **one module at a time**. Tell the agent: *"Build Module 2 (Wallet & Payments) per CLAUDE.md. Full implementation, no placeholders, no TODOs left in code."*
4. Only move to the next module once the current one is tested and working end-to-end.
5. At the start of every new session, tell the agent to re-read `CLAUDE.md` and `TODO.md` before writing anything.

---

## 1. Project Brief

Build a three-sided marketplace platform — clients, astrologers, and admin — modeled on Astrotalk, delivered as **one shared codebase** across a web application and native Android/iOS apps. Clients consult astrologers over chat, audio, and video on a pay-per-minute wallet model; generate Vedic Kundli (birth charts); get Kundli matching for marriage compatibility; and buy remedies/products through an integrated store.

---

## 2. Non-Negotiable Architecture Decisions

| Layer | Technology | Notes |
|---|---|---|
| Monorepo | **Turborepo** | `apps/next`, `apps/expo`, `packages/*` |
| Web | **Next.js 15 (App Router)**, TypeScript | SSR required for horoscope/calculator/blog SEO pages |
| Mobile | **Expo (React Native)**, Expo Router | EAS Build for App Store/Play Store pipeline |
| Cross-platform navigation | **Solito** | Shared routing logic between Next.js and Expo Router |
| Styling | **NativeWind** (Tailwind) | Real CSS on web (keeps SSR/SEO), native StyleSheet on mobile |
| Shared business logic | `packages/app` | Screens, hooks, feature logic — imported by both `apps/next` and `apps/expo` |
| API backend | **Node.js + NestJS**, TypeScript | Auth, wallet, matching, notifications, admin |
| Kundli calculation service | **Python + FastAPI**, built on `pyswisseph` | Isolated microservice — see Section 7 for exact algorithms |
| Database | **PostgreSQL (Neon)** via **Drizzle ORM** | ACID transactions required for wallet ledger |
| Cache / real-time state | **Upstash Redis** | Presence, session locks, billing tick state |
| Background jobs | **BullMQ** (on Upstash Redis) | Per-tick billing worker, payout batch jobs |
| Realtime audio/video | **LiveKit**, self-hosted | `@livekit/react-native` on mobile, `livekit-client` on web |
| Chat | Custom **Socket.io** server + Redis pub/sub | Persisted to Postgres; tightly coupled to billing, not a 3rd-party SDK |
| Payments | **Razorpay** (Route for marketplace splits) | UPI + cards; wallet recharge and astrologer payout splits |
| File storage | **AWS S3 + CloudFront** | Kundli PDFs, profile photos, product images |

---

## 3. Monorepo Structure

```
astrology-platform/
├── apps/
│   ├── next/                     # Web app (Next.js App Router)
│   ├── expo/                     # Mobile app (Expo Router)
│   ├── api/                      # NestJS backend
│   ├── kundli-engine/             # Python FastAPI microservice
│   └── admin/                    # Next.js admin panel
├── packages/
│   ├── app/                      # 🟢 SHARED screens & feature logic
│   │   ├── features/             # auth/ wallet/ kundli/ astrologer-list/ consultation/ store/
│   │   ├── design/                # shared UI primitives
│   │   ├── state/                 # Zustand stores (Section 8)
│   │   ├── provider/               # QueryClientProvider, AuthProvider, ThemeProvider
│   │   └── hooks/                  # useWallet(), useKundli(), useCallSession()
│   ├── api-client/                 # typed API client + shared Zod schemas
│   ├── db/                          # Drizzle schema + migrations
│   └── config/                       # shared tsconfig, tailwind config, eslint config
├── CLAUDE.md
└── TODO.md
```

---

## 4. Build Order (modules — build strictly in this sequence)

### Module 0 — Foundation
- Scaffold the Turborepo; wire Solito between `apps/next` and `apps/expo`.
- NativeWind across both targets; confirm a shared `<Button>` renders correctly on web and native.
- Auth: mobile OTP + JWT session (Section 10.1), shared `useAuth()` hook.
- Drizzle + Neon connection in `packages/db`, Upstash Redis client in `apps/api`.
- **Acceptance:** a logged-in user navigates 3 placeholder screens on both web and a simulator, using the same route files.

### Module 1 — Kundli Engine
- Build `apps/kundli-engine` per Section 7.1.
- Endpoint: `POST /kundli/generate` → full chart JSON (planets, ascendant, nakshatra, dasha).
- Buy the Swiss Ephemeris **Professional License** before any production use of `pyswisseph`.
- Validate output against at least 3 known reference charts.
- **Acceptance:** reproduces the correct Moon nakshatra, Ascendant sign, and current Mahadasha for a known birth chart.

### Module 2 — Wallet & Payments
- Drizzle schema: `users`, `wallets`, `wallet_transactions` (append-only ledger).
- Razorpay integration for recharge, with webhook signature verification (Section 10.3).
- Wallet balance check as reusable guard (Section 9).
- **Acceptance:** a test-mode recharge credits the wallet and appears in an immutable ledger.

### Module 3 — Astrologer Marketplace & Kundli Matching
- Astrologer profile schema + onboarding state machine (`pending → interview → probation → active → suspended`).
- Search/filter API using the ranking algorithm in Section 7.6.
- Kundli Milan (Ashtakoot matching) endpoint per Section 7.2.
- Ratings & reviews (one per completed consultation).
- **Acceptance:** an admin-approved astrologer becomes searchable/bookable; a matching request between two charts returns a scored, per-koota breakdown.

### Module 4 — Chat Consultation + Billing Engine
- Socket.io server, rooms per session, message persistence.
- Server-authoritative billing tick worker (Section 7.7).
- **Acceptance:** a chat session's wallet running to zero force-ends the session server-side even if the client app is killed mid-session.

### Module 5 — Audio & Video Calling
- Self-hosted LiveKit; room-creation API reuses the Module 4 billing engine (one billing engine, not three).
- Shared `useCallSession()` hook abstracting `@livekit/react-native` vs `livekit-client`.
- **Acceptance:** a call between a web client and mobile astrologer connects, bills correctly, and both ends see a synced timer.

### Module 6 — Integrated E-Commerce ("Spiritual Store")
- Product catalog, cart, checkout — reuses the wallet/payment layer, own schema (`products`, `orders`, `order_items`).
- Admin inventory and fulfillment management.
- **Acceptance:** a purchase flows through the same Razorpay integration and appears in the same transaction history as a consultation.

### Module 7 — Admin Panel (`apps/admin`)
- Astrologer approval queue, commission configuration, dispute/refund handling, revenue analytics, chat moderation, audit log viewer (Section 10.7).

### Module 8 — Content & SEO
- Horoscope content, the free-calculator library, blog — server-rendered in `apps/next` only (web-only routes, not in Expo).

---

## 5. Core Data Model (Drizzle schema — key tables)

```typescript
// packages/db/schema.ts (abbreviated — expand fields per module)

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: varchar('phone', { length: 15 }).unique().notNull(),
  role: pgEnum('role', ['client', 'astrologer', 'admin'])('role').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const wallets = pgTable('wallets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  balancePaise: bigint('balance_paise', { mode: 'number' }).notNull().default(0), // integer paise, never float
});

export const walletTransactions = pgTable('wallet_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletId: uuid('wallet_id').references(() => wallets.id).notNull(),
  amountPaise: bigint('amount_paise', { mode: 'number' }).notNull(), // signed
  type: pgEnum('txn_type', ['recharge', 'consultation_debit', 'store_purchase', 'astrologer_payout', 'referral_bonus'])('type').notNull(),
  referenceId: uuid('reference_id'),
  createdAt: timestamp('created_at').defaultNow(),
  // append-only — never update a row
});

export const astrologers = pgTable('astrologers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  status: pgEnum('astrologer_status', ['pending', 'interview', 'probation', 'active', 'suspended'])('status').notNull(),
  ratePerMinutePaise: integer('rate_per_minute_paise').notNull(),
  specializations: jsonb('specializations').$type<string[]>(),
  languages: jsonb('languages').$type<string[]>(),
  avgRating: numeric('avg_rating'),
  ratingCount: integer('rating_count').default(0),
});

export const consultations = pgTable('consultations', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => users.id).notNull(),
  astrologerId: uuid('astrologer_id').references(() => astrologers.id).notNull(),
  mode: pgEnum('consultation_mode', ['chat', 'audio', 'video'])('mode').notNull(),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  totalBilledPaise: integer('total_billed_paise'),
  commissionPaise: integer('commission_paise'),
});

export const kundliCharts = pgTable('kundli_charts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  birthDate: date('birth_date').notNull(),
  birthTime: time('birth_time').notNull(),
  latitude: numeric('latitude').notNull(),
  longitude: numeric('longitude').notNull(),
  chartJson: jsonb('chart_json').notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => users.id).notNull(),
  action: varchar('action', { length: 100 }).notNull(), // e.g. 'astrologer.approve', 'refund.issue'
  targetId: uuid('target_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**Rule: all money fields are integers (paise), never floats**, at every layer — DB, API responses, and client state.

---

## 6. Recommended Packages — Don't Reinvent This

**Kundli / Vedic astrology**
- `pyswisseph` — Python bindings to Swiss Ephemeris; the actual planetary-position engine. Requires the Professional License for commercial/closed-source use (Module 1).
- `flatlib` (sidereal branch — `diliprk/flatlib@sidereal`) — wraps pyswisseph with a chart object model; the base most sidereal/Vedic libraries build on.
- `VedicAstro` (PyPI: `vedicastro`) — built on flatlib's sidereal branch + pyswisseph; already implements chart generation and `compute_vimshottari_dasa()` — use this for Dasha computation rather than hand-rolling it, and only write custom code for the exact proration rule in Section 7.1 if its output doesn't already match it.
- `Kerykeion` — actively maintained Python astrology library; generates SVG chart images directly, useful for the downloadable Kundli graphic.
- **No available package reliably implements Ashtakoot Guna Milan (marriage matching, Section 7.2)** — build this directly from the classical lookup tables; it's finite, well-documented, and worth owning rather than depending on an unmaintained third-party matcher.

**Realtime / calling**
- `livekit-server-sdk` (Node) — server-side room/token management.
- `@livekit/react-native`, `livekit-client` — client SDKs (already specified).
- `socket.io` + `@socket.io/redis-adapter` — the Redis adapter is required once you run more than one API instance, so both, not just `socket.io` alone.

**Backend**
- `@nestjs/throttler` — rate limiting.
- `class-validator` + `class-transformer`, or `nestjs-zod` — pick one validation style, don't mix both in the same service.
- `helmet` — standard HTTP security headers.
- `argon2` — password/secret hashing (preferred over `bcrypt` for new projects: tunable memory-hardness).
- `passport-jwt` + `@nestjs/jwt` — JWT auth strategy.
- `bullmq` — background jobs / billing tick worker.

**Payments**
- `razorpay` (official Node SDK) — order creation, Route splits, and `validateWebhookSignature()` — use the SDK's verification helper, never hand-roll HMAC checks.

**Data / validation**
- `drizzle-orm` + `drizzle-kit`
- `zod` — shared schemas across `packages/api-client`, NestJS, and Expo/Next.js forms.

**Frontend**
- `zustand` + `zustand/middleware` (`persist`)
- `@tanstack/react-query`
- `expo-secure-store` — encrypted token storage on mobile (never AsyncStorage for tokens)

---

## 7. Core Algorithms & Calculations

### 7.1 Kundli calculation pipeline (`apps/kundli-engine`)

```
1. Convert birth date/time (at the location's historical UTC offset) → Julian Day.
2. Query pyswisseph for tropical geocentric longitudes: Sun, Moon, Mars, Mercury,
   Jupiter, Venus, Saturn. Compute Rahu (mean/true node) and Ketu (Rahu + 180°).
3. Apply Lahiri ayanamsa correction via swe.set_sid_mode(SIDM_LAHIRI):
      sidereal_longitude = tropical_longitude − ayanamsa(julian_day)
4. Sign placement:      sign_index = floor(sidereal_longitude / 30)
5. Nakshatra + Pada:    nakshatra_index = floor(sidereal_longitude / 13.3333)
                        pada = floor((sidereal_longitude mod 13.3333) / 3.3333) + 1
6. Ascendant (Lagna): from Local Sidereal Time (Julian Day + longitude), latitude,
   and obliquity of the ecliptic — use swe.houses() with the whole-sign system.
7. Houses: whole-sign — Ascendant's sign = house 1, each subsequent sign in order.
8. Vimshottari Dasha (use VedicAstro's compute_vimshottari_dasa() — see Section 6):
   - starting_planet = ruler of Moon's birth nakshatra (fixed 27-entry lookup)
   - Years per planet (sums to 120): Ketu 7, Venus 20, Sun 6, Moon 10, Mars 7,
     Rahu 18, Jupiter 16, Saturn 19, Mercury 17
   - balance_of_first_dasha = (1 − fraction_of_nakshatra_travelled) × full_years
   - Antardasha length = (sub_planet_years / 120) × mahadasha_years
9. Return: { planets, ascendant, houses, nakshatra, dasha_timeline }
```

Do not implement steps 1–3 by hand — call the ephemeris library. Only steps 4–8 are arithmetic on top of its output.

### 7.2 Ashtakoot Guna Milan (Kundli matching / marriage compatibility)

Eight factors ("kootas"), each scored from the two partners' Moon nakshatra and Moon sign (rashi), summing to a maximum of 36:

| Koota | Max points | Based on | What it represents |
|---|---|---|---|
| Varna | 1 | Rashi → 4-tier classification | Spiritual/work compatibility |
| Vashya | 2 | Rashi → 5-group classification | Mutual attraction/control |
| Tara | 3 | Nakshatra distance (mod 9 groups) | Health and general wellbeing |
| Yoni | 4 | Nakshatra → 14-symbol classification, scored via a 14×14 friendship matrix | Biological/temperament fit |
| Graha Maitri | 5 | Natural friendship between the two Moon-sign lords (7×7 table) | Planetary compatibility |
| Gana | 6 | Nakshatra → temperament group (Deva/Manushya/Rakshasa), 3×3 table | Personality/temperament |
| Bhakoot | 7 | Numeric distance between the two Moon signs | Emotional/family welfare (certain distances score 0) |
| Nadi | 8 | Nakshatra → 3-group classification (Aadi/Madhya/Antya) | Genetic/health compatibility — same Nadi scores 0 ("Nadi Dosha"), the single most weighted factor |

**Implementation:** this needs four small, static lookup tables (a 27-entry nakshatra-property table covering Yoni/Gana/Nadi/Tara-group; a 12-entry rashi-property table for Vashya/lord; a 14×14 Yoni matrix; a 7×7 Graha Maitri table). Encode these once as constant data in the Kundli engine and write pure functions over them — this is data lookup, not open-ended computation. Return the **per-koota breakdown**, not just the total score — astrologers and clients both expect to see which specific factors matched or failed, not just a final number. Display convention: below 18 generally discouraged, 18–24 acceptable, 24+ favorable — treat this threshold as a UI/display choice, not a hard business rule.

### 7.3 Navamsa (D9 divisional chart)

```
navamsa_number = floor((longitude mod 30) / 3.3333)     // 0–8
sign_type = sign_index mod 3   // 0 = movable, 1 = fixed, 2 = dual (Aries=movable, Taurus=fixed, Gemini=dual, repeating)
starting_sign_index =
    sign_type == movable ? sign_index
  : sign_type == fixed   ? (sign_index + 8) mod 12   // 9th sign from it
  :                        (sign_index + 4) mod 12   // 5th sign from it (dual)
navamsa_sign_index = (starting_sign_index + navamsa_number) mod 12
```

### 7.4 Panchang (Tithi / Yoga / Karana)

```
Tithi = floor(((Moon_longitude − Sun_longitude) mod 360) / 12) + 1      // 1–30
Yoga  = floor(((Moon_longitude + Sun_longitude) mod 360) / 13.3333) + 1  // 1–27
Karana = half of a Tithi — 11 Karanas total (4 fixed, 7 repeating movable) across a lunar month
```

### 7.5 Dosha detection

```
Mangal Dosha: Mars occupies house 1, 2, 4, 7, 8, or 12 counted from the Ascendant.
              (Expose which reference point is used — some schools also check from
              the Moon or from Venus, and astrologers/clients will ask which one.)

Shani Sade Sati: transiting Saturn (today's position, not the birth chart) is
                  currently in the 12th, 1st, or 2nd sign counted from the natal Moon sign.

Kaal Sarp Dosh: all seven classical planets (Sun through Saturn) fall within the
                 longitudinal arc between Rahu and Ketu, on one side only.
```

### 7.6 Astrologer search ranking

Don't rank by raw average rating alone — a single 5-star review would outrank an astrologer with 500 reviews averaging 4.6. Use a Bayesian-adjusted score:

```
bayesian_rating = (C × m + Σ ratings) / (C + rating_count)
  where m = the platform-wide average rating (e.g. 4.2)
        C = a confidence constant (e.g. 10 — tune based on typical review volume)

final_score = bayesian_rating
            + online_status_boost      // small fixed bonus if currently online
            + recency_factor            // slight boost for recent activity
            (weights tuned empirically once you have real usage data — don't over-engineer this before launch)
```

### 7.7 Server-authoritative billing tick (`apps/api`, BullMQ worker)

```
Every {TICK_INTERVAL_SECONDS} seconds, for every active session:
  1. Read session.rate_per_minute_paise and session.mode.
  2. amount_to_debit = round(rate_per_minute_paise × (TICK_INTERVAL_SECONDS / 60))
  3. Atomically (SELECT ... FOR UPDATE on the wallet row):
       if balance < amount_to_debit:
           force-end session (close LiveKit room / Socket.io room)
           set consultation.ended_at = now(), settle final totals
           STOP
       else:
           insert wallet_transactions row (type: consultation_debit, amount: -amount_to_debit)
           decrement wallet.balance_paise
           push updated balance to client via websocket (display-only — never authoritative)
  4. At session end: commission_paise = total_billed_paise × commission_rate;
     credit astrologer's pending-payout ledger with (total_billed_paise − commission_paise).
```

**Never trust a client-reported call duration.** The client displays what the server says; it never decides when billing starts, stops, or how much is owed.

### 7.8 Commission & TDS settlement (payout batch job)

```
payout_before_tds = total_earned_this_cycle − commission_already_deducted_per_session
if cumulative_this_financial_year(astrologer) > ₹50,000 threshold (Section 194J):
    tds = round(payout_before_tds × 0.10)
    net_payout = payout_before_tds − tds
    record tds in a separate ledger line for Form 16A generation
else:
    net_payout = payout_before_tds
```

### 7.9 Referral bonus

```
on_referred_users_first_recharge(amount_paise):
    bonus = round(amount_paise × referral_bonus_rate)   // e.g. 10%
    credit referrer's wallet: wallet_transactions row (type: referral_bonus, amount: +bonus)
    (bonus is wallet credit, not real-money cashback — keep it inside the ledger, not a separate payout path)
```

---

## 8. State Management Architecture

- **Server state** (astrologer lists, chart data, wallet balance, consultation history — anything from the API) → **TanStack Query**, exclusively. Never mirror server state into Zustand.
- **Client-only global state** → **Zustand**: current auth session, active call/session state (so an in-app timer bar can render from anywhere in the tree), theme, locale.
- **Persistence, split by platform:**
  - Mobile: `zustand/middleware persist`, with `expo-secure-store` as the storage adapter for anything sensitive (auth tokens). Plain AsyncStorage is fine for non-sensitive UI prefs only.
  - Web: the **refresh token lives in an httpOnly secure cookie** set by the API — never in localStorage or persisted Zustand state (see Section 10.1, this is an XSS risk, not a style choice). The access token can live in memory in a non-persisted Zustand store and silently refresh on load.
- Define the store shape **once** in `packages/app/state/`, with the storage adapter injected per platform at the app-shell level — the store logic itself stays shared.
- Query key convention: `[domain, id, params]` — e.g. `['astrologer', id]`, `['wallet', 'balance']`, `['consultation', 'history', page]` — so a mutation (e.g., a wallet debit) invalidates cache with one call: `queryClient.invalidateQueries(['wallet'])`, not scattered manual refetches.

---

## 9. Backend Architecture (`apps/api`, NestJS)

```
apps/api/src/
├── auth/              # OTP issuance, JWT strategy, refresh token rotation
├── users/
├── wallet/            # recharge, ledger, balance queries
├── astrologers/        # profile, onboarding state machine, search/ranking
├── consultations/       # session lifecycle REST endpoints
├── billing/              # BullMQ processor — the tick worker (Section 7.7)
├── chat/                  # Socket.io gateway
├── calls/                  # LiveKit room/token issuance
├── kundli/                  # thin proxy to apps/kundli-engine — no astronomy logic here
├── store/                     # e-commerce: products, cart, orders
├── payments/                   # Razorpay integration, webhook handlers
├── admin/                       # admin-only endpoints, RBAC-guarded
└── common/
    ├── guards/          # RolesGuard, WalletSufficientBalanceGuard
    ├── interceptors/     # logging, response shaping
    └── pipes/             # Zod/class-validator validation pipe
```

Each domain module owns its own Drizzle queries — avoid a single monolithic `DatabaseService` god-object; inject a scoped repository per module instead. The **billing module is the one piece every real-time module depends on** (chat, calls) — build it once in `billing/`, share it; don't let `chat/` and `calls/` grow their own separate copies of the tick logic.

---

## 10. Security Requirements

### 10.1 Authentication & session security
- Rate-limit OTP requests per phone number (e.g., max 5/hour) and per IP — prevents SMS-bombing abuse and direct cost blowouts.
- JWT: short-lived access token (~15 min) + rotating refresh token. Rotate on every use (invalidate the old one) so a stolen refresh token has a single-use window.
- Refresh token: httpOnly secure cookie on web, `expo-secure-store` on mobile. Never plaintext in localStorage/AsyncStorage.

### 10.2 API security
- `helmet` on every NestJS instance (CSP, HSTS, X-Frame-Options, etc.).
- CORS locked to actual web/app origins — never `*`.
- `@nestjs/throttler` on every route, tuned tighter on cost-sensitive endpoints (OTP send, wallet recharge, Kundli generation).
- Validate every input at the boundary; never trust a client-supplied ID without an ownership check — e.g., confirm "is this wallet actually this user's wallet?" on every wallet-touching request, not just at login.

### 10.3 Payment security
- Never build a custom card form — Razorpay's hosted Checkout keeps you out of PCI-DSS scope entirely.
- **Verify every Razorpay webhook signature server-side** (`validateWebhookSignature`) before trusting a payment confirmation — an unverified webhook endpoint is a direct route to fake wallet credits.
- Run a nightly reconciliation job that re-sums `wallet_transactions` against `wallets.balance_paise` and alerts on drift — this catches billing bugs before they become client disputes.

### 10.4 Data protection (DPDP Act, 2023)
- Encrypt PII at rest where the database supports it — birth date/time/location is sensitive, used for legitimate astrological purposes but still personally identifying.
- TLS everywhere, including internal calls to `apps/kundli-engine` — no plaintext HTTP between services.
- Explicit consent capture at signup (a real checkbox, not implied), logged with a timestamp.
- Build a user-data-deletion endpoint from day one — "delete my account" is a real DPDP obligation, not a nice-to-have.

### 10.5 Real-time session security
- LiveKit room tokens: short-lived, scoped to one room + one identity, generated server-side per session — never let the client construct its own room name or token.
- Chat Socket.io rooms authenticated on connect (JWT in the handshake); verify server-side that a client can only join a room for a consultation they're actually party to — never trust a client-sent room ID alone.

### 10.6 Infrastructure & secrets
- No secrets committed to git, ever — use a secrets manager (AWS Secrets Manager, or Doppler/Infisical for something lighter) injected at deploy time.
- Dependency scanning (Dependabot/`npm audit`/Snyk) as part of CI, not an occasional manual check.
- Least-privilege IAM — the Kundli engine and chat service should not hold the same AWS credentials as the payment-handling service.

### 10.7 RBAC & audit
- Three roles minimum (client, astrologer, admin), enforced via a `RolesGuard` on every backend route — never by hiding a button in the frontend only.
- Admin actions (approving astrologers, adjusting commission, issuing refunds) written to the `audit_logs` table with who/when/what — needed both for internal trust and for the dispute-handling feature in the admin panel.

---

## 11. Coding Conventions

- TypeScript `strict: true` across every package — no `any` without an explicit inline justification comment.
- Every API boundary validates input with Zod/class-validator — no unvalidated request bodies.
- **No placeholder code, no `// TODO: implement later`, no stub functions left in a module marked complete.**
- Shared code lives in `packages/app`; if near-identical logic appears separately in `apps/next` and `apps/expo`, move it to `packages/app` instead.
- Every money value is an integer (paise), never a float, at every layer.
- Every module ships with tests before being marked done: Jest for logic, Playwright for the web critical path, Detox/Maestro for the mobile equivalent.
- Commit messages reference the module number from Section 4.

---

## 12. Environment Variables

```
DATABASE_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_WS_URL=
SWISSEPH_LICENSE_PATH=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
SMS_PROVIDER_API_KEY=
```

---

## 13. Running a build session with an AI coding agent

At the start of each session, instruct the agent:

> "Read CLAUDE.md and TODO.md in full before writing any code. We are working on Module [N] only. Do not touch files belonging to other modules unless the current module genuinely requires a shared change — if it does, tell me before making it. Give a complete, production-ready implementation with no placeholders. When the module is done, update TODO.md and tell me what you tested."

Keep `TODO.md` as the living source of truth — check items off only once the acceptance criteria in Section 4 are demonstrably met, not just "code written."
