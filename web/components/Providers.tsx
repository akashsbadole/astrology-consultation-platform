'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_WEB_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID as string;

export function Providers({ children }: { children: React.ReactNode }) {
  return <GoogleOAuthProvider clientId={GOOGLE_WEB_CLIENT_ID}>{children}</GoogleOAuthProvider>;
}
