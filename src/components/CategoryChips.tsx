import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CATEGORIES, CATEGORY_FILTERS, type CategoryFilter } from '@/data/categories';
import type { Category } from '@/data/types';
import { border, colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { BakeryArt } from './BakeryArt';

export type CategoryChipProps = {
  /** Omit for a text-only chip (e.g. "הכל") */
  category?: Category;
  label: string;
  selected: boolean;
  onPress: () => void;
};

/** A pill with a small illustration of the category. */
export function CategoryChip({ category, label, selected, onPress }: CategoryChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [
        styles.chip,
        !category ? styles.plain : null,
        selected ? styles.selected : null,
        pressed ? { opacity: 0.85 } : null,
      ]}
    >
      {category ? (
        <View style={[styles.art, { backgroundColor: CATEGORIES[category].background }]}>
          <BakeryArt category={category} size={26} background={CATEGORIES[category].background} />
        </View>
      ) : null}
      <AppText variant="label" color={selected ? colors.white : colors.ink}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Horizontally scrolling category filter with a small illustration per category. */
export function CategoryChips({ value, onChange }: { value: CategoryFilter; onChange: (v: CategoryFilter) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {CATEGORY_FILTERS.map((c) => (
        <CategoryChip
          key={c.key}
          category={c.key === 'all' ? undefined : c.key}
          label={c.label}
          selected={value === c.key}
          onPress={() => onChange(c.key)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Bleed to the screen edge so chips scroll under the gutter.
  scroll: { marginHorizontal: -spacing.screen, flexGrow: 0 },
  row: { gap: spacing.xs, paddingHorizontal: spacing.screen },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingStart: 5,
    paddingEnd: 14,
    borderRadius: radius.pill,
    borderWidth: border.hairline,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  plain: { paddingStart: 16, paddingEnd: 16 },
  selected: { backgroundColor: colors.cherry, borderColor: colors.cherry },
  art: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
