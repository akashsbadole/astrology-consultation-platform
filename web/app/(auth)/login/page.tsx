'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AuthInput } from '../../../components/AuthInput';
import { CelestialMotif } from '../../../components/CelestialMotif';
import { GoogleSignInButton } from '../../../components/GoogleSignInButton';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ApiError, api } from '../../../lib/api';

export default function CustomerLoginPage() {
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
      router.push('/'); // route to the customer home once it exists
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleIdToken(idToken: string) {
    setError(null);
    try {
      await api.loginWithGoogle(idToken, 'customer');
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Google sign-in failed. Please try again.');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-midnight to-midnight-deep px-6 py-16">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <CelestialMotif />
          <h1 className="mt-5 font-display text-[30px] font-semibold leading-tight text-parchment">
            Continue your journey
          </h1>
          <p className="mt-2 max-w-[280px] text-[15px] text-mist">
            Sign in to pick up where you left off with your astrologer.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-panel border border-brass/35 bg-parchment p-8"
        >
          <AuthInput
            label="Email"
            type="email"
            placeholder="you@example.com"
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

        <div className="mt-8 flex flex-col items-center gap-2 text-center">
          <p className="text-[15px] text-mist">
            New here?{' '}
            <Link href="/register" className="font-semibold text-brass">
              Create an account
            </Link>
          </p>
          <Link href="/astrologer/login" className="text-[13px] text-mist">
            Are you an astrologer? Sign in here
          </Link>
        </div>
      </div>
    </main>
  );
}
