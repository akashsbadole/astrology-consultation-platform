import type { UserPublic } from './types';

/**
 * A lightweight, NON-SENSITIVE cookie the web app owns so the Next.js
 * middleware can gate routes and do role-based redirects.
 *
 * Why this exists: the middleware runs on the web app's host, so it can never
 * see the API's HttpOnly refresh cookie — that cookie is set on the API's own
 * domain with Path=/auth (so it is only ever sent to /auth/* API calls), and it
 * holds an opaque token, not a JWT. This cookie carries NO tokens: the access
 * token stays in memory (lib/api.ts) and the refresh token stays HttpOnly on
 * the API's domain. It only tells the middleware "a session exists, for this
 * role" — the backend still enforces auth on every single API call.
 */
const SESSION_COOKIE = 'web_session';

// Matches the refresh-token lifetime on the backend (jwt_refresh_expire_days).
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function encodeSession(payload: { id: string; role: string }): string {
  // Base64url: cookie-safe, trivially readable by the middleware, and grants
  // nothing by itself — it is routing metadata, not a credential.
  const b64 = btoa(JSON.stringify(payload));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function setSessionCookie(user: Pick<UserPublic, 'id' | 'role'>): void {
  if (typeof document === 'undefined') return; // SSR guard
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const parts = [
    `${SESSION_COOKIE}=${encodeSession({ id: user.id, role: user.role })}`,
    'path=/',
    'samesite=lax',
    `max-age=${MAX_AGE_SECONDS}`,
  ];
  if (isHttps) parts.push('secure');
  document.cookie = parts.join('; ');
}

export function clearSessionCookie(): void {
  if (typeof document === 'undefined') return; // SSR guard
  document.cookie = `${SESSION_COOKIE}=; path=/; samesite=lax; max-age=0`;
}
