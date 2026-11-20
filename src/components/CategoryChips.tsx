import { ScrollView, StyleSheet } from 'react-native';

import { CATEGORY_FILTERS, type CategoryFilter } from '@/data/categories';
import { spacing } from '@/theme';
import { Chip } from './Chip';

/** Horizontally scrolling category filter: הכל, ירקות, פירות, ביצים, מאפים */
export function CategoryChips({ value, onChange }: { value: CategoryFilter; onChange: (v: CategoryFilter) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {CATEGORY_FILTERS.map((c) => (
        <Chip key={c.key} label={c.label} selected={value === c.key} onPress={() => onChange(c.key)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Bleed to the screen edge so chips scroll under the gutter.
  scroll: { marginHorizontal: -spacing.screen, flexGrow: 0 },
  row: { gap: spacing.xs, paddingHorizontal: spacing.screen },
});
