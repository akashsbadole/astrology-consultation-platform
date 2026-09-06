import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, AstrologerPublic, ApiError } from '../../lib/api';
import { colors, radius, spacing, type } from '../../theme/tokens';

export default function AstrologerApprovalScreen() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<AstrologerPublic[]>({
    queryKey: ['admin', 'pending-astrologers'],
    queryFn: () => api.adminListPendingAstrologers(),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.adminApproveAstrologer(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'pending-astrologers'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.adminRejectAstrologer(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'pending-astrologers'] }),
  });

  function handleApprove(astro: AstrologerPublic) {
    Alert.alert(
      'Approve Astrologer',
      `Approve ${astro.full_name ?? 'this astrologer'}? They will become searchable and bookable.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => approveMutation.mutate(astro.id) },
      ],
    );
  }

  function handleReject(astro: AstrologerPublic) {
    Alert.alert(
      'Reject Astrologer',
      `Reject ${astro.full_name ?? 'this astrologer'}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => rejectMutation.mutate(astro.id) },
      ],
    );
  }

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
          {error instanceof ApiError ? error.message : 'Failed to load astrologers.'}
        </Text>
      </SafeAreaView>
    );
  }

  const pending = data ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headline}>Approval Queue</Text>

      <FlatList
        data={pending}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No pending astrologers.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.full_name ?? 'Unnamed'}</Text>
            <Text style={styles.bio} numberOfLines={2}>
              {item.bio ?? 'No bio provided.'}
            </Text>
            <Text style={styles.meta}>
              {item.experience_years} yrs experience
            </Text>
            {item.specializations.length > 0 && (
              <Text style={styles.meta}>
                {item.specializations.join(', ')}
              </Text>
            )}
            <View style={styles.actions}>
              <Pressable
                style={styles.approveBtn}
                onPress={() => handleApprove(item)}
              >
                <Text style={styles.approveBtnText}>Advance</Text>
              </Pressable>
              <Pressable
                style={styles.rejectBtn}
                onPress={() => handleReject(item)}
              >
                <Text style={styles.rejectBtnText}>Reject</Text>
              </Pressable>
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
  list: { paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.midnightDeep,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.mistFaint,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  name: { ...type.label, color: colors.parchment, marginBottom: spacing.xs },
  bio: { ...type.body, color: colors.mist, marginBottom: spacing.xs },
  meta: { ...type.caption, color: colors.brassDim },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  approveBtn: {
    flex: 1,
    backgroundColor: colors.brass,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  approveBtnText: { ...type.button, color: colors.midnightDeep },
  rejectBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.error,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  rejectBtnText: { ...type.button, color: colors.error },
  empty: { ...type.body, color: colors.mist, textAlign: 'center', paddingVertical: spacing.xl },
  errorText: { ...type.body, color: colors.error, textAlign: 'center' },
});
