import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, type } from '../../theme/tokens';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label[0]}</Text>
    </View>
  );
}

export default function DashboardLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brass,
        tabBarInactiveTintColor: colors.mistFaint,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon label="H" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="astrologers"
        options={{
          title: 'Astrologers',
          tabBarIcon: ({ focused }) => <TabIcon label="A" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="kundli"
        options={{
          title: 'Kundli',
          tabBarIcon: ({ focused }) => <TabIcon label="K" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ focused }) => <TabIcon label="W" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="store"
        options={{
          title: 'Store',
          tabBarIcon: ({ focused }) => <TabIcon label="S" focused={focused} />,
        }}
      />
      <Tabs.Screen name="astrologer-detail" options={{ href: null }} />
      <Tabs.Screen name="kundli-detail" options={{ href: null }} />
      <Tabs.Screen name="consultations" options={{ href: null }} />
      <Tabs.Screen name="consultation-chat" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.midnightDeep,
    borderTopColor: colors.mistFaint,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 4,
  },
  tabBarLabel: {
    ...type.caption,
  },
  tabIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(198,161,91,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    ...type.label,
    color: colors.mistFaint,
    fontSize: 12,
  },
  tabLabelActive: {
    color: colors.brass,
  },
});
