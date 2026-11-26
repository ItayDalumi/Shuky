import { Pressable, StyleSheet, View } from 'react-native';
import { Heart, House, Plus, Search, User, type LucideIcon } from 'lucide-react-native';

import { border, colors, spacing } from '@/theme';
import { AppText } from './AppText';

export type TabKey = 'home' | 'search' | 'saved' | 'profile';

type TabItem = { key: TabKey; label: string; Icon: LucideIcon };

/** Right to left: בית, חיפוש, [+], שמורים, פרופיל */
const START_TABS: TabItem[] = [
  { key: 'home', label: 'בית', Icon: House },
  { key: 'search', label: 'חיפוש', Icon: Search },
];
const END_TABS: TabItem[] = [
  { key: 'saved', label: 'שמורים', Icon: Heart },
  { key: 'profile', label: 'פרופיל', Icon: User },
];

export type BottomNavProps = {
  active: TabKey;
  onTabPress: (key: TabKey) => void;
  onAddPress: () => void;
  /** Safe-area bottom inset (home indicator) */
  bottomInset?: number;
};

export function BottomNav({ active, onTabPress, onAddPress, bottomInset = 0 }: BottomNavProps) {
  const renderTab = ({ key, label, Icon }: TabItem) => {
    const isActive = key === active;
    const color = isActive ? colors.cherry : colors.muted;
    return (
      <Pressable
        key={key}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: isActive }}
        onPress={() => onTabPress(key)}
        style={styles.tab}
      >
        <View style={[styles.iconWrap, isActive ? styles.iconActive : null]}>
          <Icon
            size={22}
            color={color}
            strokeWidth={isActive ? 2.25 : 1.75}
            fill={isActive && key === 'saved' ? colors.cherryLight : 'none'}
          />
        </View>
        <AppText variant="tab" weight={isActive ? 'medium' : 'regular'} color={color} center>
          {label}
        </AppText>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(bottomInset, 26) }]}>
      {START_TABS.map(renderTab)}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="הוספת מוצר"
        onPress={onAddPress}
        style={({ pressed }) => [styles.addWrap, pressed ? { opacity: 0.85, transform: [{ scale: 0.96 }] } : null]}
      >
        <View style={styles.add}>
          <Plus size={26} color={colors.white} strokeWidth={2.5} />
        </View>
      </Pressable>
      {END_TABS.map(renderTab)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: border.hairline,
    borderTopColor: colors.line,
  },
  tab: {
    width: 58,
    alignItems: 'center',
    gap: 2,
  },
  iconWrap: {
    width: 46,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: { backgroundColor: colors.cherryLight },
  addWrap: {
    marginTop: -26,
    padding: 5,
    borderRadius: 34,
    backgroundColor: colors.white,
    borderWidth: border.hairline,
    borderColor: colors.line,
  },
  add: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cherry,
  },
});
