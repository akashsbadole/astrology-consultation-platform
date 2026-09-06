import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { colors, radius, spacing, type } from '../../theme/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const panchang = useQuery({
    queryKey: ['panchang'],
    queryFn: () => api.getPanchang(),
  });

  return (
    <LinearGradient colors={[colors.midnight, colors.midnightDeep]} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.greeting}>Namaste, {user?.full_name ?? 'Guest'}</Text>
          <Text style={styles.subhead}>What would you like to explore today?</Text>

          <View style={styles.cards}>
            <Pressable style={styles.card} onPress={() => router.push('/(dashboard)/astrologers')}>
              <Text style={styles.cardIcon}>✦</Text>
              <Text style={styles.cardTitle}>Consult{'\n'}Astrologer</Text>
            </Pressable>

            <Pressable style={styles.card} onPress={() => router.push('/(dashboard)/kundli')}>
              <Text style={styles.cardIcon}>◎</Text>
              <Text style={styles.cardTitle}>Generate{'\n'}Kundli</Text>
            </Pressable>

            <Pressable style={styles.card} onPress={() => router.push('/(dashboard)/wallet')}>
              <Text style={styles.cardIcon}>₹</Text>
              <Text style={styles.cardTitle}>My{'\n'}Wallet</Text>
            </Pressable>
          </View>

          <View style={styles.panchangSection}>
            <Text style={styles.sectionTitle}>Today's Panchang</Text>
            {panchang.isLoading && (
              <ActivityIndicator color={colors.brass} style={styles.loadingPad} />
            )}
            {panchang.isError && (
              <Text style={styles.errorText}>Could not load panchang data.</Text>
            )}
            {panchang.data && (
              <View style={styles.panchangCard}>
                {Object.entries(panchang.data).map(([key, value]) => (
                  <View key={key} style={styles.panchangRow}>
                    <Text style={styles.panchangKey}>{key.replace(/_/g, ' ')}</Text>
                    <Text style={styles.panchangValue}>{String(value)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  greeting: {
    ...type.display,
    color: colors.parchment,
  },
  subhead: {
    ...type.subhead,
    color: colors.mist,
    marginTop: spacing.xs,
  },
  cards: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  card: {
    flex: 1,
    backgroundColor: 'rgba(198,161,91,0.08)',
    borderColor: colors.brassDim,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardIcon: {
    fontSize: 28,
    color: colors.brass,
  },
  cardTitle: {
    ...type.label,
    color: colors.parchment,
    textAlign: 'center',
  },
  panchangSection: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...type.label,
    color: colors.brass,
    marginBottom: spacing.sm,
  },
  loadingPad: {
    paddingVertical: spacing.lg,
  },
  errorText: {
    ...type.caption,
    color: colors.error,
  },
  panchangCard: {
    backgroundColor: 'rgba(246,241,231,0.06)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.mistFaint,
    padding: spacing.md,
  },
  panchangRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.mistFaint,
  },
  panchangKey: {
    ...type.body,
    color: colors.mist,
    textTransform: 'capitalize',
  },
  panchangValue: {
    ...type.body,
    color: colors.parchment,
  },
});
