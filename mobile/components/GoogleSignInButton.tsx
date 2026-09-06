import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing, type } from '../theme/tokens';
import { GoogleGlyph } from './GoogleGlyph';

type Props = {
  onPress: () => void;
  loading?: boolean;
};

/**
 * Kept neutral (light surface, standard proportions) per Google's own
 * branding guidance for sign-in buttons — this is one UI element that
 * intentionally does NOT take the app's brass/midnight palette.
 */
export function GoogleSignInButton({ onPress, loading }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [styles.wrapper, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
    >
      {loading ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <>
          <GoogleGlyph size={18} />
          <Text style={styles.label}>Continue with Google</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#DDD8CB',
    paddingVertical: 14,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    ...type.label,
    color: colors.ink,
  },
});
