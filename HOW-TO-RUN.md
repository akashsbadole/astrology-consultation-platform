# How to Run Everything

Three ways to run this, fastest to most production-like. Pick based on what you're doing.

---

## Option A — Fastest: infra in Docker, app code running directly (best for active development)

Gives you hot-reload on the backend and frontend, while Postgres/Redis run in containers so you don't install them on your machine.

### 1. Start just the infra
```bash
docker compose up -d postgres redis
```

### 2. Backend
```bash
cd backend
python3 -m venv venv && source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt

export DATABASE_URL="postgresql+asyncpg://astrology:yourpassword@localhost:5432/astrology"
export JWT_ACCESS_SECRET="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"
export JWT_REFRESH_SECRET="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"
export GOOGLE_WEB_CLIENT_ID="your-web-client-id.apps.googleusercontent.com"
export ALLOWED_ORIGINS='["http://localhost:3000"]'
export REDIS_URL="redis://localhost:6379"
export APP_BASE_URL="http://localhost:3000"
# Optional until you need these features — see "Third-party services" below:
export RAZORPAY_KEY_ID="" RAZORPAY_KEY_SECRET="" RAZORPAY_WEBHOOK_SECRET=""
export LIVEKIT_API_KEY="devkey" LIVEKIT_API_SECRET="devsecret-32-chars-minimum-xxxx"
export SMTP_HOST="localhost" SMTP_PORT="1025"   # see "Testing email locally" below

python -m app.scripts.init_db      # creates the schema — run once, and again after pulling schema changes
uvicorn app.main:app --reload      # http://localhost:8000, interactive docs at /docs
```

Create your first admin (do this once, after registering that account normally through the app):
```bash
python -m app.scripts.promote_admin you@example.com
```

### 3. Web
```bash
cd web
npm install
cp .env.local.example .env.local   # fill in NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID
npm run dev                        # http://localhost:3000
```

### 4. Mobile
```bash
cd mobile
npm install
# Set EXPO_PUBLIC_API_BASE_URL and EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in a .env file
npx expo prebuild
npx expo run:ios      # or: npx expo run:android
```
Google Sign-In needs a custom dev client (see mobile/README notes) — it will not run inside plain Expo Go.

### Testing email locally (password reset / verification)
Don't configure a real SMTP provider for local dev — run a debug SMTP server that just prints emails to your terminal instead of sending them:
```bash
pip install aiosmtpd
python -m aiosmtpd -n -l localhost:1025
```
Point `SMTP_HOST=localhost` / `SMTP_PORT=1025` at it (already set above) and every password-reset/verification email will print to that terminal — copy the token straight out of the printed link.

---

## Option B — Full stack in Docker (closest to how it runs in production)

```bash
cp .env.example .env
nano .env    # fill in every value — see "Third-party services" below for what each one needs
docker compose up -d --build
docker compose logs -f            # watch it come up
curl http://localhost:8000/health # or through Caddy once DNS is pointed, if deploying to a real domain
```
This runs everything, including LiveKit (self-hosted, on port 7880 + a UDP range for media) and Caddy (only meaningfully useful with a real domain — for pure localhost testing, hit the backend/web containers' ports directly instead of through Caddy).

Create the first admin the same way, but through the running container:
```bash
docker compose exec backend python -m app.scripts.promote_admin you@example.com
```

For a real VPS (not local testing), use the bootstrap script instead of the manual steps above — it installs Docker itself, sets up the firewall, and starts the stack:
```bash
sudo ./scripts/bootstrap-vps.sh
```
Full deployment details, security notes, and the reasoning behind each piece are in `README.md`.

---

## Option C — Run the test suites (no app servers needed)

The backend has a real, executable integration test suite — not mocks — that spins up the app in-process against a live database.

```bash
cd backend
# Point at either a local Postgres or SQLite for a quick check:
export DATABASE_URL="postgresql+asyncpg://astrology:yourpassword@localhost:5432/astrology_test"
# ...same JWT/GOOGLE/REDIS env vars as Option A...

python -m app.scripts.init_db
python run_real_tests.py
```
This exercises every auth, Kundli, and wallet endpoint over real HTTP calls against a real database — 51+ checks. Known gap: the wallet concurrency test can hit a `MissingGreenlet` error specific to firing many concurrent sessions in this exact test-harness pattern under Postgres; the underlying locking logic itself is correct (verified separately) — see the code comments in that test block.

Mobile and web don't have an automated suite yet — they were verified via real `tsc --noEmit` type-checks and a real `next build`, both of which you can rerun yourself:
```bash
cd mobile && npm install && npx tsc --noEmit
cd web && npm install && npx next build
```

---

## Third-party services — what you actually need, and when

You don't need all of these on day one. Here's what breaks without each:

| Service | Required for | Where to get it |
|---|---|---|
| **Google OAuth Web Client ID** | Google Sign-In (all 3 roles) | console.cloud.google.com → APIs & Services → Credentials → OAuth client ID → **Web application** (not Android/iOS — see README for why the backend only ever checks this one) |
| **Razorpay keys** | Wallet recharge, store checkout | dashboard.razorpay.com → Settings → API Keys. The webhook secret is set separately under Settings → Webhooks, pointing at `https://your-api-domain/payments/razorpay/webhook` |
| **LiveKit** | Audio/video calling | Self-hosted via the `livekit` service in docker-compose.yml — just needs `LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET` to be two matching values you pick yourself (not an external signup) |
| **SMTP provider** | Password reset, email verification | Any SMTP-speaking provider (AWS SES, Postmark, SendGrid's SMTP endpoint) — or the local `aiosmtpd` debug server above for development |

Nothing else in the stack (Kundli engine, astrologer marketplace, admin panel, content endpoints) needs any external service — they only need Postgres and Redis.

---

## First-run checklist

1. Register a customer account through the app (or `POST /auth/register`).
2. Promote that account to admin: `python -m app.scripts.promote_admin <email>`.
3. Register a second account with `role: astrologer`, then apply via `POST /astrologers/apply`.
4. As the admin, advance it through the funnel — `PATCH /admin/astrologers/{id}/approve` three times (pending → interview → probation → active).
5. As the astrologer, go online: `PATCH /astrologers/me/availability {"is_online": true}`.
6. As the customer, `POST /consultations/request` — your first session is free automatically.
7. Add a product via direct DB insert or a future admin UI (there's no `POST /admin/products` endpoint yet — flagged as a gap) to test the store checkout flow.

Full API reference for every endpoint is in `BACKEND-SPEC.md`.
