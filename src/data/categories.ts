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
  tone: 'cherry' | 'crust' | 'sage' | 'honey';
};

export const CATEGORIES: Record<Category, CategoryConfig> = {
  cakes: { label: 'עוגות', Icon: CakeSlice, color: colors.cherryDark, background: colors.cherryLight, tone: 'cherry' },
  cookies: { label: 'עוגיות', Icon: Cookie, color: colors.honeyDark, background: colors.honeyLight, tone: 'honey' },
  pastries: { label: 'מאפים', Icon: Croissant, color: colors.crustDark, background: colors.crustLight, tone: 'crust' },
  breads: { label: 'לחם וחלות', Icon: Wheat, color: colors.crustDark, background: colors.dough, tone: 'crust' },
  desserts: { label: 'קינוחים', Icon: Dessert, color: colors.sageDark, background: colors.sageLight, tone: 'sage' },
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
