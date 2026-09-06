import { LinearGradient } from 'expo-linear-gradient';
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
import { useQuery } from '@tanstack/react-query';
import { api, type ProductOut } from '../../lib/api';
import { colors, radius, spacing, type } from '../../theme/tokens';

const CATEGORIES = ['All', 'Gemstone', 'Rudraksha', 'Yantra', 'Puja'] as const;
const CATEGORY_MAP: Record<string, string | undefined> = {
  All: undefined,
  Gemstone: 'gemstone',
  Rudraksha: 'rudraksha',
  Yantra: 'yantra',
  Puja: 'puja_service',
};

export default function StoreScreen() {
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const products = useQuery({
    queryKey: ['products', activeCategory],
    queryFn: () => api.listProducts(CATEGORY_MAP[activeCategory]),
  });

  return (
    <LinearGradient colors={[colors.midnight, colors.midnightDeep]} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Text style={styles.title}>Store</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.filterPill, activeCategory === cat && styles.filterPillActive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.filterPillText, activeCategory === cat && styles.filterPillTextActive]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {products.isLoading ? (
          <ActivityIndicator color={colors.brass} style={styles.loadingPad} />
        ) : (
          <FlatList
            data={products.data ?? []}
            keyExtractor={(p) => p.id}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.list}
            renderItem={({ item }: { item: ProductOut }) => (
              <View style={styles.productCard}>
                <View style={styles.productImage}>
                  <Text style={styles.productEmoji}>
                    {item.category === 'gemstone' ? '💎' : item.category === 'rudraksha' ? '🔮' : item.category === 'yantra' ? '✦' : '🕉️'}
                  </Text>
                </View>
                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.productPrice}>₹{(item.price_paise / 100).toFixed(0)}</Text>
                <Text style={[styles.productStock, item.stock_quantity === 0 && styles.outOfStock]}>
                  {item.stock_quantity === 0 ? 'Out of stock' : `${item.stock_quantity} in stock`}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No products found.</Text>
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
  filterRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(246,241,231,0.06)',
    borderWidth: 1,
    borderColor: colors.mistFaint,
  },
  filterPillActive: {
    backgroundColor: colors.brass,
    borderColor: colors.brass,
  },
  filterPillText: {
    ...type.label,
    color: colors.mist,
  },
  filterPillTextActive: {
    color: colors.midnight,
  },
  loadingPad: {
    paddingVertical: spacing.xl,
  },
  list: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  gridRow: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  productCard: {
    flex: 1,
    backgroundColor: 'rgba(246,241,231,0.06)',
    borderColor: colors.mistFaint,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  productImage: {
    height: 80,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(198,161,91,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  productEmoji: {
    fontSize: 32,
  },
  productName: {
    ...type.label,
    color: colors.parchment,
  },
  productPrice: {
    ...type.body,
    color: colors.brass,
    marginTop: spacing.xs,
  },
  productStock: {
    ...type.caption,
    color: colors.mist,
    marginTop: 2,
  },
  outOfStock: {
    color: colors.error,
  },
  emptyText: {
    ...type.body,
    color: colors.mist,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
