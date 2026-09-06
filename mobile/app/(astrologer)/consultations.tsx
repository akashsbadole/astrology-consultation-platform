import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ConsultationOut, ApiError } from '../../lib/api';
import { colors, radius, spacing, type } from '../../theme/tokens';

function formatAmount(paise: number) {
  return `₹${(paise / 100).toFixed(0)}`;
}

function modeLabel(mode: string) {
  if (mode === 'chat') return 'Chat';
  if (mode === 'audio') return 'Audio';
  return 'Video';
}

export default function ConsultationsScreen() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['consultations', 'astrologer'],
    queryFn: () => api.getConsultation('list'),
  });

  const joinMutation = useMutation({
    mutationFn: (id: string) => api.acceptConsultation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['consultations', 'astrologer'] }),
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
          {error instanceof ApiError ? error.message : 'Failed to load consultations.'}
        </Text>
      </SafeAreaView>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const consultations: ConsultationOut[] = Array.isArray(data) ? data : (data as any)?.items ?? [];
  const active = consultations.filter((c) => c.status === 'active');
  const past = consultations.filter((c) => c.status === 'ended' || c.status === 'expired');

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headline}>Consultations</Text>

      {active.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active</Text>
          {active.map((c) => (
            <View key={c.id} style={styles.activeCard}>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>{modeLabel(c.mode)}</Text>
                <Text style={styles.cardAmount}>{formatAmount(c.total_billed_paise)}</Text>
              </View>
              <Pressable
                style={styles.joinBtn}
                onPress={() => joinMutation.mutate(c.id)}
              >
                <Text style={styles.joinBtnText}>
                  {joinMutation.isPending ? 'Joining...' : 'Join'}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <FlatList
        data={past}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          past.length > 0 ? (
            <Text style={styles.sectionTitle}>Past</Text>
          ) : null
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No consultations yet.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.pastCard}>
            <View style={styles.cardRow}>
              <View>
                <Text style={styles.cardLabel}>{modeLabel(item.mode)}</Text>
                <Text style={styles.cardSub}>Client consultation</Text>
              </View>
              <Text style={styles.cardAmount}>{formatAmount(item.total_billed_paise)}</Text>
            </View>
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
    marginBottom: spacing.sm,
  },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionTitle: {
    ...type.label,
    color: colors.brass,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  activeCard: {
    backgroundColor: 'rgba(198, 161, 91, 0.12)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brass,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pastCard: {
    backgroundColor: colors.midnightDeep,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.mistFaint,
    padding: spacing.md,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: { ...type.label, color: colors.parchment },
  cardSub: { ...type.caption, color: colors.mist, marginTop: 2 },
  cardAmount: { ...type.body, color: colors.brass },
  joinBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.brass,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  joinBtnText: { ...type.button, color: colors.midnightDeep },
  list: { paddingBottom: spacing.xl },
  empty: { ...type.body, color: colors.mist, textAlign: 'center', paddingVertical: spacing.xl },
  errorText: { ...type.body, color: colors.error, textAlign: 'center' },
});
