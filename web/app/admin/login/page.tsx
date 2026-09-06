'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AuthInput } from '@/components/AuthInput';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ApiError, api } from '@/lib/api';

/**
 * Deliberately no celestial motif, no "create an account" link, flat
 * midnight-deep background — an internal tool, not a growth funnel.
 * Google sign-in here only links to an already-provisioned admin account
 * (see backend/app/routers/auth.py) — it can never create one.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.');
      return;
    }
    setLoading(true);
    try {
      await api.login(email.trim(), password);
      router.push('/'); // route to the admin dashboard home once it exists
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleIdToken(idToken: string) {
    setError(null);
    try {
      await api.loginWithGoogle(idToken, 'admin');
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Google sign-in failed. Please try again.');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-midnight-deep px-6 py-20">
      <div className="w-full max-w-[400px]">
        <div className="mb-8">
          <h1 className="font-display text-[26px] font-semibold text-parchment">Admin access</h1>
          <p className="mt-2 text-[15px] text-mist">
            Restricted to authorized platform administrators.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[14px] border border-brass/25 bg-parchment p-8"
        >
          <AuthInput
            label="Email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <AuthInput
            label="Password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="mb-4 text-[13px] text-error">{error}</p>}

          <PrimaryButton label="Sign in" type="submit" loading={loading} />

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#D8D0BC]" />
            <span className="text-[13px] text-brass-dim">or</span>
            <div className="h-px flex-1 bg-[#D8D0BC]" />
          </div>

          <GoogleSignInButton onIdToken={handleGoogleIdToken} onError={() => setError('Google sign-in failed.')} />
        </form>
      </div>
    </main>
  );
}
