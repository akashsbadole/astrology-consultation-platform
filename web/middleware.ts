import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/otp-login',
  '/astrologer/login',
  '/astrologer/apply',
  '/admin/login',
  '/privacy',
  '/terms',
];

const ROLE_ROUTES: Record<string, string[]> = {
  '/dashboard': ['customer'],
  '/astrologer-panel': ['astrologer'],
  '/admin-panel': ['admin'],
};

// Written by the web client after a successful login — see lib/session.ts.
const SESSION_COOKIE = 'web_session';

/**
 * The ONLY session signal this middleware can see is the web client's own
 * routing cookie. The API's HttpOnly refresh cookie is set on the API's own
 * host with Path=/auth, so the browser never sends it alongside web-app page
 * requests — and it holds an opaque (non-JWT) token, so it was never parseable
 * for a role anyway. Real authentication is enforced by the backend on every
 * API call; this cookie only drives presence checks and role redirects.
 */
function decodeSession(value: string | undefined): { id: string; role: string } | null {
  if (!value) return null;
  try {
    const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const parsed = JSON.parse(atob(padded)) as { id?: unknown; role?: unknown };
    if (typeof parsed.id !== 'string' || typeof parsed.role !== 'string') return null;
    return { id: parsed.id, role: parsed.role };
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  for (const [prefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(prefix) && !allowedRoles.includes(session.role)) {
      const dashboardMap: Record<string, string> = {
        customer: '/dashboard',
        astrologer: '/astrologer-panel',
        admin: '/admin-panel',
      };
      return NextResponse.redirect(new URL(dashboardMap[session.role] ?? '/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|.*\\.png$).*)'],
};
