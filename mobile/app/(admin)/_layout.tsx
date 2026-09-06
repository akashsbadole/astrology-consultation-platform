import { Tabs } from 'expo-router';
import { colors, type } from '../../theme/tokens';

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brass,
        tabBarInactiveTintColor: colors.mist,
        tabBarStyle: {
          backgroundColor: colors.midnightDeep,
          borderTopColor: colors.mistFaint,
          height: 88,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          ...type.label,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Dashboard' }}
      />
      <Tabs.Screen
        name="astrologers"
        options={{ title: 'Astrologers' }}
      />
      <Tabs.Screen
        name="revenue"
        options={{ title: 'Revenue' }}
      />
    </Tabs>
  );
}
