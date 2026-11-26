import {
  availabilityLabel,
  daysAgo,
  formatCountdown,
  formatDistance,
  formatDistanceOrNearby,
  formatPhoneInput,
  formatPriceLine,
  formatQuantity,
  formatRating,
  greeting,
  isValidEmail,
  isValidIsraeliMobile,
  noticeLabel,
  parseQuantity,
  relativeDay,
  relativeTime,
} from '../format';

describe('formatDistance (never exact)', () => {
  it('hides anything under 100 m', () => {
    expect(formatDistance(0)).toBe('פחות מ-100 מ׳');
    expect(formatDistance(99)).toBe('פחות מ-100 מ׳');
  });
  it('rounds to 50 m under a kilometer', () => {
    expect(formatDistance(100)).toBe('100 מ׳');
    expect(formatDistance(337)).toBe('350 מ׳');
    expect(formatDistance(362)).toBe('350 מ׳');
    expect(formatDistance(980)).toBe('1000 מ׳');
  });
  it('uses km with one decimal from 1 km', () => {
    expect(formatDistance(1000)).toBe('1 ק״מ');
    expect(formatDistance(1234)).toBe('1.2 ק״מ');
    expect(formatDistance(15_960)).toBe('16 ק״מ');
  });
  it('falls back when no location was shared', () => {
    expect(formatDistanceOrNearby(null)).toBe('בשכונה');
    expect(formatDistanceOrNearby(340, true)).toBe('350 מ׳ ממך');
  });
});

describe('days and times', () => {
  const now = new Date(2026, 10, 26, 15, 0);
  it('counts calendar days, not 24h windows', () => {
    expect(daysAgo(new Date(2026, 10, 26, 0, 1).toISOString(), now)).toBe(0);
    expect(daysAgo(new Date(2026, 10, 25, 23, 59).toISOString(), now)).toBe(1);
    expect(daysAgo(new Date(2026, 10, 30).toISOString(), now)).toBe(0); // future → today
  });
  it('names recent days in Hebrew', () => {
    expect([0, 1, 2, 5].map(relativeDay)).toEqual(['היום', 'אתמול', 'שלשום', 'לפני 5 ימים']);
  });
  it('relative time', () => {
    const ago = (min: number) => new Date(now.getTime() - min * 60_000).toISOString();
    expect(relativeTime(ago(0), now)).toBe('עכשיו');
    expect(relativeTime(ago(20), now)).toBe('לפני 20 דק׳');
    expect(relativeTime(ago(60), now)).toBe('לפני שעה');
    expect(relativeTime(ago(120), now)).toBe('לפני שעתיים');
    expect(relativeTime(ago(5 * 60), now)).toBe('לפני 5 שעות');
    expect(relativeTime(ago(26 * 60), now)).toBe('אתמול');
  });
  it('greets by time of day', () => {
    const at = (h: number) => greeting(new Date(2026, 0, 1, h));
    expect([at(6), at(13), at(19), at(23), at(3)]).toEqual([
      'בוקר טוב',
      'צהריים טובים',
      'ערב טוב',
      'לילה טוב',
      'לילה טוב',
    ]);
  });
  it('countdown', () => {
    expect(formatCountdown(58)).toBe('0:58');
    expect(formatCountdown(65)).toBe('1:05');
  });
});

describe('listing labels', () => {
  it('pre-order notice', () => {
    expect([1, 2, 3, 7].map(noticeLabel)).toEqual(['יום מראש', 'יומיים מראש', '3 ימים מראש', 'שבוע מראש']);
    expect(availabilityLabel({ availability: 'preorder', noticeDays: 2 })).toBe('בהזמנה, יומיים מראש');
    expect(availabilityLabel({ availability: 'preorder' })).toBe('בהזמנה, יום מראש');
  });
  it('freshness', () => {
    expect(availabilityLabel({ availability: 'ready', bakedAt: new Date().toISOString() })).toBe('נאפה היום');
  });
  it('price line', () => {
    expect(formatPriceLine({ price: 25, unit: 'קופסה של 12' })).toBe('₪25 · קופסה של 12');
    expect(formatPriceLine({ price: 90 })).toBe('₪90');
  });
  it('rating', () => {
    expect(formatRating(null)).toBe('חדש/ה');
    expect(formatRating(4.85)).toBe('4.8'); // toFixed rounding of a binary float
    expect(formatRating(5)).toBe('5.0');
  });
  it('quantity round-trips through listing.unit', () => {
    expect(formatQuantity(1)).toBe('יחידה אחת');
    expect(formatQuantity(12)).toBe('12 יחידות');
    for (const n of [1, 6, 12, 24]) expect(parseQuantity(formatQuantity(n))).toBe(String(n));
    expect(parseQuantity('קופסה של 12')).toBe('12');
    expect(parseQuantity(undefined)).toBe('');
    expect(parseQuantity('חלה גדולה')).toBe('');
  });
});

describe('input validation', () => {
  it('formats phone input as you type', () => {
    expect(formatPhoneInput('05')).toBe('05');
    expect(formatPhoneInput('05012')).toBe('050-12');
    expect(formatPhoneInput('0501234567')).toBe('050-123-4567');
    expect(formatPhoneInput('050-123-4567999')).toBe('050-123-4567');
    expect(formatPhoneInput('abc')).toBe('');
  });
  it('accepts Israeli mobiles only', () => {
    expect(isValidIsraeliMobile('050-123-4567')).toBe(true);
    expect(isValidIsraeliMobile('0541234567')).toBe(true);
    expect(isValidIsraeliMobile('03-1234567')).toBe(false);
    expect(isValidIsraeliMobile('050-123-456')).toBe(false);
  });
  it('emails', () => {
    expect(isValidEmail(' Noa@Example.com ')).toBe(true);
    expect(isValidEmail('noa@example')).toBe(false);
    expect(isValidEmail('noa example.com')).toBe(false);
  });
});
