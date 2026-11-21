import type { Availability, Listing } from '@/data/types';

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

/** Every listing is for sale: "₪25" */
export function formatPrice(price: number): string {
  return `₪${price}`;
}

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  ready: 'מוכן עכשיו',
  preorder: 'בהזמנה מראש',
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

/** "נאפה היום" / "נאפה אתמול" */
export function bakedLabel(bakedAt: string): string {
  return `נאפה ${relativeDay(daysAgo(bakedAt))}`;
}

/** "יום מראש" / "יומיים מראש" / "3 ימים מראש" / "שבוע מראש" */
export function noticeLabel(days: number): string {
  if (days === 1) return 'יום מראש';
  if (days === 2) return 'יומיים מראש';
  if (days === 7) return 'שבוע מראש';
  return `${days} ימים מראש`;
}

/** Freshness / ordering line: "נאפה היום" or "בהזמנה, יומיים מראש" */
export function availabilityLabel(listing: Pick<Listing, 'availability' | 'bakedAt' | 'noticeDays'>): string {
  if (listing.availability === 'preorder') return `בהזמנה, ${noticeLabel(listing.noticeDays ?? 1)}`;
  return bakedLabel(listing.bakedAt ?? new Date().toISOString());
}

/** "₪25 · קופסה של 12" */
export function formatPriceLine(listing: Pick<Listing, 'price' | 'unit'>): string {
  const price = formatPrice(listing.price);
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

/** "עכשיו" / "לפני 20 דק׳" / "לפני שעתיים" / "אתמול" / "לפני 5 ימים" */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return 'עכשיו';
  if (minutes < 60) return `לפני ${minutes} דק׳`;
  const hours = Math.round(minutes / 60);
  if (hours === 1) return 'לפני שעה';
  if (hours === 2) return 'לפני שעתיים';
  if (hours < 24) return `לפני ${hours} שעות`;
  return relativeDay(daysAgo(iso, now));
}

/** "4.9", or "חדש/ה" before the first rating */
export function formatRating(rating: number | null): string {
  return rating === null ? 'חדש/ה' : rating.toFixed(1);
}

/** Rounded distance, or a neutral fallback when no location was shared. */
export function formatDistanceOrNearby(meters: number | null, fromMe = false): string {
  if (meters === null) return 'בשכונה';
  return fromMe ? formatDistanceFromMe(meters) : formatDistance(meters);
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.trim());
}
