import { Tabs } from 'expo-router/js-tabs';

import { Icon, type IconName } from '@/ui/Icons';
import { colors } from '@/ui/tokens';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'home', title: 'Home', icon: 'home' },
  { name: 'businesses', title: 'Businesses', icon: 'businesses' },
  { name: 'markets', title: 'Markets', icon: 'markets' },
  { name: 'properties', title: 'Properties', icon: 'properties' },
  { name: 'portfolio', title: 'Portfolio', icon: 'portfolio' },
];

/** Five main tabs, all visible from the start (spec §3). Each tab owns a Stack. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) => <Icon name={tab.icon} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
