import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthTextInput } from '../../components/AuthTextInput';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ApiError, api } from '../../lib/api';
import { GoogleSignInCancelled, signInWithGoogle } from '../../lib/googleAuth';
import { colors, spacing, type } from '../../theme/tokens';

/**
 * Deliberately no celestial motif, no "create an account" link, and a
 * flatter midnightDeep background — this is an internal tool, not a
 * consumer acquisition funnel, and it should read that way. Admin
 * accounts can never be created from this screen (see backend/auth.py);
 * Google sign-in here only links to an already-provisioned admin account.
 */
export default function AdminLoginScreen() {
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
      router.replace('/'); // route to the admin dashboard home once it exists
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
      await api.loginWithGoogle(idToken, 'admin');
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
    <View style={styles.background}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Text style={styles.headline}>Admin access</Text>
              <Text style={styles.subhead}>Restricted to authorized platform administrators.</Text>
            </View>

            <View style={styles.panel}>
              <AuthTextInput
                label="Email"
                placeholder="you@company.com"
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
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  background: {
    flex: 1,
    backgroundColor: colors.midnightDeep,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    marginBottom: spacing.lg,
  },
  headline: {
    ...type.display,
    fontSize: 26,
    color: colors.parchment,
  },
  subhead: {
    ...type.subhead,
    color: colors.mist,
    marginTop: spacing.xs,
  },
  panel: {
    backgroundColor: colors.parchment,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(198, 161, 91, 0.25)',
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
});
