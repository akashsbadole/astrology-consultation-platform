import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, type TransactionOut } from '../../lib/api';
import { colors, radius, spacing, type } from '../../theme/tokens';

const PRESETS = [100, 200, 500, 1000];

const TXN_BADGES: Record<string, { label: string; color: string }> = {
  recharge: { label: 'Credit', color: '#4CAF50' },
  consultation_debit: { label: 'Consultation', color: colors.error },
  store_purchase: { label: 'Purchase', color: colors.error },
  astrologer_payout: { label: 'Payout', color: colors.error },
  referral_bonus: { label: 'Referral', color: '#4CAF50' },
  refund: { label: 'Refund', color: '#4CAF50' },
};

export default function WalletScreen() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const balance = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: () => api.getWalletBalance(),
  });

  const transactions = useQuery({
    queryKey: ['wallet-transactions'],
    queryFn: () => api.getWalletTransactions(),
  });

  const rechargeOrder = useMutation({
    mutationFn: (amount: number) => api.createRechargeOrder(amount * 100),
    onSuccess: () => {
      balance.refetch();
      transactions.refetch();
    },
  });

  const balancePaise = balance.data?.balance_paise ?? 0;

  return (
    <LinearGradient colors={[colors.midnight, colors.midnightDeep]} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Text style={styles.title}>Wallet</Text>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          {balance.isLoading ? (
            <ActivityIndicator color={colors.brass} />
          ) : (
            <Text style={styles.balanceAmount}>₹{(balancePaise / 100).toFixed(2)}</Text>
          )}
        </View>

        <View style={styles.presetSection}>
          <Text style={styles.sectionLabel}>Quick Recharge</Text>
          <View style={styles.presetRow}>
            {PRESETS.map((amt) => (
              <Pressable
                key={amt}
                style={[styles.presetChip, selectedAmount === amt && styles.presetChipActive]}
                onPress={() => setSelectedAmount(amt)}
              >
                <Text style={[styles.presetText, selectedAmount === amt && styles.presetTextActive]}>
                  ₹{amt}
                </Text>
              </Pressable>
            ))}
          </View>
          {selectedAmount && (
            <Pressable
              style={[styles.rechargeBtn, rechargeOrder.isPending && styles.rechargeBtnDisabled]}
              onPress={() => rechargeOrder.mutate(selectedAmount)}
              disabled={rechargeOrder.isPending}
            >
              {rechargeOrder.isPending ? (
                <ActivityIndicator color={colors.midnight} />
              ) : (
                <Text style={styles.rechargeBtnText}>Recharge ₹{selectedAmount}</Text>
              )}
            </Pressable>
          )}
          {rechargeOrder.isError && (
            <Text style={styles.errorText}>{rechargeOrder.error.message}</Text>
          )}
        </View>

        <Text style={[styles.sectionLabel, styles.txnHeader]}>Transaction History</Text>
        <FlatList
          data={transactions.data?.items ?? []}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.txnList}
          renderItem={({ item }: { item: TransactionOut }) => {
            const badge = TXN_BADGES[item.type] ?? { label: item.type, color: colors.mist };
            const isCredit = item.amount_paise > 0;
            return (
              <View style={styles.txnCard}>
                <View style={styles.txnLeft}>
                  <View style={[styles.badge, { borderColor: badge.color }]}>
                    <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                  <Text style={styles.txnDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
                <Text style={[styles.txnAmount, { color: isCredit ? '#4CAF50' : colors.error }]}>
                  {isCredit ? '+' : ''}₹{(item.amount_paise / 100).toFixed(2)}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No transactions yet.</Text>
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    ...type.display,
    color: colors.parchment,
  },
  balanceCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: 'rgba(198,161,91,0.12)',
    borderColor: colors.brass,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  balanceLabel: {
    ...type.caption,
    color: colors.mist,
  },
  balanceAmount: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 36,
    color: colors.parchment,
    marginTop: spacing.xs,
  },
  presetSection: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionLabel: {
    ...type.label,
    color: colors.brass,
    marginBottom: spacing.sm,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  presetChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(246,241,231,0.06)',
    borderWidth: 1,
    borderColor: colors.mistFaint,
  },
  presetChipActive: {
    backgroundColor: colors.brass,
    borderColor: colors.brass,
  },
  presetText: {
    ...type.label,
    color: colors.mist,
  },
  presetTextActive: {
    color: colors.midnight,
  },
  rechargeBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.brass,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  rechargeBtnDisabled: {
    opacity: 0.6,
  },
  rechargeBtnText: {
    ...type.button,
    color: colors.midnight,
  },
  errorText: {
    ...type.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  txnHeader: {
    paddingHorizontal: spacing.lg,
  },
  txnList: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  txnCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(246,241,231,0.06)',
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  txnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  badge: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  badgeText: {
    ...type.caption,
    fontSize: 11,
  },
  txnDate: {
    ...type.caption,
    color: colors.mist,
  },
  txnAmount: {
    ...type.label,
  },
  emptyText: {
    ...type.body,
    color: colors.mist,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
