'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AuthInput } from '../../../components/AuthInput';
import { CelestialMotif } from '../../../components/CelestialMotif';
import { GoogleSignInButton } from '../../../components/GoogleSignInButton';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ApiError, api } from '../../../lib/api';

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (fullName.trim().length < 1) errors.fullName = 'Enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Enter a valid email.';
    if (password.length < 8) errors.password = 'Use at least 8 characters.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      await api.register(email.trim(), password, fullName.trim(), 'customer');
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create your account. Please try again.');
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
      setError(err instanceof ApiError ? err.message : 'Google sign-up failed. Please try again.');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-midnight to-midnight-deep px-6 py-16">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <CelestialMotif size={88} />
          <h1 className="mt-5 font-display text-[30px] font-semibold leading-tight text-parchment">
            Create your account
          </h1>
          <p className="mt-2 text-[15px] text-mist">Your first consultation is on us.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-panel border border-brass/35 bg-parchment p-8"
        >
          <AuthInput
            label="Full name"
            placeholder="Your name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={fieldErrors.fullName}
          />
          <AuthInput
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
          />
          <AuthInput
            label="Password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
          />
          {error && <p className="mb-4 text-[13px] text-error">{error}</p>}

          <PrimaryButton label="Create account" type="submit" loading={loading} />

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#D8D0BC]" />
            <span className="text-[13px] text-brass-dim">or</span>
            <div className="h-px flex-1 bg-[#D8D0BC]" />
          </div>

          <GoogleSignInButton onIdToken={handleGoogleIdToken} onError={() => setError('Google sign-up failed.')} />
        </form>

        <div className="mt-8 text-center">
          <p className="text-[15px] text-mist">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-brass">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
