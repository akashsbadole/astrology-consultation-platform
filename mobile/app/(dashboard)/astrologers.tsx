import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api, type AstrologerPublic } from '../../lib/api';
import { colors, radius, spacing, type } from '../../theme/tokens';

export default function AstrologersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['astrologers', page],
    queryFn: () => api.listAstrologers({ page }),
  });

  const astrologers = data?.items ?? [];

  function renderCard({ item }: { item: AstrologerPublic }) {
    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push({ pathname: '/(dashboard)/astrologer-detail', params: { id: item.id } })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(item.full_name ?? 'A')[0]}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.name}>{item.full_name ?? 'Astrologer'}</Text>
            <Text style={styles.rating}>★ {item.avg_rating.toFixed(1)} ({item.rating_count})</Text>
          </View>
          {item.is_online && <View style={styles.onlineDot} />}
        </View>
        <Text style={styles.specializations} numberOfLines={1}>
          {item.specializations.join(' · ')}
        </Text>
        <Text style={styles.rate}>₹{(item.rate_per_minute_paise / 100).toFixed(0)}/min</Text>
      </Pressable>
    );
  }

  return (
    <LinearGradient colors={[colors.midnight, colors.midnightDeep]} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Text style={styles.title}>Astrologers</Text>
          <TextInput
            style={styles.searchBar}
            placeholder="Search by name or specialization..."
            placeholderTextColor={colors.mistFaint}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.brass} style={styles.loadingPad} />
        ) : (
          <FlatList
            data={astrologers}
            keyExtractor={(a) => a.id}
            renderItem={renderCard}
            contentContainerStyle={styles.list}
            onEndReached={() => {
              if (data && page < data.pages) setPage((p) => p + 1);
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={isFetching ? <ActivityIndicator color={colors.brass} style={styles.loadingPad} /> : null}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No astrologers found.</Text>
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
    marginBottom: spacing.sm,
  },
  searchBar: {
    backgroundColor: 'rgba(246,241,231,0.08)',
    borderColor: colors.mistFaint,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...type.body,
    color: colors.parchment,
  },
  list: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  card: {
    backgroundColor: 'rgba(246,241,231,0.06)',
    borderColor: colors.brassDim,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brassDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...type.label,
    color: colors.parchment,
  },
  cardInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  name: {
    ...type.label,
    color: colors.parchment,
  },
  rating: {
    ...type.caption,
    color: colors.brass,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
  specializations: {
    ...type.caption,
    color: colors.mist,
    marginTop: spacing.xs,
  },
  rate: {
    ...type.body,
    color: colors.brass,
    marginTop: spacing.xs,
  },
  loadingPad: {
    paddingVertical: spacing.lg,
  },
  emptyText: {
    ...type.body,
    color: colors.mist,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
