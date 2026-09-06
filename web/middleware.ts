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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('refresh_token')?.value;
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? ''));
    const role = payload.role as string | undefined;

    for (const [prefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
      if (pathname.startsWith(prefix) && role && !allowedRoles.includes(role)) {
        const dashboardMap: Record<string, string> = {
          customer: '/dashboard',
          astrologer: '/astrologer-panel',
          admin: '/admin-panel',
        };
        return NextResponse.redirect(new URL(dashboardMap[role] ?? '/login', request.url));
      }
    }
  } catch {
    // If JWT parsing fails, let the backend handle auth — don't block
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|.*\\.png$).*)'],
};
