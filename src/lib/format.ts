import type { Category, DealType, Listing } from '@/data/types';
import { CATEGORIES } from '@/data/categories';

/**
 * Human distance, always rounded. We never expose exact locations:
 * < 100m -> "פחות מ-100 מ׳", < 1km -> nearest 50m, otherwise km with one decimal.
 */
export function formatDistance(meters: number): string {
  if (meters < 100) return 'פחות מ-100 מ׳';
  if (meters < 1000) return `${Math.round(meters / 50) * 50} מ׳`;
  const km = Math.round(meters / 100) / 10;
  return `${km.toString()} ק״מ`;
}

/** "350 מ׳ ממך" */
export function formatDistanceFromMe(meters: number): string {
  return `${formatDistance(meters)} ממך`;
}

export function formatPrice(dealType: DealType, price?: number): string {
  switch (dealType) {
    case 'free':
      return 'חינם';
    case 'trade':
      return 'להחלפה';
    case 'sale':
      return `₪${price ?? 0}`;
  }
}

export const DEAL_TYPE_LABELS: Record<DealType, string> = {
  sale: 'מכירה',
  trade: 'החלפה',
  free: 'חינם',
};

/** Days between `isoDate` and today (0 = today). */
export function daysAgo(isoDate: string, now: Date = new Date()): number {
  const then = new Date(isoDate);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.max(0, Math.round((startOf(now) - startOf(then)) / 86_400_000));
}

export function relativeDay(days: number): string {
  if (days === 0) return 'היום';
  if (days === 1) return 'אתמול';
  if (days === 2) return 'שלשום';
  return `לפני ${days} ימים`;
}

/** "נאפה היום" / "נקטף אתמול" / "נאסף לפני 3 ימים" */
export function freshLabel(category: Category, freshAt: string): string {
  return `${CATEGORIES[category].freshVerb} ${relativeDay(daysAgo(freshAt))}`;
}

/** "₪25 · קופסה של 12" */
export function formatPriceLine(listing: Pick<Listing, 'dealType' | 'price' | 'unit'>): string {
  const price = formatPrice(listing.dealType, listing.price);
  return listing.unit ? `${price} · ${listing.unit}` : price;
}

export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'בוקר טוב';
  if (hour >= 12 && hour < 17) return 'צהריים טובים';
  if (hour >= 17 && hour < 22) return 'ערב טוב';
  return 'לילה טוב';
}

/** Keeps digits only and formats an Israeli mobile number as 050-123-4567. */
export function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function isValidIsraeliMobile(raw: string): boolean {
  return /^05\d{8}$/.test(raw.replace(/\D/g, ''));
}

export function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
