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

export default function RevenueScreen() {
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
          {error instanceof ApiError ? error.message : 'Failed to load revenue data.'}
        </Text>
      </SafeAreaView>
    );
  }

  const revenue = data ?? {};
  const totalBilled = ((revenue.total_billed_paise as number) ?? 0) / 100;
  const commission = ((revenue.commission_paise as number) ?? 0) / 100;
  const totalConsultations = (revenue.total_consultations as number) ?? 0;
  const activeAstrologers = (revenue.active_astrologers as number) ?? 0;

  const maxVal = Math.max(totalBilled, commission, 1);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headline}>Revenue Analytics</Text>

      <View style={styles.cardsRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{totalConsultations}</Text>
          <Text style={styles.summaryLabel}>Consultations</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{activeAstrologers}</Text>
          <Text style={styles.summaryLabel}>Active Astrologers</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue Breakdown</Text>
        <View style={styles.barContainer}>
          <View style={styles.barRow}>
            <Text style={styles.barLabel}>Total Billed</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.min((totalBilled / maxVal) * 100, 100)}%`,
                    backgroundColor: colors.brass,
                  },
                ]}
              />
            </View>
            <Text style={styles.barValue}>₹{totalBilled.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.barRow}>
            <Text style={styles.barLabel}>Commission</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.min((commission / maxVal) * 100, 100)}%`,
                    backgroundColor: colors.brassDim,
                  },
                ]}
              />
            </View>
            <Text style={styles.barValue}>₹{commission.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.barRow}>
            <Text style={styles.barLabel}>Payouts</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.min(((totalBilled - commission) / maxVal) * 100, 100)}%`,
                    backgroundColor: 'rgba(246, 241, 231, 0.28)',
                  },
                ]}
              />
            </View>
            <Text style={styles.barValue}>
              ₹{(totalBilled - commission).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
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
  cardsRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.lg },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.midnightDeep,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.mistFaint,
    padding: spacing.md,
    alignItems: 'center',
  },
  summaryValue: { ...type.display, color: colors.brass, fontSize: 24, lineHeight: 30 },
  summaryLabel: { ...type.caption, color: colors.mist, marginTop: spacing.xs },
  section: { paddingHorizontal: spacing.lg },
  sectionTitle: {
    ...type.label,
    color: colors.brass,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  barContainer: { gap: spacing.md },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { ...type.caption, color: colors.mist, width: 90 },
  barTrack: {
    flex: 1,
    height: 20,
    backgroundColor: colors.mistFaint,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: radius.sm },
  barValue: { ...type.label, color: colors.parchment, minWidth: 70, textAlign: 'right' },
  errorText: { ...type.body, color: colors.error, textAlign: 'center' },
});
