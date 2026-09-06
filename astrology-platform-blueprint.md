# Astrology Consultation Platform — Technical & Business Blueprint
### (Web + Android + iOS — Astrotalk-style marketplace)

---

## 1. What you're actually building

Strip away the mysticism and this is a **three-sided marketplace** with a **metered billing engine** bolted on:

- **Clients** — browse astrologers, recharge a wallet, consult over chat/audio/video, get a Kundli.
- **Astrologers** — independent contractors who get matched to clients and get paid per minute, minus commission.
- **Platform (you)** — takes a cut (industry norm: 20–40%), owns the infra, the ledger, and the compliance.

Three engineering problems make this harder than a typical marketplace app:
1. **Real-time, per-second-accurate billing** during a live call/chat (get this wrong and you either bleed money or get accused of overcharging).
2. **Astronomically accurate Kundli generation** (get this wrong and every downstream prediction, and your credibility, is wrong).
3. **Low-latency audio/video at scale**, priced so unit economics survive growth instead of degrading with it.

---

## 1a. Astrotalk itself — what the real platform actually does

Before copying it, it's worth knowing what you're actually copying. This is grounded in Astrotalk's own app store listings, its hiring app, and reporting on its financials — not clone-agency marketing copy.

**Scale and business health (2026):**
- Founded 2017 (Puneet Gupta & Anmol Jain, Noida). Raised **$29.6M total** (Left Lane Capital, QED, Elev8) — Series A stage.
- **FY25 revenue: ₹1,182 crore, with ₹250 crore profit** — profitable, not subsidized growth.
- Hit **$1B unicorn valuation in August 2026 via an ESOP buyback**, not a new funding round — a genuinely unusual, self-funded path to unicorn status.
- **~13,000–15,000+ verified astrologers**, **10M+ users**, over **1 lakh minutes of consultation happening daily**.
- **90–95% of revenue comes from per-minute chat/call consultations.** Everything else (reports, e-commerce) is a minority of revenue even though it gets a lot of marketing attention.
- Targeting an **IPO around late 2026/early 2027**, with a ₹2,000 crore revenue goal before listing.

**The actual feature set (from their live App Store/Play Store listing):**
- Consultation modes: chat, call, and live sessions (video is present but secondary — see the privacy insight below).
- Astrology systems offered: Vedic, Hindu, Nadi, Numerology, Lal Kitab, Western, KP astrology, Prashna Chart, Psychic Reading, Face Reading, Palmistry, Vastu, Drik Panchang, Janampatri.
- Free Kundli + free Kundli Milan (matchmaking).
- Free daily/weekly/monthly/yearly horoscopes.
- Free live sessions with well-known astrologers (funnel/trust-building content — free, ad-supported or loss-leader).
- **AstroMall / Astrotalk Store** — gemstones, rudraksha, evil-eye items, puja bookings. A real revenue line, but a small one next to consultations.
- A large library of free self-serve calculators (Dasha, Nakshatra, Numerology, Mangal Dosha, Sade Sati, Moon Phase, Rising Sign, etc.) — these exist purely as **SEO/organic-acquisition content**, not monetized directly.
- **First chat/call session free** — this is their core acquisition hook, not a side offer.

**The one product decision worth copying deliberately:** Astrotalk's own team found early on that **users strongly preferred audio calls over video** — people don't want to be seen consulting an astrologer, the same instinct as a confessional. They leaned into audio+chat as the primary modes and kept video secondary. If you're building "the same," **don't over-invest in video calling as the flagship feature** — chat and audio are where the actual usage and revenue are. Video is a nice-to-have, not the core.

**Astrologer onboarding funnel (this is a moat, not just an HR process):**
1. Application via a **separate "Astrotalk Hiring" app** (worth building as its own lightweight app rather than a buried form in the main app).
2. Shortlisting based on submitted profile/background (4–6 working days).
3. **Two interview rounds** — Round 1 telephonic, Round 2 video call — testing astrology knowledge and communication skill.
4. Soft-skills training for shortlisted astrologers (handling difficult predictions/emotional clients).
5. **30-day probation with in-house monitoring** before full onboarding.
- **No listing/platform fee charged to astrologers** — they earn purely on commission, which keeps supply flowing in.

