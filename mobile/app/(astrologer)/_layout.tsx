import { Tabs } from 'expo-router';
import { colors, type } from '../../theme/tokens';

export default function AstrologerLayout() {
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
        name="consultations"
        options={{ title: 'Consultations' }}
      />
      <Tabs.Screen
        name="earnings"
        options={{ title: 'Earnings' }}
      />
    </Tabs>
  );
}
