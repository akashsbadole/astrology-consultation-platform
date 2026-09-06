import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { colors, radius, spacing, type } from '../../theme/tokens';

export default function KundliDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const kundli = useQuery({
    queryKey: ['kundli', id],
    queryFn: () => api.getKundli(id!),
    enabled: !!id,
  });

  const dosha = useQuery({
    queryKey: ['kundli-dosha', id],
    queryFn: () => api.getKundliDosha(id!),
    enabled: !!id,
  });

  const data = kundli.data;

  return (
    <LinearGradient colors={[colors.midnight, colors.midnightDeep]} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        {kundli.isLoading ? (
          <ActivityIndicator color={colors.brass} style={styles.loadingPad} />
        ) : !data ? (
          <Text style={styles.errorText}>Chart not found.</Text>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.title}>{data.label ?? 'Kundli Chart'}</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Birth Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{data.birth_date}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{data.birth_time}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{data.latitude}, {data.longitude}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Planetary Positions</Text>
              {data.chart.planets && Array.isArray(data.chart.planets)
                ? (data.chart.planets as { planet: string; sign: string; degree: number }[]).map((p, i) => (
                    <View key={i} style={styles.planetRow}>
                      <Text style={styles.planetName}>{p.planet}</Text>
                      <Text style={styles.planetPos}>{p.sign} {p.degree?.toFixed(2)}°</Text>
                    </View>
                  ))
                : Object.entries(data.chart)
                    .filter(([k]) => k !== 'houses' && k !== 'dasha')
                    .map(([key, val]) => (
                      <View key={key} style={styles.planetRow}>
                        <Text style={styles.planetName}>{key}</Text>
                        <Text style={styles.planetPos}>{typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}</Text>
                      </View>
                    ))
              }
            </View>

            {'dasha' in data.chart && data.chart.dasha != null && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Current Dasha</Text>
                <View style={styles.dashaCard}>
                  <Text style={styles.dashaText}>{String(data.chart.dasha)}</Text>
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dosha Analysis</Text>
              {dosha.isLoading && <ActivityIndicator color={colors.brass} />}
              {dosha.data && Object.entries(dosha.data).map(([key, val]) => (
                <View key={key} style={styles.doshaRow}>
                  <Text style={styles.doshaKey}>{key.replace(/_/g, ' ')}</Text>
                  <Text style={styles.doshaValue}>{String(val)}</Text>
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
  title: {
    ...type.display,
    color: colors.parchment,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...type.label,
    color: colors.brass,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.mistFaint,
  },
  detailLabel: {
    ...type.body,
    color: colors.mist,
  },
  detailValue: {
    ...type.body,
    color: colors.parchment,
  },
  planetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.mistFaint,
  },
  planetName: {
    ...type.body,
    color: colors.mist,
    textTransform: 'capitalize',
  },
  planetPos: {
    ...type.body,
    color: colors.parchment,
  },
  dashaCard: {
    backgroundColor: 'rgba(198,161,91,0.12)',
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  dashaText: {
    ...type.body,
    color: colors.parchment,
  },
  doshaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.mistFaint,
  },
  doshaKey: {
    ...type.body,
    color: colors.mist,
    textTransform: 'capitalize',
    flex: 1,
  },
  doshaValue: {
    ...type.body,
    color: colors.parchment,
    flex: 1,
    textAlign: 'right',
  },
  errorText: {
    ...type.body,
    color: colors.error,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
