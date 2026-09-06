import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api, TransactionOut, ApiError } from '../../lib/api';
import { colors, radius, spacing, type } from '../../theme/tokens';

function formatPaise(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

export default function EarningsScreen() {
  const { data: balance, isLoading: balLoading } = useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: () => api.getWalletBalance(),
  });

  const { data: txns, isLoading: txnLoading, error: txnError } = useQuery({
    queryKey: ['wallet', 'transactions'],
    queryFn: () => api.getWalletTransactions(),
  });

  const isLoading = balLoading || txnLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={colors.brass} />
      </SafeAreaView>
    );
  }

  if (txnError) {
    return (
      <SafeAreaView style={styles.loading}>
        <Text style={styles.errorText}>
          {txnError instanceof ApiError ? txnError.message : 'Failed to load earnings.'}
        </Text>
      </SafeAreaView>
    );
  }

  const transactions: TransactionOut[] = txns?.items ?? [];
  const payouts = transactions.filter((t) => t.type === 'astrologer_payout');
  const totalEarned = payouts.reduce((sum, t) => sum + t.amount_paise, 0);
  const commission = transactions
    .filter((t) => t.type === 'consultation_debit')
    .reduce((sum, t) => sum + Math.abs(t.amount_paise), 0);
  const paidOut = totalEarned;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headline}>Earnings</Text>

      <View style={styles.cardsRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatPaise(totalEarned)}</Text>
          <Text style={styles.summaryLabel}>Total Earned</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatPaise(commission)}</Text>
          <Text style={styles.summaryLabel}>Commission</Text>
        </View>
      </View>
      <View style={styles.cardsRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatPaise(paidOut)}</Text>
          <Text style={styles.summaryLabel}>Paid Out</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatPaise(balance?.balance_paise ?? 0)}</Text>
          <Text style={styles.summaryLabel}>Wallet</Text>
        </View>
      </View>

      <FlatList
        data={payouts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>Payout History</Text>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No payouts yet.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.txnRow}>
            <View>
              <Text style={styles.txnType}>Payout</Text>
              <Text style={styles.txnDate}>
                {new Date(item.created_at).toLocaleDateString('en-IN')}
              </Text>
            </View>
            <Text style={styles.txnAmount}>{formatPaise(item.amount_paise)}</Text>
          </View>
        )}
      />
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
    marginBottom: spacing.md,
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
  summaryValue: { ...type.display, color: colors.brass, fontSize: 20, lineHeight: 26 },
  summaryLabel: { ...type.caption, color: colors.mist, marginTop: spacing.xs },
  sectionTitle: {
    ...type.label,
    color: colors.brass,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  list: { paddingBottom: spacing.xl },
  txnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.midnightDeep,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.mistFaint,
    padding: spacing.md,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  txnType: { ...type.label, color: colors.parchment },
  txnDate: { ...type.caption, color: colors.mist, marginTop: 2 },
  txnAmount: { ...type.body, color: colors.brass },
  empty: { ...type.body, color: colors.mist, textAlign: 'center', paddingVertical: spacing.xl },
  errorText: { ...type.body, color: colors.error, textAlign: 'center' },
});
