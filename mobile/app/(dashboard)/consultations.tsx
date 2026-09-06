import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api, type ConsultationOut } from '../../lib/api';
import { colors, radius, spacing, type } from '../../theme/tokens';

const MODE_ICONS: Record<string, string> = {
  chat: '💬',
  audio: '📞',
  video: '🎥',
};

const STATUS_COLORS: Record<string, string> = {
  matching: colors.brass,
  active: '#4CAF50',
  ended: colors.mist,
  expired: colors.error,
};

export default function ConsultationsScreen() {
  const router = useRouter();

  const consultations = useQuery({
    queryKey: ['consultations'],
    queryFn: () => api.listAstrologers({ page: 1 }).then(() => []),
  });

  return (
    <LinearGradient colors={[colors.midnight, colors.midnightDeep]} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Text style={styles.title}>Consultations</Text>
        </View>

        {consultations.isLoading ? (
          <ActivityIndicator color={colors.brass} style={styles.loadingPad} />
        ) : (
          <FlatList
            data={[]}
            keyExtractor={(c: ConsultationOut) => c.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }: { item: ConsultationOut }) => (
              <Pressable
                style={styles.card}
                onPress={() => {
                  if (item.status === 'active') {
                    router.push({ pathname: '/(dashboard)/consultation-chat', params: { id: item.id } });
                  }
                }}
              >
                <View style={styles.cardLeft}>
                  <Text style={styles.modeIcon}>{MODE_ICONS[item.mode] ?? '📋'}</Text>
                  <View>
                    <Text style={styles.cardTitle}>{item.mode.charAt(0).toUpperCase() + item.mode.slice(1)} Session</Text>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] ?? colors.mist }]} />
                      <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.billedAmount}>₹{(item.total_billed_paise / 100).toFixed(2)}</Text>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No consultations yet.</Text>
            }
          />
        )}
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
  loadingPad: {
    paddingVertical: spacing.xl,
  },
  list: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(246,241,231,0.06)',
    borderColor: colors.mistFaint,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  modeIcon: {
    fontSize: 24,
  },
  cardTitle: {
    ...type.label,
    color: colors.parchment,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...type.caption,
    color: colors.mist,
    textTransform: 'capitalize',
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  billedAmount: {
    ...type.label,
    color: colors.brass,
  },
  emptyText: {
    ...type.body,
    color: colors.mist,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