**Commission structure:** a flat **50/50 split** — a ₹100 (₹20/min × 5 min) consultation nets the astrologer ₹50 and the platform ₹50. This is simpler than the tiered 20–40% commission bands seen in generic "astrology marketplace" advice — 50/50 flat is the actual number to plan your unit economics around if you're benchmarking against Astrotalk specifically.

**Growth playbook:** heavy digital ad spend, YouTube and influencer partnerships for acquisition, plus the SEO calculator/content library above pulling in organic search traffic that converts to free-first-session sign-ups. Trust was the hard problem to solve (not tech) — hence the disproportionate investment in the astrologer verification funnel above.

---

## 2. Recommended tech stack

Given your existing stack (Next.js/TypeScript, Node.js, FastAPI, AWS, Razorpay-heavy India-first builds), here's the direct recommendation — one stack, not a menu:

| Layer | Choice | Why |
|---|---|---|
| Web frontend | **Next.js 15 (App Router) + TypeScript + Tailwind** | Your existing stack; SSR for SEO on astrologer profiles/blog (organic traffic matters a lot in this niche). |
| Mobile (Android + iOS) | **React Native (Expo)** | One codebase for both stores; shares types/hooks with the Next.js web app; LiveKit and most chat/payment SDKs have first-class RN support. Flutter is a reasonable alternative but forks your codebase away from your React expertise for no real gain here. |
| Core backend | **Node.js (NestJS)** | Session orchestration, wallet ledger, matching, notifications — same language as your frontend, good WebSocket support. |
| Kundli calculation service | **Python (FastAPI) + `pyswisseph`** | Isolate the astronomy math in its own microservice — Swiss Ephemeris bindings are more mature in Python than Node. |
| Database | **PostgreSQL** (Neon, matching your other projects) | Wallet ledger and consultation records need ACID transactions, not a document store. |
| Cache / real-time state | **Redis** | Presence (who's online), per-minute billing ticks, session locks. |
| Video/Audio calling | **LiveKit** (self-hosted, Apache-2.0) | See §6 — direct recommendation with reasoning. |
| Chat | **Custom-built on Socket.io + Redis pub/sub**, persisted to Postgres | See §7 — reasoning for building vs. buying. |
| Payments | **Razorpay Route** (marketplace split payments) + your own wallet ledger table | Handles the "client pays platform → platform splits to astrologer" flow without you touching settlement banking directly. |
| Push notifications | **Firebase Cloud Messaging** | Free, standard for RN. |
| File/media storage | **AWS S3 + CloudFront** | Kundli PDFs, profile photos, call recordings if you keep any. |
| Infra | **AWS (ECS Fargate or EC2 + ALB)** | Matches your existing AWS experience. |
| Astrologer KYC | **Manual document upload (PAN, Aadhaar, bank proof) + human review**, DigiLocker integration later | Don't buy a KYC vendor contract for an MVP; automate once volume justifies it. |

---

## 3. High-level architecture

```
Client App (RN/Next.js)                Astrologer App (RN)
        │                                      │
        ▼                                      ▼
   ┌─────────────────────────────────────────────┐
   │            API Gateway / NestJS              │
   │  Auth · Matching · Wallet · Notifications     │
   └───────┬───────────────┬──────────────┬───────┘
           │               │              │
    ┌──────▼─────┐  ┌──────▼──────┐ ┌─────▼──────┐
    │  LiveKit    │  │  Chat/Socket │ │  Kundli    │
    │  (video/    │  │  Server      │ │  Engine    │
    │   audio SFU)│  │  (Node+Redis)│ │  (FastAPI +│
    └─────────────┘  └──────────────┘ │  swisseph) │
           │               │           └────────────┘
           └───────┬───────┘
                    ▼
         ┌─────────────────────┐
         │  Billing Tick Worker │  ← reads Redis every N seconds,
         │  (Node cron/BullMQ)  │    deducts wallet, ends session
         └──────────┬───────────┘    at zero balance
                    ▼
         ┌─────────────────────┐
         │  PostgreSQL (ledger, │
         │  users, sessions)    │
         └─────────────────────┘
```

**Billing must be server-authoritative.** Never trust the client's call duration. A worker ticks every 5–10 seconds, debits the wallet at `rate_per_minute / (60/tick_seconds)`, and force-ends the LiveKit room / chat session the instant balance hits zero. Commission (your cut) and astrologer earnings are computed at settlement, not display time.

---

## 4. The mathematics behind Kundli generation

This is the part most clone-app agencies wave their hands at. Here's the actual pipeline, in order:

**Inputs required:** exact date, time (to the minute — ideally to the second), and place of birth. Place must resolve to latitude, longitude, and the **UTC offset in effect at that place and time** (not just "IST" — geocode via a places API, and be careful with pre-1955 India, which had different regional time zones before standardization).

1. **Julian Day (JD).** Convert the birth date/time (in UTC) to a Julian Day number — the continuous day-count astronomical calculations are built on.

2. **Planetary longitudes (tropical).** Query an ephemeris for the geocentric ecliptic longitude of the Sun, Moon, Mars, Mercury, Jupiter, Venus, and Saturn at that JD. Rahu and Ketu (the lunar nodes) are computed as the Moon's orbital nodes — Ketu is always exactly 180° from Rahu. This is what an ephemeris library (Swiss Ephemeris, see §5) does for you; don't hand-roll orbital mechanics.

3. **Ayanamsa correction (tropical → sidereal).** Vedic astrology uses the *sidereal* zodiac (fixed to actual star positions), while the raw ephemeris output is *tropical* (fixed to the seasons/equinox). The two have drifted apart by about 24°10′ today, due to axial precession. You subtract the **ayanamsa** value from every tropical longitude to get the sidereal longitude:
   ```
   sidereal_longitude = tropical_longitude − ayanamsa(date)
   ```
   **Use Lahiri (Chitrapaksha) ayanamsa** — it's the Indian government's official standard since 1955 and what >90% of Indian users expect. (Other schools — Raman, KP, True Chitra — exist; if you support multiple, let it be a user setting, but Lahiri should be the default or your results won't match what people are used to.)

4. **Sign (Rashi) placement.** The zodiac is 360°, split into 12 signs of 30° each:
   ```
   sign_index = floor(sidereal_longitude / 30)   // 0 = Aries ... 11 = Pisces
   degree_in_sign = sidereal_longitude mod 30
   ```

5. **Nakshatra and Pada.** 27 lunar mansions of 13°20′ (13.333°) each:
   ```
   nakshatra_index = floor(sidereal_longitude / 13.3333)
   pada = floor((sidereal_longitude mod 13.3333) / 3.3333) + 1   // 1–4
   ```
   The **Moon's nakshatra at birth is the single most important number in the whole chart** — it's the seed for Dasha timing (step 7).

6. **Ascendant (Lagna).** The sign rising on the eastern horizon at the exact birth moment — this sets the entire house framework. Computed from the **Local Sidereal Time** at birth (derived from JD + longitude), the location's latitude, and the obliquity of the ecliptic, via the standard spherical-astronomy ascendant formula. This is the most time-sensitive number in the chart: **a 4-minute error in birth time shifts the Ascendant by roughly 1°**, which can flip it into an adjacent sign and change every house placement. Your intake form should make birth-time precision unmissable to the user.

7. **Houses (Bhavas).** Most Vedic practice uses the **whole-sign house system**: the Ascendant's sign is the 1st house, and each subsequent sign in order is the next house — no separate cusp math needed. (Placidus/Sripati systems exist for astrologers who want them; whole-sign is the safe default.)

8. **Vimshottari Dasha (life-period timing) — the core "prediction engine."** A 120-year cycle divided among 9 planets, in a fixed order with fixed year-lengths (this sequence comes from the classical text *Parashara*, and always sums to 120):

   | Planet | Years | Planet | Years | Planet | Years |
   |---|---|---|---|---|---|
   | Ketu | 7 | Moon | 10 | Jupiter | 16 |
   | Venus | 20 | Mars | 7 | Saturn | 19 |
   | Sun | 6 | Rahu | 18 | Mercury | 17 |

   - The **starting planet** = the ruler of the Moon's birth nakshatra (from step 5).
   - The **balance of the first Mahadasha** is prorated by how far the Moon had already travelled through that nakshatra at birth:
     ```
     balance_years = (1 − fraction_of_nakshatra_travelled) × full_years_of_starting_planet
     ```
   - **Antardasha** (sub-period) length = `(sub_planet_years / 120) × mahadasha_years`
   - **Pratyantardasha** (sub-sub-period) = same ratio applied again, one level deeper.
   - This is exactly what powers "your current dasha is Jupiter-Saturn" style output that clients pay astrologers to interpret.

9. **Divisional charts (Vargas) — optional but expected by serious users.** The most commonly requested is **D9 (Navamsa)**, used for marriage/spiritual-purpose analysis: each 30° sign is divided into 9 parts of 3°20′, remapped to a sign per a classical lookup rule. Budget these as a phase-2 feature — D1 (the main chart) covers 80% of consultations.

10. **Panchang elements** (useful for "auspicious timing" features): **Tithi** = `(Moon_longitude − Sun_longitude) / 12°` (30 tithis in a lunar month); **Yoga** = `(Moon_longitude + Sun_longitude) / 13.3333°`; **Karana** = half of a tithi.

**Bottom line:** don't reimplement orbital mechanics. Use a proven ephemeris (next section) for steps 1–2, then the formulas above are straightforward arithmetic on the returned longitudes.

---

## 5. Kundli engine: library and licensing (read this before you write a line of astronomy code)

**Use Swiss Ephemeris** (via the Python `pyswisseph` bindings, or `sweph` if you go Node) — it's the de facto standard behind essentially every serious Vedic astrology product, built on NASA JPL's DE431 planetary data, accurate to sub-arcsecond precision.

**The licensing catch — this matters for a commercial product:**
- Swiss Ephemeris is dual-licensed: **AGPL-3.0 (free)** or a **paid Professional License**.
- AGPL's network clause means: if your app calls the library and users interact with it over the internet (i.e., any SaaS/web app), **you're obligated to open-source your entire application** under AGPL. That's a non-starter for a proprietary, commission-taking platform.
- The **Professional License** removes that obligation. Cost, direct from Astrodienst: **CHF 750 (~$830) one-time** for the first license, **CHF 400 (~$440)** for each additional license, valid **99 years**. This is a rounding error against your overall budget — buy it on day one and don't build on AGPL "for now."

---

## 6. Video & audio calling — direct recommendation

**Use LiveKit, self-hosted.** It's Apache-2.0 (fully open source, no license fees, no per-participant caps), has official React Native and Web SDKs, and — critically for a per-minute billing model — converts your cost structure from "linear, uncapped per-minute fees" (Agora/Twilio/ZEGOCLOUD) into a largely fixed infrastructure cost that improves as you scale rather than degrading.

Concrete numbers to plan around:
- A single **$60/month VPS runs ~200 concurrent participants** on self-hosted LiveKit.
- Managed alternatives (Agora, Twilio Video) bill per participant-minute indefinitely — fine for the first few thousand users, but past roughly **500,000 participant-minutes/month you're typically overpaying by 40–70%** compared to a well-run self-hosted LiveKit deployment.
- If you want to launch in weeks with zero DevOps burden, **LiveKit Cloud** (their managed offering) is the honest middle path — same SDKs, no infra to run, migrate to self-hosted once usage justifies it. This avoids a rewrite later, unlike starting on Agora/Twilio and migrating off.

**Billing mechanics:** the server (not the LiveKit client) starts the billing clock the moment both parties join the room, ticks the wallet down every 5–10 seconds, and force-terminates the room the instant the wallet can't cover the next tick.

---

## 7. Chat — build it, don't buy it

For this specific use case (1:1 metered consultation sessions, not a social feed), a **custom Socket.io + Redis pub/sub** service, with messages persisted to Postgres, is the right call over a chat SDK (Stream, Sendbird, CometChat):

- Your chat is **tightly coupled to the billing engine** — every message (or every tick of an open chat session) needs to touch your wallet ledger. Bolting that onto a third-party SDK's event hooks is more fragile than owning the loop.
- Third-party managed chat SDKs are priced for high-volume social messaging (MAU-based tiers) that doesn't map cleanly to "billed consultation minutes," and self-hosting an open-source alternative (Rocket.Chat, Matrix) to dodge that pricing brings its own DevOps tax (industry estimates put small self-hosted deployments at **$15K+/year in server + maintenance TCO** once you count push notification infrastructure, uptime, and scaling work) — for a feature set (1:1 rooms, typing indicators, read receipts) that's genuinely small to build yourself.
- You already need Redis for LiveKit-adjacent presence/session state — reuse it for chat pub/sub instead of adding another vendor dependency.

Scope: rooms, typing indicators, read receipts, image/voice-note attachments (S3), message persistence, and a "consultation summary" export. That's a 2–3 week build for someone at your level, not a multi-month one.

---

## 8. Feature list

### Client-facing
- Mobile OTP + social login
- **Free Kundli generation on signup** (this is the industry-standard lead magnet — get people in the door, monetize the consultation)
- Astrologer discovery: filters by language, specialization (career/marriage/vastu/tarot/numerology), price per minute, rating, online status
- Wallet: recharge via Razorpay/UPI, transaction history
- Instant or scheduled chat/audio/video consultation
- Live in-session balance + timer display (server-truth, not a client-side countdown)
- Consultation history + downloadable Kundli PDF report
- Ratings & reviews per astrologer
- Referral program
- Multilingual UI (Hindi + regional languages — this segment skews heavily toward vernacular users)
- Push notifications (astrologer online, offer alerts, dasha-change reminders)
- Phase 2: paid detailed reports (compatibility, yearly forecast), gemstone/remedy e-commerce add-on

### Astrologer-facing
- Onboarding + document upload (PAN, bank details, experience proof) with an admin approval gate
- Availability toggle, specialization tags, rate-per-minute setting (within platform-defined bands)
- Earnings dashboard, payout schedule, TDS certificate access
- In-session chat/call tools, client history notes

### Admin panel
- Astrologer approval workflow
- Revenue dashboard, commission rate management
- Dispute/refund handling
- Chat moderation (flagged keywords, abuse reports)
- Push notification / campaign tool

---

## 9. Cost estimate

**Market reference (what agencies quote for a clone):**

| Tier | Scope | Agency cost (2026 market rate) | Timeline |
|---|---|---|---|
| Lean MVP | Kundli + chat + wallet, no video | ₹8–20L ($12,000–$25,000) | 3–4 months |
| Mid-tier | + live chat consultations, astrologer onboarding, ratings | $25,000–$60,000 | 4–6 months |
| Full platform | + video calls, AI-assisted predictions, multilingual, web + native apps, analytics dashboard | $60,000–$150,000+ | 8–14 months |

**Your actual cost, building it yourself**, is mostly infrastructure and licenses, not agency markup:

| Item | Approx. cost |
|---|---|
| Swiss Ephemeris Professional License | ~$830 one-time (see §5) |
| AWS (ECS + RDS/Neon + S3), early stage | ~$150–400/month, scales with usage |
| LiveKit self-hosted VPS | ~$60–150/month for first few hundred concurrent users |
| Razorpay | No upfront cost; ~2% + GST per transaction |
| Apple Developer Program | $99/year |
| Google Play Developer | $25 one-time |
| Domain + SSL + monitoring | ~$100–200/year |
| Design/QA contractor help (optional) | Variable — your call given your own testing-tool background (Jest/Playwright/Cypress) |

Realistic solo/small-team timeline: **10–14 weeks for an MVP** (Kundli + wallet + chat, no video), **6–9 months to a full Astrotalk-level platform** with video calling, astrologer marketplace at scale, and admin tooling.

---

## 10. Legal & compliance — what the agreement needs to cover

This is a regulated-adjacent business (payments + a services marketplace + personal data), not just an app:

- **Entity:** run this through a Private Limited company, not a proprietorship — you're collecting client money and disbursing to third-party astrologers, and that entity structure matters for both taxation and liability.
- **Payment aggregation:** don't try to become your own payment aggregator. Route everything through a licensed PA (Razorpay Route/Route-equivalent from Cashfree) so you're never directly holding regulated float.
- **TDS on astrologer payouts:** astrology consultation is a professional service. Payouts to individual Indian astrologers attract **TDS under Section 194J at 10%**, once aggregate payments to that astrologer exceed ₹50,000 in a financial year (deducted on the fee, not on GST if GST is separately invoiced). Your payout ledger needs to track this per-astrologer, per-financial-year, and issue Form 16A.
- **GST:** your platform commission is a taxable supply; astrologers above the GST threshold need to invoice you (or you self-invoice under reverse charge, depending on your final structure — get this confirmed by a CA before launch, this is genuinely one to get right rather than guess).
- **DPDP Act, 2023 (India's data protection law):** you'll be processing sensitive data (birth details, payment info, chat/call content). Your Terms of Service and Privacy Policy need explicit consent language, a data-processing clause, and a breach-notification commitment.
- **Disclaimer language:** predictions must be framed as guidance, not guaranteed outcomes — standard practice across the category (Astrotalk, Astroyogi, etc. all carry this), and it matters both legally and for managing user expectations.
- **Astrologer classification:** astrologers should be engaged as **independent contractors**, not employees — this affects TDS section, liability, and termination terms. See the companion agreement document.
- **Commission benchmark:** Astrotalk runs a flat **50/50 split** with **no listing fee** charged to astrologers — that's the number to beat or match if you're recruiting from the same astrologer pool; undercutting their cut (e.g., 60/40 in the astrologer's favor) is a realistic early wedge to attract experienced astrologers away from an incumbent.

---

## 11. Suggested build order

1. **Phase 0 (2 weeks):** Kundli engine microservice (FastAPI + pyswisseph) — get this right and validated against known reference charts before building anything else on top of it.
2. **Phase 1 (8–10 weeks):** Auth, wallet, astrologer marketplace listing, chat consultations with server-side billing.
3. **Phase 2 (6–8 weeks):** LiveKit audio/video calling, astrologer app, admin panel.
4. **Phase 3 (ongoing):** Divisional charts, paid reports, multilingual, e-commerce add-on, referrals.

---

## 12. Reference documentation

- LiveKit docs (self-hosting + React Native SDK): https://docs.livekit.io/
- Swiss Ephemeris (library + licensing): https://www.astro.com/swisseph/
- `pyswisseph` (Python bindings): https://github.com/astrorigin/pyswisseph
- Razorpay Route (marketplace payment splits): https://razorpay.com/docs/route/
- Section 194J (TDS on professional fees): Income Tax Department circulars — confirm current rate/threshold with your CA before launch
- Digital Personal Data Protection Act, 2023: https://www.meity.gov.in/data-protection-framework

---

*A companion document — the Astrologer Partner Agreement — covers the legal/contractual side and is provided separately.*
