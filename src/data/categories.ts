import { CakeSlice, Cookie, Croissant, Dessert, Wheat, type LucideIcon } from 'lucide-react-native';

import { colors } from '@/theme';
import type { Category, DietaryTag } from './types';

export type CategoryConfig = {
  label: string;
  Icon: LucideIcon;
  /** Icon / accent color */
  color: string;
  /** Soft background behind the illustration */
  background: string;
  /** Tag color on the product page */
  tone: 'tomato' | 'leaf' | 'honey';
};

export const CATEGORIES: Record<Category, CategoryConfig> = {
  cakes: { label: 'עוגות', Icon: CakeSlice, color: colors.tomatoDark, background: colors.tomatoLight, tone: 'tomato' },
  cookies: { label: 'עוגיות', Icon: Cookie, color: colors.honeyDark, background: colors.honeyLight, tone: 'honey' },
  pastries: { label: 'מאפים', Icon: Croissant, color: colors.honeyDark, background: colors.cream, tone: 'honey' },
  breads: { label: 'לחם וחלות', Icon: Wheat, color: colors.honeyDark, background: colors.honeyLight, tone: 'honey' },
  desserts: { label: 'קינוחים', Icon: Dessert, color: colors.leafDark, background: colors.leafLight, tone: 'leaf' },
};

/** Display order (right to left in the UI) */
export const CATEGORY_ORDER: Category[] = ['cakes', 'cookies', 'pastries', 'breads', 'desserts'];

export type CategoryFilter = Category | 'all';

export const CATEGORY_FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'הכל' },
  ...CATEGORY_ORDER.map((key) => ({ key, label: CATEGORIES[key].label })),
];

/** Kashrut and allergy info matters a lot for home-baked food. */
export const DIETARY_LABELS: Record<DietaryTag, string> = {
  kosher: 'כשר',
  parve: 'פרווה',
  glutenFree: 'ללא גלוטן',
  vegan: 'טבעוני',
  nutFree: 'ללא אגוזים',
};

export const DIETARY_ORDER: DietaryTag[] = ['kosher', 'parve', 'glutenFree', 'vegan', 'nutFree'];

/** Pre-order notice options, in days */
export const NOTICE_OPTIONS = [1, 2, 3, 7] as const;
