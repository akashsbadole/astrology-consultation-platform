# TODO — Astrology Platform Build Checklist

## Backend (Python/FastAPI) — COMPLETE ✅
- [x] Auth (email/password, Google, JWT refresh rotation)
- [x] OTP-based phone auth (send OTP, verify OTP, auto-create user)
- [x] Wallet & Razorpay payments
- [x] Astrologer marketplace (search, ranking, reviews)
- [x] Consultations (request, accept, end)
- [x] Chat (Socket.IO + message persistence)
- [x] Billing tick worker (server-authoritative)
- [x] Kundli engine (ephemeris, dasha, dosha, matching, panchang)
- [x] Store (products, orders, checkout)
- [x] LiveKit token generation (audio/video)
- [x] Admin endpoints (astrologer approval, analytics)
- [x] Content (horoscope, panchang)
- [x] Phone field on User model

## Web Frontend (Next.js) — COMPLETE ✅ (26 routes)
- [x] Auth: email/password login, register, Google OAuth, OTP phone login
- [x] Root `/` page (role-based redirect)
- [x] App shell (sidebar nav, role-aware links, logout)
- [x] Auth context (Zustand store, TanStack Query provider, hydration)
- [x] Client dashboard / home (quick actions, panchang, recent consultations)
- [x] Astrologer list & search page (filters, pagination, cards)
- [x] Astrologer detail page (profile, reviews, start consultation)
- [x] Kundli generation page (form + saved charts)
- [x] Kundli detail page (planets, houses, dasha, doshas)
- [x] Kundli matching page (per-koota breakdown, color-coded bars)
- [x] Wallet page (balance, Razorpay recharge, transaction history)
- [x] Chat consultation page (socket.io, session timer, end call)
- [x] Consultation history page
- [x] Store / product catalog page (categories, cart, checkout)
- [x] Horoscope / panchang content page (12 signs, 4 periods)
- [x] Astrologer dashboard (online toggle, rate, stats)
- [x] Astrologer consultations page (active + past)
- [x] Astrologer earnings page (summary + payout history)
- [x] Admin dashboard (revenue summary)
- [x] Admin astrologer queue (advance/reject with confirmation)
- [x] Admin revenue analytics (bar charts)
- [x] Admin users page
- [x] Middleware, error.tsx, not-found.tsx
- [x] Dependencies: TanStack Query, Zustand, socket.io-client, livekit-client, zod
- [x] Full API client (43+ endpoints)
- [x] Shared components (AppShell, StarRating, EmptyState, PriceDisplay)
- [x] Utility functions (formatPaise, formatDate, formatDateTime)
- [x] Build compiles with 0 errors

## Mobile (Expo) — COMPLETE ✅ (22+ screens)
- [x] app.json (Expo configuration, plugins, schemes)
- [x] Root _layout.tsx (QueryClientProvider, AuthGuard, font loading)
- [x] Auth screens: customer login, register, astrologer login, register, admin login, OTP login
- [x] Auth store (Zustand) + extended API client (all endpoints)
- [x] Client: home, astrologers, astrologer-detail, kundli, kundli-detail, wallet, store, consultations, consultation-chat
- [x] Astrologer: dashboard, consultations, earnings
- [x] Admin: dashboard, astrologers, revenue
- [x] TypeScript typecheck passes (0 errors)

## Infrastructure
- [x] Docker Compose (postgres, redis, backend, web, livekit, caddy)
- [x] Bootstrap VPS script
- [x] DB backup script
- [x] Manage script
- [x] Root .gitignore
- [x] TODO.md (this file)

## Acceptance Criteria per Module (from CLAUDE.md)
- [x] M0: Logged-in user navigates 3+ screens on web (26 routes) + mobile (22+ screens)
- [x] M1: Kundli engine reproduces correct Moon nakshatra, Ascendant, current Dasha (backend validated)
- [x] M2: Test-mode recharge credits wallet, appears in immutable ledger
- [x] M3: Admin-approved astrologer is searchable/bookable; matching returns per-koota breakdown
- [x] M4: Chat session wallet-to-zero force-ends server-side (billing worker implemented)
- [x] M5: Call connects, bills correctly, both ends see synced timer (LiveKit + billing integrated)
- [x] M6: Store purchase flows through Razorpay + appears in transaction history
- [x] M7: Admin can approve astrologers, view revenue, handle disputes
- [x] M8: Horoscope/calculator pages render SSR for SEO (Next.js server components)
