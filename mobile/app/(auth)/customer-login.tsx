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

export default function CustomerLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.');
      return;
    }
    setLoading(true);
    try {
      await api.login(email.trim(), password);
      router.replace('/'); // route to the customer home once it exists
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    setGoogleLoading(true);
    try {
      const idToken = await signInWithGoogle();
      await api.loginWithGoogle(idToken, 'customer');
      router.replace('/');
    } catch (e) {
      if (!(e instanceof GoogleSignInCancelled)) {
        setError(e instanceof ApiError ? e.message : 'Google sign-in failed. Please try again.');
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
              <CelestialMotif />
              <Text style={styles.headline}>Continue your journey</Text>
              <Text style={styles.subhead}>
                Sign in to pick up where you left off with your astrologer.
              </Text>
            </View>

            <View style={styles.panel}>
              <AuthTextInput
                label="Email"
                placeholder="you@example.com"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <AuthTextInput
                label="Password"
                placeholder="Enter your password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              {!!error && <Text style={styles.error}>{error}</Text>}

              <PrimaryButton label="Sign in" onPress={handleLogin} loading={loading} />

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <GoogleSignInButton onPress={handleGoogleLogin} loading={googleLoading} />

              <View style={styles.otpLinkRow}>
                <Pressable onPress={() => router.push('/otp-login')} hitSlop={8}>
                  <Text style={styles.otpLink}>Sign in with phone number</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.footer}>
              <Pressable onPress={() => router.push('/customer-register')} hitSlop={8}>
                <Text style={styles.footerText}>
                  New here? <Text style={styles.footerLink}>Create an account</Text>
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
  otpLinkRow: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  otpLink: {
    ...type.body,
    color: colors.mist,
  },
});
