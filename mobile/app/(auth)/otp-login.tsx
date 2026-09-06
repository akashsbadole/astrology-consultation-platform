import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CelestialMotif } from '../../components/CelestialMotif';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ApiError, api } from '../../lib/api';
import { colors, spacing, type } from '../../theme/tokens';

export default function OtpLoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRef = useRef<TextInput>(null);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [resendTimer]);

  async function handleSendOtp() {
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
      setTimeout(() => otpRef.current?.focus(), 100);
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
      otpRef.current?.focus();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resend OTP. Please try again.');
    }
  }

  function handleOtpChange(text: string) {
    const cleaned = text.replace(/\D/g, '').slice(0, 6);
    const next = Array.from({ length: 6 }, (_, i) => cleaned[i] ?? '');
    setOtpDigits(next);
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
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid or expired OTP. Please try again.');
      setOtpDigits(['', '', '', '', '', '']);
      otpRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }, [otpDigits, phone, router]);

  return (
    <LinearGradient colors={[colors.midnight, colors.midnightDeep]} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <CelestialMotif />
              <Text style={styles.headline}>
                {step === 'phone' ? 'Sign in with your phone' : 'Enter verification code'}
              </Text>
              <Text style={styles.subhead}>
                {step === 'phone'
                  ? 'We will send a one-time code to verify your number.'
                  : `Code sent to ${phone}`}
              </Text>
            </View>

            <View style={styles.panel}>
              {step === 'phone' ? (
                <>
                  <Text style={styles.label}>Phone number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+91 98765 43210"
                    placeholderTextColor={colors.brassDim}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    value={phone}
                    onChangeText={setPhone}
                  />
                  {!!error && <Text style={styles.error}>{error}</Text>}
                  <PrimaryButton label="Send OTP" onPress={handleSendOtp} loading={loading} />
                </>
              ) : (
                <>
                  <Text style={styles.label}>6-digit code</Text>
                  <TextInput
                    ref={otpRef}
                    style={styles.otpInput}
                    placeholder="000000"
                    placeholderTextColor={colors.brassDim}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otpDigits.join('')}
                    onChangeText={handleOtpChange}
                  />
                  {!!error && <Text style={styles.error}>{error}</Text>}
                  <PrimaryButton label="Verify" onPress={handleVerify} loading={loading} />
                  <View style={styles.resendRow}>
                    {resendTimer > 0 ? (
                      <Text style={styles.timerText}>Resend code in {resendTimer}s</Text>
                    ) : (
                      <Pressable onPress={handleResend} hitSlop={8}>
                        <Text style={styles.resendLink}>Resend OTP</Text>
                      </Pressable>
                    )}
                  </View>
                </>
              )}
            </View>

            <View style={styles.footer}>
              <Pressable onPress={() => router.push('/customer-login')} hitSlop={8}>
                <Text style={styles.footerText}>
                  Prefer email? <Text style={styles.footerLink}>Sign in with email</Text>
                </Text>
              </Pressable>
              <Pressable onPress={() => router.push('/astrologer-login')} hitSlop={8}>
                <Text style={styles.footerLinkSecondary}>Are you an astrologer? Sign in here</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headline: {
    ...type.display,
    color: colors.parchment,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  subhead: {
    ...type.subhead,
    color: colors.mist,
    marginTop: spacing.xs,
    textAlign: 'center',
    maxWidth: 280,
  },
  panel: {
    backgroundColor: colors.parchment,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(198, 161, 91, 0.35)',
    padding: spacing.lg,
  },
  label: {
    ...type.caption,
    color: colors.brassDim,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8D0BC',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.midnight,
    marginBottom: spacing.sm,
  },
  otpInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8D0BC',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 22,
    fontWeight: '600',
    color: colors.midnight,
    letterSpacing: 8,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  error: {
    ...type.caption,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  timerText: {
    ...type.caption,
    color: colors.mist,
  },
  resendLink: {
    ...type.caption,
    color: colors.brass,
    fontFamily: 'Manrope_600SemiBold',
  },
  footer: {
    marginTop: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: {
    ...type.body,
    color: colors.mist,
  },
  footerLink: {
    color: colors.brass,
    fontFamily: 'Manrope_600SemiBold',
  },
  footerLinkSecondary: {
    ...type.caption,
    color: colors.mist,
  },
});
