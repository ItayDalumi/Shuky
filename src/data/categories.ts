import { Apple, Carrot, Cookie, Egg, type LucideIcon } from 'lucide-react-native';

import { colors } from '@/theme';
import type { Category } from './types';

export type CategoryConfig = {
  label: string;
  Icon: LucideIcon;
  /** Icon / accent color */
  color: string;
  /** Soft background behind the illustration */
  background: string;
  /** Verb used for freshness: "נאפה היום", "נקטף היום" */
  freshVerb: string;
  /** Tag color on the product page */
  tone: 'tomato' | 'leaf' | 'honey';
};

export const CATEGORIES: Record<Category, CategoryConfig> = {
  vegetables: {
    label: 'ירקות',
    Icon: Carrot,
    color: colors.tomatoDark,
    background: colors.tomatoLight,
    freshVerb: 'נקטף',
    tone: 'tomato',
  },
  fruits: {
    label: 'פירות',
    Icon: Apple,
    color: colors.leaf,
    background: colors.leafLight,
    freshVerb: 'נקטף',
    tone: 'leaf',
  },
  eggs: {
    label: 'ביצים',
    Icon: Egg,
    color: colors.honeyDark,
    background: colors.cream,
    freshVerb: 'נאסף',
    tone: 'honey',
  },
  baked: {
    label: 'מאפים',
    Icon: Cookie,
    color: colors.honeyDark,
    background: colors.honeyLight,
    freshVerb: 'נאפה',
    tone: 'honey',
  },
};

/** Display order (right to left in the UI) */
export const CATEGORY_ORDER: Category[] = ['vegetables', 'fruits', 'eggs', 'baked'];

export type CategoryFilter = Category | 'all';

export const CATEGORY_FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'הכל' },
  ...CATEGORY_ORDER.map((key) => ({ key, label: CATEGORIES[key].label })),
];
