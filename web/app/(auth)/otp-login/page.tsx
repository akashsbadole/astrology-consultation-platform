'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { CelestialMotif } from '@/components/CelestialMotif';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ApiError, api } from '@/lib/api';

export default function OtpLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [resendTimer]);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!phone.trim()) {
      setError('Enter your phone number to continue.');
      return;
    }
    setLoading(true);
    try {
      await api.sendOtp(phone.trim());
      setStep('otp');
      setResendTimer(30);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    try {
      await api.sendOtp(phone.trim());
      setResendTimer(30);
      setOtpDigits(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resend OTP. Please try again.');
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) return;
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const next = [...otpDigits];
      next[index - 1] = '';
      setOtpDigits(next);
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...otpDigits];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] ?? '';
    setOtpDigits(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  const handleVerify = useCallback(async () => {
    setError(null);
    const code = otpDigits.join('');
    if (code.length !== 6) {
      setError('Enter the complete 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      await api.verifyOtp(phone.trim(), code);
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid or expired OTP. Please try again.');
      setOtpDigits(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [otpDigits, phone, router]);

  async function handleVerifySubmit(e: React.FormEvent) {
    e.preventDefault();
    await handleVerify();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-midnight to-midnight-deep px-6 py-16">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <CelestialMotif />
          <h1 className="mt-5 font-display text-[30px] font-semibold leading-tight text-parchment">
            {step === 'phone' ? 'Sign in with your phone' : 'Enter verification code'}
          </h1>
          <p className="mt-2 max-w-[280px] text-[15px] text-mist">
            {step === 'phone'
              ? 'We will send a one-time code to verify your number.'
              : `Code sent to ${phone}`}
          </p>
        </div>

        <div className="rounded-panel border border-brass/35 bg-parchment p-8">
          {step === 'phone' ? (
            <form onSubmit={handleSendOtp}>
              <label className="mb-1 block text-[13px] font-medium text-brass-dim">Phone number</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mb-4 w-full rounded-lg border border-[#D8D0BC] bg-white px-4 py-3 text-[15px] text-midnight placeholder:text-[#B0A890] focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
              />
              {error && <p className="mb-4 text-[13px] text-error">{error}</p>}
              <PrimaryButton label="Send OTP" type="submit" loading={loading} />
            </form>
          ) : (
            <form onSubmit={handleVerifySubmit}>
              <div className="mb-6 flex justify-center gap-3">
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={i === 0 ? handleOtpPaste : undefined}
                    className="h-12 w-12 rounded-lg border border-[#D8D0BC] bg-white text-center text-[20px] font-semibold text-midnight focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
                  />
                ))}
              </div>
              {error && <p className="mb-4 text-center text-[13px] text-error">{error}</p>}
              <PrimaryButton label="Verify" type="submit" loading={loading} />
              <div className="mt-4 text-center">
                {resendTimer > 0 ? (
                  <p className="text-[13px] text-mist">Resend code in {resendTimer}s</p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-[13px] text-brass hover:text-brass-dim"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        <div className="mt-8 flex flex-col items-center gap-2 text-center">
          <p className="text-[15px] text-mist">
            Prefer email?{' '}
            <Link href="/login" className="font-semibold text-brass">
              Sign in with email
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
