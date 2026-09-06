import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, type ConsultationMode, type ReviewOut } from '../../lib/api';
import { colors, radius, spacing, type } from '../../theme/tokens';

const MODES: ConsultationMode[] = ['chat', 'audio', 'video'];

export default function AstrologerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedMode, setSelectedMode] = useState<ConsultationMode>('chat');

  const astrologer = useQuery({
    queryKey: ['astrologer', id],
    queryFn: () => api.getAstrologer(id!),
    enabled: !!id,
  });

  const reviews = useQuery({
    queryKey: ['astrologer-reviews', id],
    queryFn: () => api.getAstrologerReviews(id!),
    enabled: !!id,
  });

  const startConsultation = useMutation({
    mutationFn: () => api.requestConsultation(id!, selectedMode),
    onSuccess: (consultation) => {
      router.push({ pathname: '/(dashboard)/consultation-chat', params: { id: consultation.id } });
    },
  });

  const data = astrologer.data;

  return (
    <LinearGradient colors={[colors.midnight, colors.midnightDeep]} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        {astrologer.isLoading ? (
          <ActivityIndicator color={colors.brass} style={styles.loadingPad} />
        ) : !data ? (
          <Text style={styles.errorText}>Astrologer not found.</Text>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarText}>{(data.full_name ?? 'A')[0]}</Text>
              </View>
              <Text style={styles.name}>{data.full_name ?? 'Astrologer'}</Text>
              <Text style={styles.rating}>★ {data.avg_rating.toFixed(1)} ({data.rating_count} reviews)</Text>
              {data.is_online && (
                <View style={styles.onlineRow}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineText}>Online</Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bio}>{data.bio ?? 'No bio provided.'}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Experience</Text>
                <Text style={styles.detailValue}>{data.experience_years} years</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Rate</Text>
                <Text style={styles.detailValue}>₹{(data.rate_per_minute_paise / 100).toFixed(0)}/min</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Languages</Text>
                <Text style={styles.detailValue}>{data.languages.join(', ')}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Specializations</Text>
              <View style={styles.chipRow}>
                {data.specializations.map((s) => (
                  <View key={s} style={styles.chip}>
                    <Text style={styles.chipText}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Consultation Mode</Text>
              <View style={styles.modeRow}>
                {MODES.map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.modeChip, selectedMode === m && styles.modeChipActive]}
                    onPress={() => setSelectedMode(m)}
                  >
                    <Text style={[styles.modeChipText, selectedMode === m && styles.modeChipTextActive]}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              style={[styles.startButton, startConsultation.isPending && styles.startButtonDisabled]}
              onPress={() => startConsultation.mutate()}
              disabled={startConsultation.isPending}
            >
              {startConsultation.isPending ? (
                <ActivityIndicator color={colors.midnight} />
              ) : (
                <Text style={styles.startButtonText}>Start Consultation</Text>
              )}
            </Pressable>

            {startConsultation.isError && (
              <Text style={styles.errorText}>{startConsultation.error.message}</Text>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              {reviews.isLoading && <ActivityIndicator color={colors.brass} style={styles.loadingPad} />}
              {reviews.data?.items.map((r) => (
                <View key={r.id} style={styles.reviewCard}>
                  <Text style={styles.reviewRating}>★ {r.rating}</Text>
                  <Text style={styles.reviewComment}>{r.comment ?? 'No comment'}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
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
  loadingPad: {
    paddingVertical: spacing.xl,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brassDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...type.display,
    color: colors.parchment,
  },
  name: {
    ...type.display,
    color: colors.parchment,
    marginTop: spacing.sm,
  },
  rating: {
    ...type.body,
    color: colors.brass,
    marginTop: spacing.xs,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  onlineText: {
    ...type.caption,
    color: '#4CAF50',
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...type.label,
    color: colors.brass,
    marginBottom: spacing.sm,
  },
  bio: {
    ...type.body,
    color: colors.mist,
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    ...type.body,
    color: colors.mist,
  },
  detailValue: {
    ...type.body,
    color: colors.parchment,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: 'rgba(198,161,91,0.12)',
    borderColor: colors.brassDim,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chipText: {
    ...type.caption,
    color: colors.brass,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(246,241,231,0.06)',
    borderWidth: 1,
    borderColor: colors.mistFaint,
  },
  modeChipActive: {
    backgroundColor: colors.brass,
    borderColor: colors.brass,
  },
  modeChipText: {
    ...type.label,
    color: colors.mist,
  },
  modeChipTextActive: {
    color: colors.midnight,
  },
  startButton: {
    backgroundColor: colors.brass,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  startButtonDisabled: {
    opacity: 0.6,
  },
  startButtonText: {
    ...type.button,
    color: colors.midnight,
  },
  errorText: {
    ...type.body,
    color: colors.error,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  reviewCard: {
    backgroundColor: 'rgba(246,241,231,0.06)',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  reviewRating: {
    ...type.label,
    color: colors.brass,
  },
  reviewComment: {
    ...type.body,
    color: colors.mist,
    marginTop: spacing.xs,
  },
});
