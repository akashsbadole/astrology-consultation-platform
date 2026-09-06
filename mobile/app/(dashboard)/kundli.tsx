import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, type KundliSummary } from '../../lib/api';
import { colors, radius, spacing, type } from '../../theme/tokens';

export default function KundliScreen() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [tzOffset, setTzOffset] = useState('5.5');

  const charts = useQuery({
    queryKey: ['kundlis'],
    queryFn: () => api.getMyKundlis(),
  });

  const generate = useMutation({
    mutationFn: () =>
      api.generateKundli({
        label: label || undefined,
        birth_date: birthDate,
        birth_time: birthTime,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        timezone_offset_hours: parseFloat(tzOffset),
      }),
    onSuccess: () => {
      setShowForm(false);
      charts.refetch();
    },
  });

  return (
    <LinearGradient colors={[colors.midnight, colors.midnightDeep]} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Text style={styles.title}>My Kundli Charts</Text>
        </View>

        {showForm ? (
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.formTitle}>Generate New Chart</Text>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Label (optional)</Text>
              <TextInput style={styles.input} placeholder="e.g. My Birth Chart" placeholderTextColor={colors.mistFaint} value={label} onChangeText={setLabel} />
            </View>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Birth Date (YYYY-MM-DD)</Text>
              <TextInput style={styles.input} placeholder="1990-05-15" placeholderTextColor={colors.mistFaint} value={birthDate} onChangeText={setBirthDate} />
            </View>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Birth Time (HH:MM)</Text>
              <TextInput style={styles.input} placeholder="14:30" placeholderTextColor={colors.mistFaint} value={birthTime} onChangeText={setBirthTime} />
            </View>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Latitude</Text>
              <TextInput style={styles.input} placeholder="28.6139" placeholderTextColor={colors.mistFaint} keyboardType="numeric" value={latitude} onChangeText={setLatitude} />
            </View>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Longitude</Text>
              <TextInput style={styles.input} placeholder="77.2090" placeholderTextColor={colors.mistFaint} keyboardType="numeric" value={longitude} onChangeText={setLongitude} />
            </View>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Timezone Offset (hours)</Text>
              <TextInput style={styles.input} placeholder="5.5" placeholderTextColor={colors.mistFaint} keyboardType="numeric" value={tzOffset} onChangeText={setTzOffset} />
            </View>

            {generate.isError && <Text style={styles.errorText}>{generate.error.message}</Text>}

            <View style={styles.formActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.submitBtn, generate.isPending && styles.submitBtnDisabled]}
                onPress={() => generate.mutate()}
                disabled={generate.isPending}
              >
                {generate.isPending ? (
                  <ActivityIndicator color={colors.midnight} />
                ) : (
                  <Text style={styles.submitBtnText}>Generate</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        ) : (
          <>
            {charts.isLoading ? (
              <ActivityIndicator color={colors.brass} style={styles.loadingPad} />
            ) : (
              <FlatList
                data={charts.data ?? []}
                keyExtractor={(c) => c.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.chartCard}
                    onPress={() => router.push({ pathname: '/(dashboard)/kundli-detail', params: { id: item.id } })}
                  >
                    <Text style={styles.chartLabel}>{item.label ?? 'Unnamed Chart'}</Text>
                    <Text style={styles.chartDate}>{item.birth_date}</Text>
                  </Pressable>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No charts yet. Generate one!</Text>}
              />
            )}
          </>
        )}

        {!showForm && (
          <Pressable style={styles.fab} onPress={() => setShowForm(true)}>
            <Text style={styles.fabText}>+</Text>
          </Pressable>
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
  chartCard: {
    backgroundColor: 'rgba(246,241,231,0.06)',
    borderColor: colors.brassDim,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  chartLabel: {
    ...type.label,
    color: colors.parchment,
  },
  chartDate: {
    ...type.caption,
    color: colors.mist,
    marginTop: spacing.xs,
  },
  emptyText: {
    ...type.body,
    color: colors.mist,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brass,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: {
    ...type.display,
    color: colors.midnight,
    fontSize: 28,
    lineHeight: 32,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  formTitle: {
    ...type.subhead,
    color: colors.brass,
    marginBottom: spacing.md,
  },
  formField: {
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    ...type.caption,
    color: colors.mist,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: 'rgba(246,241,231,0.08)',
    borderColor: colors.mistFaint,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...type.body,
    color: colors.parchment,
  },
  errorText: {
    ...type.caption,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.mistFaint,
  },
  cancelBtnText: {
    ...type.button,
    color: colors.mist,
  },
  submitBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.brass,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    ...type.button,
    color: colors.midnight,
  },
});
