import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthTextInput } from '../../components/AuthTextInput';
import { CelestialMotif } from '../../components/CelestialMotif';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ApiError, api } from '../../lib/api';
import { GoogleSignInCancelled, signInWithGoogle } from '../../lib/googleAuth';
import { colors, spacing, type } from '../../theme/tokens';

/**
 * This screen creates the LOGIN identity only (role: astrologer on the
 * `users` table). It does not yet run the full application/verification
 * funnel from BACKEND-SPEC.md Section 4 (document upload, interview
 * scheduling, probation state) — that needs the separate `astrologers`
 * profile table and its own routes (Module 3 in CLAUDE.md), which aren't
 * part of this auth starter. After this succeeds, route the user into a
 * "complete your application" flow before they can appear in search or
 * accept consultations — don't treat account creation here as equivalent
 * to being an approved, bookable astrologer.
 */
export default function AstrologerRegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ [k: string]: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function validate(): boolean {
    const errors: { [k: string]: string } = {};
    if (fullName.trim().length < 1) errors.fullName = 'Enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Enter a valid email.';
    if (password.length < 8) errors.password = 'Use at least 8 characters.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleRegister() {
    setError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      await api.register(email.trim(), password, fullName.trim(), 'astrologer');
      router.replace('/'); // route to the "complete your application" flow once it exists
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not submit your application. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    setError(null);
    setGoogleLoading(true);
    try {
      const idToken = await signInWithGoogle();
      await api.loginWithGoogle(idToken, 'astrologer');
      router.replace('/');
    } catch (e) {
      if (!(e instanceof GoogleSignInCancelled)) {
        setError(e instanceof ApiError ? e.message : 'Google sign-up failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <LinearGradient colors={[colors.midnight, colors.midnightDeep]} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <CelestialMotif size={88} />
              <Text style={styles.headline}>Apply to join</Text>
              <Text style={styles.subhead}>
                Create your account to start the application. We'll ask for your
                credentials and experience next.
              </Text>
            </View>

            <View style={styles.panel}>
              <AuthTextInput
                label="Full name"
                placeholder="Your name"
                value={fullName}
                onChangeText={setFullName}
                error={fieldErrors.fullName}
              />
              <AuthTextInput
                label="Email"
                placeholder="you@example.com"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                error={fieldErrors.email}
              />
              <AuthTextInput
                label="Password"
                placeholder="At least 8 characters"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                error={fieldErrors.password}
              />
              {!!error && <Text style={styles.error}>{error}</Text>}

              <PrimaryButton label="Continue application" onPress={handleRegister} loading={loading} />

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <GoogleSignInButton onPress={handleGoogleSignUp} loading={googleLoading} />
            </View>

            <View style={styles.footer}>
              <Pressable onPress={() => router.push('/astrologer-login')} hitSlop={8}>
                <Text style={styles.footerText}>
                  Already applied? <Text style={styles.footerLink}>Sign in</Text>
                </Text>
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
    maxWidth: 300,
  },
  panel: {
    backgroundColor: colors.parchment,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(198, 161, 91, 0.35)',
    padding: spacing.lg,
  },
  error: {
    ...type.caption,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#D8D0BC',
  },
  dividerText: {
    ...type.caption,
    color: colors.brassDim,
    marginHorizontal: spacing.sm,
  },
  footer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    ...type.body,
    color: colors.mist,
  },
  footerLink: {
    color: colors.brass,
    fontFamily: 'Manrope_600SemiBold',
  },
});
