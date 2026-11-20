import { router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';

import { BottomNav, type TabKey } from '@/components';
import { colors } from '@/theme';

const TAB_KEYS: TabKey[] = ['home', 'search', 'saved', 'profile'];

/** Adapts the navigator's tab bar API to our design-system BottomNav. */
function TabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const activeRoute = state.routes[state.index];
  const active = (TAB_KEYS.find((k) => k === activeRoute?.name) ?? 'home') as TabKey;

  const onTabPress = (key: TabKey) => {
    const route = state.routes.find((r) => r.name === key);
    if (!route) return;
    const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (key !== active && !event.defaultPrevented) navigateToTab(route.key);
  };

  return (
    <BottomNav
      active={active}
      onTabPress={onTabPress}
      onAddPress={() => router.push('/listing/new')}
      bottomInset={insets.bottom}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.cream } }}
    >
      <Tabs.Screen name="home" options={{ title: 'בית' }} />
      <Tabs.Screen name="search" options={{ title: 'חיפוש' }} />
      <Tabs.Screen name="saved" options={{ title: 'שמורים' }} />
      <Tabs.Screen name="profile" options={{ title: 'פרופיל' }} />
    </Tabs>
  );
}
