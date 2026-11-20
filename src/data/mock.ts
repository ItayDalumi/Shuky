/**
 * Static mock data for Phase 1 (no backend yet).
 * Phase 2 replaces this with Supabase tables: profiles, listings, trades, ratings.
 */
import type { CurrentUser, Listing, Seller } from './types';

/** ISO date `days` days before now, so "נאפה היום" stays true whenever the app runs. */
function daysBefore(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export const COMMUNITY = 'להבים';

export const currentUser: CurrentUser = {
  id: 'me',
  name: 'איתי',
  community: COMMUNITY,
  phone: '050-123-4567',
  xp: 340,
  trades: 12,
  rating: 4.9,
};

/** Fake numbers, for wa.me links only */
export const sellers: Seller[] = [
  { id: 's1', name: 'דנה כהן', distanceMeters: 350, level: 4, trades: 23, rating: 4.9, whatsapp: '050-000-0001' },
  { id: 's2', name: 'יוסי לוי', distanceMeters: 620, level: 2, trades: 6, rating: 4.7, whatsapp: '050-000-0002' },
  { id: 's3', name: 'מיכל אברהם', distanceMeters: 1240, level: 3, trades: 14, rating: 5.0, whatsapp: '050-000-0003' },
  { id: 's4', name: 'רונית שגיא', distanceMeters: 480, level: 5, trades: 41, rating: 4.8, whatsapp: '050-000-0004' },
  { id: 's5', name: 'עמית ברק', distanceMeters: 230, level: 1, trades: 2, rating: 4.5, whatsapp: '050-000-0005' },
  {
    id: 'me',
    name: currentUser.name,
    distanceMeters: 0,
    level: 3,
    trades: currentUser.trades,
    rating: currentUser.rating,
    whatsapp: currentUser.phone,
  },
];

export const initialListings: Listing[] = [
  {
    id: 'l1',
    title: 'עוגיות שוקולד ביתיות',
    category: 'baked',
    dealType: 'sale',
    price: 25,
    unit: 'קופסה של 12',
    description: 'עוגיות שוקולד צ׳יפס שאני אופה כל יום חמישי. כשר, בלי אגוזים. אפשר גם להחליף בירקות מהגינה.',
    freshAt: daysBefore(0),
    sellerId: 's1',
    createdAt: daysBefore(0),
  },
  {
    id: 'l2',
    title: 'עגבניות שרי מהגינה',
    category: 'vegetables',
    dealType: 'sale',
    price: 12,
    unit: 'סלסלה, חצי קילו',
    description: 'עגבניות שרי מתוקות שגדלות אצלנו בגינה בלי ריסוסים. נקטפות בבוקר.',
    freshAt: daysBefore(0),
    sellerId: 's2',
    createdAt: daysBefore(0),
  },
  {
    id: 'l3',
    title: 'ביצים מהלול בחצר',
    category: 'eggs',
    dealType: 'sale',
    price: 30,
    unit: 'תבנית של 12',
    description: 'ביצים מתרנגולות חופש שמסתובבות בחצר. אפשר לאסוף מהבית אחרי 17:00.',
    freshAt: daysBefore(0),
    sellerId: 's3',
    createdAt: daysBefore(1),
  },
  {
    id: 'l4',
    title: 'לימונים מהעץ',
    category: 'fruits',
    dealType: 'free',
    unit: 'שקית',
    description: 'העץ שלנו משתגע השנה. מי שרוצה – מוזמן לקחת, יש המון.',
    freshAt: daysBefore(1),
    sellerId: 's4',
    createdAt: daysBefore(1),
  },
  {
    id: 'l5',
    title: 'חלה מתוקה לשבת',
    category: 'baked',
    dealType: 'sale',
    price: 20,
    unit: 'חלה גדולה',
    description: 'חלה קלועה עם שומשום, נאפית ביום שישי בבוקר. אפשר להזמין עד חמישי בערב.',
    freshAt: daysBefore(0),
    sellerId: 's4',
    createdAt: daysBefore(2),
  },
  {
    id: 'l6',
    title: 'נענע טרייה',
    category: 'vegetables',
    dealType: 'trade',
    unit: 'צרור גדול',
    description: 'נענע מהערוגה, מושלמת לתה. אשמח להחליף בביצים או בפירות.',
    freshAt: daysBefore(0),
    sellerId: 's5',
    createdAt: daysBefore(0),
  },
  {
    id: 'l7',
    title: 'קלמנטינות',
    category: 'fruits',
    dealType: 'trade',
    unit: 'ארגז קטן',
    description: 'קלמנטינות עסיסיות מהעץ בחצר. מחליפה בכל דבר טעים מהתנור.',
    freshAt: daysBefore(2),
    sellerId: 's3',
    createdAt: daysBefore(2),
  },
  {
    id: 'l8',
    title: 'עוגת שמרים',
    category: 'baked',
    dealType: 'sale',
    price: 35,
    unit: 'עוגה שלמה',
    description: 'עוגת שמרים עם שוקולד וקינמון, בדיוק כמו של סבתא.',
    freshAt: daysBefore(0),
    sellerId: 's1',
    createdAt: daysBefore(3),
  },
  {
    id: 'm1',
    title: 'חסה ערבית',
    category: 'vegetables',
    dealType: 'sale',
    price: 8,
    unit: 'ראש',
    description: 'חסה פריכה מהגינה שלי. נקטפת לפי הזמנה.',
    freshAt: daysBefore(0),
    sellerId: 'me',
    createdAt: daysBefore(1),
  },
  {
    id: 'm2',
    title: 'עוגיות חמאה',
    category: 'baked',
    dealType: 'trade',
    unit: 'שקית של 10',
    description: 'עוגיות חמאה פשוטות וטעימות. אשמח להחליף בירקות.',
    freshAt: daysBefore(1),
    sellerId: 'me',
    createdAt: daysBefore(2),
  },
  {
    id: 'm3',
    title: 'פטרוזיליה',
    category: 'vegetables',
    dealType: 'free',
    unit: 'צרור',
    description: 'יש לי יותר ממה שאני צריך. בואו לקחת.',
    freshAt: daysBefore(0),
    sellerId: 'me',
    createdAt: daysBefore(0),
  },
];
