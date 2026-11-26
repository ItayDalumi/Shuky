import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CATEGORIES, CATEGORY_FILTERS, type CategoryFilter } from '@/data/categories';
import { border, colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { BakeryArt } from './BakeryArt';

/** Horizontally scrolling category filter with a small illustration per category. */
export function CategoryChips({ value, onChange }: { value: CategoryFilter; onChange: (v: CategoryFilter) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {CATEGORY_FILTERS.map((c) => {
        const selected = value === c.key;
        return (
          <Pressable
            key={c.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={c.label}
            onPress={() => onChange(c.key)}
            style={({ pressed }) => [
              styles.chip,
              c.key === 'all' ? styles.plain : null,
              selected ? styles.selected : null,
              pressed ? { opacity: 0.85 } : null,
            ]}
          >
            {c.key !== 'all' ? (
              <View style={[styles.art, { backgroundColor: CATEGORIES[c.key].background }]}>
                <BakeryArt category={c.key} size={26} background={CATEGORIES[c.key].background} />
              </View>
            ) : null}
            <AppText variant="label" color={selected ? colors.white : colors.ink}>
              {c.label}
            </AppText>
          </Pressable>
        );
      })}
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
