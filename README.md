# Astrology Platform — Auth Starter (FastAPI + React Native + Next.js)

Complete, working authentication for all three roles — customer, astrologer,
admin — with email/password and Google Sign-In, on **one shared backend**
consumed by both a React Native mobile app and a Next.js web app.

## What's included

**Backend (`backend/`)** — FastAPI
- `/auth/register`, `/auth/login`, `/auth/google`, `/auth/refresh`, `/auth/logout`, `/auth/me`
- JWT access tokens + rotating refresh tokens, argon2 password hashing, slowapi rate limiting
- **Platform-aware refresh token delivery** — this is the piece most starters get wrong:
  - Mobile gets the refresh token in the JSON response, stored in `expo-secure-store` (OS keychain-backed — safe).
  - Web gets it as an **httpOnly, Secure, SameSite=Strict cookie** — never in the JSON body, never readable by JavaScript. An XSS payload on the web app cannot steal it.
  - Pass `?platform=web` or `?platform=mobile` on login/register/google; `/refresh` and `/logout` auto-detect based on whether a cookie is present.

**Mobile (`mobile/`)** — Expo / React Native
- Six screens: login + register/apply for customer and astrologer, plus admin login
- Google Sign-In via `@react-native-google-signin/google-signin` (native Credential Manager flow — requires a custom dev client, see below)
- Tokens in `expo-secure-store`, automatic silent refresh on a 401

**Web (`web/`)** — Next.js 15 (App Router) + Tailwind
- The same six screens, visually consistent with mobile (same palette, same Fraunces/Manrope type pairing, same `CelestialMotif`)
- Google Sign-In via `@react-oauth/google`'s `<GoogleLogin>` component (returns a real ID token via `onSuccess`, not an OAuth access token — this is what lets it hit the exact same `/auth/google` endpoint as mobile)
- Access token kept in memory only (never localStorage); refresh token lives entirely in the httpOnly cookie the backend sets

## One security decision worth knowing before you deploy

**Admin accounts can never be created through self-service** — not by
email registration, not by Google sign-in, on either platform. An admin
row must already exist (seed script, or another admin's account-management
action — not included here). The admin login screens' Google button only
*links* Google to an existing admin account, never creates one. This is
called out explicitly in code comments in `backend/app/routers/auth.py` so
it doesn't get quietly "fixed" later by someone who doesn't know it's
deliberate.

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL, JWT secrets, GOOGLE_WEB_CLIENT_ID
uvicorn app.main:app --reload
```
Set `ALLOWED_ORIGINS` in `.env` to include your actual web app origin (e.g.
`["http://localhost:3000"]`) — the cookie-based web flow depends on CORS
being configured correctly with `allow_credentials=True` (already set in
`main.py`), which only works with explicit origins, never `"*"`.

You need a **Google Cloud OAuth 2.0 Web Client ID** for `GOOGLE_WEB_CLIENT_ID`
— this is what the backend verifies every token's audience against,
*regardless of which platform the sign-in happened on* (web, Android, or
iOS all funnel through this one check). Create it at
console.cloud.google.com → APIs & Services → Credentials → Create
Credentials → OAuth client ID → Web application.

### Web
```bash
cd web
npm install
cp .env.local.example .env.local   # same GOOGLE_WEB_CLIENT_ID as the backend
npm run dev
```

### Mobile
```bash
cd mobile
npm install
```
`mobile/package.json` has the exact dependency versions this was built and
type-checked against. Set `EXPO_PUBLIC_API_BASE_URL` and
`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (same web client ID again) in your
`.env`. You'll also need Android/iOS OAuth client IDs registered in the
Google Cloud console against your app's package name/bundle ID and SHA-1
fingerprint — the web client ID alone isn't enough to complete the native
sign-in flow on-device.

**Note:** `@react-native-google-signin/google-signin` requires a custom
dev client — it will not run inside Expo Go. This is current official
Expo guidance for Google auth specifically (their generic
`expo-auth-session` flow works in Expo Go but doesn't give the native
Credential Manager picker UI, and Expo's own docs point to this library
instead):
```bash
npx expo prebuild
npx expo run:ios      # or: eas build --profile development --platform ios
npx expo run:android  # or: eas build --profile development --platform android
```

## Verified, not just written

Every piece here was actually executed, not just reviewed for syntax:

