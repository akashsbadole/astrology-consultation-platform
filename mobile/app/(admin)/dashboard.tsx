import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '../../lib/api';
import { colors, radius, spacing, type } from '../../theme/tokens';

export default function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'revenue'],
    queryFn: () => api.adminGetRevenue(),
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={colors.brass} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.loading}>
        <Text style={styles.errorText}>
          {error instanceof ApiError ? error.message : 'Failed to load data.'}
        </Text>
      </SafeAreaView>
    );
  }

  const revenue = data ?? {};

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headline}>Admin Dashboard</Text>

      <View style={styles.cardsRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {(revenue.total_consultations as number) ?? 0}
          </Text>
          <Text style={styles.summaryLabel}>Consultations</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            ₹{((revenue.total_billed_paise as number) ?? 0) / 100}
          </Text>
          <Text style={styles.summaryLabel}>Total Billed</Text>
        </View>
      </View>
      <View style={styles.cardsRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            ₹{((revenue.commission_paise as number) ?? 0) / 100}
          </Text>
          <Text style={styles.summaryLabel}>Commission</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {((revenue.active_astrologers as number) ?? 0)}
          </Text>
          <Text style={styles.summaryLabel}>Active Astrologers</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Revenue Summary</Text>
        <Text style={styles.infoText}>
          Data reflects all-time platform metrics. Check the Revenue tab for detailed analytics.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.midnight },
  loading: { flex: 1, backgroundColor: colors.midnight, justifyContent: 'center', alignItems: 'center' },
  headline: {
    ...type.display,
    color: colors.parchment,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  cardsRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.sm },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.midnightDeep,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.mistFaint,
    padding: spacing.md,
    alignItems: 'center',
  },
  summaryValue: { ...type.display, color: colors.brass, fontSize: 22, lineHeight: 28 },
  summaryLabel: { ...type.caption, color: colors.mist, marginTop: spacing.xs },
  infoCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.midnightDeep,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.mistFaint,
    padding: spacing.md,
  },
  infoTitle: { ...type.label, color: colors.brass, marginBottom: spacing.xs },
  infoText: { ...type.body, color: colors.mist },
  errorText: { ...type.body, color: colors.error, textAlign: 'center' },
});
