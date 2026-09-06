import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, AstrologerPublic, ApiError } from '../../lib/api';
import { colors, radius, spacing, type } from '../../theme/tokens';

export default function AstrologerDashboard() {
  const queryClient = useQueryClient();
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState('');

  const { data: astrologer, isLoading: astroLoading, error: astroError } =
    useQuery<AstrologerPublic>({
      queryKey: ['astrologer', 'me'],
      queryFn: () => api.getAstrologer('me'),
    });

  const { data: consultations, isLoading: consultLoading } = useQuery({
    queryKey: ['consultations', 'active'],
    queryFn: () => api.getConsultation('active'),
  });

  const toggleMutation = useMutation({
    mutationFn: (is_online: boolean) => api.updateAvailability(is_online),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['astrologer', 'me'] }),
  });

  const rateMutation = useMutation({
    mutationFn: (rate: number) => api.updateRate(rate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['astrologer', 'me'] });
      setEditingRate(false);
    },
  });

  function handleRateSave() {
    const num = parseInt(rateInput, 10);
    if (!isNaN(num) && num > 0) {
      rateMutation.mutate(num);
    }
  }

  function startEditRate() {
    setRateInput(String(astrologer?.rate_per_minute_paise ?? 0));
    setEditingRate(true);
  }

  if (astroLoading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={colors.brass} />
      </SafeAreaView>
    );
  }

  if (astroError) {
    return (
      <SafeAreaView style={styles.loading}>
        <Text style={styles.errorText}>
          {astroError instanceof ApiError ? astroError.message : 'Failed to load profile.'}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.headline}>Dashboard</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Availability</Text>
            <Switch
              value={astrologer?.is_online ?? false}
              onValueChange={(v) => toggleMutation.mutate(v)}
              trackColor={{ false: colors.mistFaint, true: colors.brassDim }}
              thumbColor={astrologer?.is_online ? colors.brass : colors.mist}
            />
          </View>
          <Text style={styles.statusText}>
            {astrologer?.is_online ? 'Online' : 'Offline'}
          </Text>
        </View>

        <Pressable style={styles.card} onPress={startEditRate}>
          <Text style={styles.label}>Rate per minute</Text>
          {editingRate ? (
            <View style={styles.rateRow}>
              <TextInput
                style={styles.rateInput}
                keyboardType="numeric"
                value={rateInput}
                onChangeText={setRateInput}
                autoFocus
              />
              <Pressable style={styles.rateBtn} onPress={handleRateSave}>
                <Text style={styles.rateBtnText}>
                  {rateMutation.isPending ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>
              <Pressable onPress={() => setEditingRate(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.rateValue}>
              ₹{(astrologer?.rate_per_minute_paise ?? 0) / 100}/min
            </Text>
          )}
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stats</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{astrologer?.rating_count ?? 0}</Text>
            <Text style={styles.statLabel}>Consultations</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{astrologer?.avg_rating?.toFixed(1) ?? '—'}</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
        </View>
      </View>

      {consultations && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Consultation</Text>
          <View style={styles.activeCard}>
            <Text style={styles.activeText}>
              {consultations.mode} consultation in progress
            </Text>
            <Text style={styles.activeSub}>
              Billed: ₹{consultations.total_billed_paise / 100}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.midnight },
  loading: { flex: 1, backgroundColor: colors.midnight, justifyContent: 'center', alignItems: 'center' },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  headline: {
    ...type.display,
    color: colors.parchment,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...type.label,
    color: colors.brass,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: colors.midnightDeep,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.mistFaint,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { ...type.label, color: colors.parchment },
  statusText: { ...type.caption, color: colors.mist, marginTop: spacing.xs },
  rateValue: { ...type.subhead, color: colors.parchment, marginTop: spacing.xs },
  rateRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs, gap: spacing.xs },
  rateInput: {
    flex: 1,
    backgroundColor: colors.mistFaint,
    borderRadius: radius.sm,
    padding: spacing.xs,
    color: colors.parchment,
    ...type.body,
  },
  rateBtn: {
    backgroundColor: colors.brass,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rateBtnText: { ...type.button, color: colors.midnightDeep },
  cancelText: { ...type.caption, color: colors.mist },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: colors.midnightDeep,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.mistFaint,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: { ...type.display, color: colors.brass, fontSize: 24, lineHeight: 30 },
  statLabel: { ...type.caption, color: colors.mist, marginTop: spacing.xs },
  activeCard: {
    backgroundColor: 'rgba(198, 161, 91, 0.12)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brass,
    padding: spacing.md,
  },
  activeText: { ...type.body, color: colors.parchment },
  activeSub: { ...type.caption, color: colors.mist, marginTop: spacing.xs },
  errorText: { ...type.body, color: colors.error, textAlign: 'center' },
});