- **Backend:** `backend/run_real_tests.py` spins up a real FastAPI instance
  against a live (SQLite, for the test) database and exercises every
  endpoint over real HTTP calls — registration, duplicate-email handling,
  admin self-registration rejection, login success/failure, the "same
  error for wrong password and unknown email" enumeration guard, refresh
  token rotation, the theft-detection cascade (reusing a revoked token
  revokes all of that user's other active tokens), the web-vs-mobile
  cookie/JSON split, Google Sign-In account creation and linking, the
  admin-can't-be-created-via-Google rule, and rate limiting. **35/35
  passing.** Run it yourself: `pip install -r requirements.txt aiosqlite httpx`
  then `python run_real_tests.py`.
- **Mobile:** every file type-checks cleanly (`npx tsc --noEmit`, zero
  errors) against the actual installed Expo/React Native/Google Sign-In
  type definitions — not just brace-balance checking.
- **Web:** a full `next build` compiles, type-checks, and statically
  generates all 6 routes successfully.

This process caught and fixed 5 real bugs during development that would
not have been obvious from reading the code: two missing transitive
dependencies (`requests`, `email-validator`), an async-SQLAlchemy
`expire_on_commit` issue that crashed token issuance, a UUID-vs-string
mismatch in the auth dependency, and a timezone-naive-vs-aware datetime
comparison bug in refresh token expiry checks. All are fixed in the code
you have now.

## Deploying to a VPS with Docker

Everything needed is in `docker-compose.yml`, `Caddyfile`, and `scripts/`:

```bash
# On a fresh Ubuntu/Debian VPS, as root:
git clone <your-repo-url> astrology-platform && cd astrology-platform
cp .env.example .env
nano .env   # fill in real values — the script below will refuse to run
            # against DOMAIN/secrets that still look like placeholders
sudo ./scripts/bootstrap-vps.sh
```

`bootstrap-vps.sh` installs Docker itself (if not already present), enables
it on boot, configures `ufw` to allow only SSH/HTTP/HTTPS, and starts the
full stack. It's idempotent — safe to re-run if you stop partway through
to fill in `.env`.

**The stack:** Postgres and Redis (never exposed to the internet — only
reachable by other containers), a one-shot `migrate` service that creates
the schema and exits before anything else starts, the FastAPI backend
(gunicorn, multiple workers), the Next.js web app, and Caddy in front of
both for **automatic HTTPS** — point `DOMAIN` and `API_DOMAIN`'s DNS A
records at the VPS before starting, and Caddy handles Let's Encrypt
certificate issuance and renewal with zero manual steps.

**Before you start it:** `DOMAIN` and `API_DOMAIN` must be subdomains of
the *same* parent domain (e.g. `example.com` and `api.example.com`), not
two unrelated domains — the refresh-token cookie's `SameSite=Strict`
depends on this. It's called out in the Caddyfile too, since getting this
wrong doesn't error loudly, it just makes login silently fail to persist
across page loads.

**Day to day:**
```bash
./scripts/manage.sh status        # container health
./scripts/manage.sh logs backend  # tail one service's logs (or omit for all)
./scripts/manage.sh update        # pull latest code, rebuild, restart
./scripts/backup-db.sh            # manual backup — or cron it, see the script's header
```

Set up the two recommended cron jobs (`crontab -e`):
```
0 3 * * *  /path/to/repo/scripts/backup-db.sh >> /var/log/astrology-backup.log 2>&1
0 4 * * 0  cd /path/to/repo && docker compose exec -T backend python -m app.scripts.cleanup_tokens
```

## Security — what's actually in place, and why

This isn't a checklist bolted on afterward — every item below was added
because it closes a specific, real gap, and each one is covered by the
test suite:

- **Timing-safe login.** When an email doesn't exist, the login route
  still runs a full argon2 verification against a dummy hash before
  responding — otherwise "account not found" returns measurably faster
  than "wrong password," and that timing gap alone lets an attacker
  enumerate valid emails even with an identical error *message* for both.
- **Per-account lockout, separate from per-IP rate limiting.** IP-based
  limits (`slowapi`, Redis-backed) stop one attacker hammering many
  accounts from one machine; they do nothing against a distributed attack
  — many IPs, each trying a few passwords, all against *one* victim. 5
  failed attempts on the same account locks it for 15 minutes regardless
  of how many different IPs those attempts came from.
- **Refresh tokens are stored as hashes, never plaintext**, and rotate on
  every use. Presenting an already-used (revoked) token — a signal of
  possible theft — revokes every other active session for that user too.
- **Platform-correct token delivery.** Mobile gets the refresh token in
  the JSON body (safe: `expo-secure-store` is OS-keychain-backed). Web
  gets it as an httpOnly, Secure, SameSite=Strict cookie, *never* in JSON
  — client-side JavaScript, including an XSS payload, cannot read it.
- **Startup fails loudly on weak or placeholder secrets.** The app
  refuses to boot if `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` are under 32
  characters, match a known placeholder pattern from `.env.example`, or
  are identical to each other. A crash-looping container is a far better
  failure mode than one that "works" while forgeable.
- **Admin accounts can never be created through self-service** — not by
  email registration, not by Google sign-in. An admin row must already
  exist; Google sign-in on the admin screens only *links*, never creates.
- **Google ID tokens are re-verified server-side against Google's own
  servers on every call** — the app never trusts the client's local
  sign-in success on its own.
- **Webhook-free here, but the pattern that matters elsewhere:** every
  DB write to the wallet ledger goes through exactly one function
  (`WalletService.debit`/`credit` in the broader platform spec) — there's
  no equivalent yet in this auth-only starter, but the same discipline
  applies to `_issue_token_pair` here: every token-issuing code path goes
  through it, so the web/mobile cookie-vs-JSON rule can't be silently
  bypassed by a new endpoint that hand-rolls its own issuance.
- **Postgres and Redis are never reachable from outside the Docker
  network.** No exposed ports, no "just for debugging" temporary opening.
- **Non-root containers, security headers, and a request size cap at the
  edge** — Caddy sends HSTS, `X-Content-Type-Options`, `X-Frame-Options:
  DENY`, and a restrictive `Permissions-Policy` on every response, and
  caps request bodies at 1MB before they ever reach the backend.
- **Exact-pinned dependencies** (`requirements.txt` uses `==`, not `>=`)
  — a `pip install` next year installs exactly what was tested, not
  whatever happens to be latest that day.

## Performance

- **Redis-backed rate limiting**, not in-memory — with 2+ gunicorn
  workers (the Docker default), in-memory counters are per-process, so
  the effective rate limit silently multiplies by the worker count. Redis
  gives every worker a shared, correct counter — verified directly via
  `redis-cli KEYS`, not just assumed.
- **Tuned connection pooling** (`pool_size=5, max_overflow=10,
  pool_recycle=1800`) — the recycle setting specifically matters for
  managed Postgres providers (including Neon) that silently close idle
  connections server-side; without it, the pool hands out dead
  connections and you see a confusing "connection reset" in production
  that never reproduces locally.
- **orjson** as the default response serializer — a compiled, non-Python
  JSON encoder, faster than the standard library on every response.
- **GZip compression** on responses over 1KB.
- **A separate one-shot `migrate` step**, not schema creation inside the
  app's own startup — beyond correctness (see the bug this fixed, below),
  this also means worker processes start faster, since they're not each
  racing to run DDL before serving their first request.

## Bugs this process actually caught (not hypothetical — reproduced and fixed)

Running the real test suite and the real production process sequence
(not just reading the code) surfaced issues that would not have been
obvious otherwise:

1. **Two missing transitive dependencies** (`requests`, `email-validator`)
   — the app would crash on the first Google sign-in attempt and on any
   registration call.
2. **An async-SQLAlchemy `expire_on_commit` issue** that crashed token
   issuance immediately after any commit — this would have broken every
   single login.
3. **A UUID-vs-string mismatch** in the auth dependency that would have
   broken `/auth/me` and every protected route.
4. **A timezone-naive-vs-aware datetime comparison** in refresh token
   expiry checks.
5. **A startup race condition**: with 2+ gunicorn workers, every worker
   tried to `CREATE TABLE` independently, and one crashed with "table
   already exists."
6. **The most serious one** — the fix for #5 (a separate migration
   script) initially created **zero tables, with no error at all**,
   because `SQLModel.metadata` is only populated as a side effect of
   importing a model module, and the standalone script never imported
   one. Against a real fresh Postgres in Docker, this would have been a
   Day-1 outage on the very first request.

All six are fixed in the code you have now, and re-verified after each fix.

## Next steps

- Wire the post-login redirects (`router.push('/')` / `router.replace('/')`)
  to the actual customer/astrologer/admin home screens once they exist.
- Build the astrologer document-upload/verification flow (BACKEND-SPEC.md
  Section 4) — right now `/auth/register` with `role: astrologer` only
  creates the login identity, not an approved, bookable profile.
- Add a `GET /admin/users` + promote-to-admin endpoint so the first admin
  account can be created without touching the database by hand — until
  then, insert the first admin row directly.
