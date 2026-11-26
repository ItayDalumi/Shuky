import { errorMessage, toIntlDigitsIL, toLocalIL } from '../api';
import { buildWhatsAppUrl, toInternationalIL } from '../whatsapp';

describe('Israeli phone numbers', () => {
  it('stores numbers as international digits', () => {
    for (const fn of [toIntlDigitsIL, toInternationalIL]) {
      expect(fn('050-123-4567')).toBe('972501234567');
      expect(fn('0501234567')).toBe('972501234567');
      expect(fn('+972 50 123 4567')).toBe('972501234567');
      expect(fn('972501234567')).toBe('972501234567');
    }
  });
  it('shows them back in local format', () => {
    expect(toLocalIL('972501234567')).toBe('050-123-4567');
    expect(toLocalIL(null)).toBe('');
    expect(toLocalIL('12345')).toBe('12345');
  });
  it('matches the database check (^9725[0-9]{8}$)', () => {
    expect(toIntlDigitsIL('052-765-4321')).toMatch(/^9725[0-9]{8}$/);
  });
});

describe('WhatsApp deep link', () => {
  it('encodes the message', () => {
    expect(buildWhatsAppUrl('050-123-4567', 'היי, אשמח לחלה & עוגה')).toBe(
      `https://wa.me/972501234567?text=${encodeURIComponent('היי, אשמח לחלה & עוגה')}`,
    );
  });
});

describe('errorMessage', () => {
  // Dev builds append the raw reason on a second line; users see the first line.
  const friendly = (e: unknown) => errorMessage(e).split('\n')[0];
  it('maps server errors to Hebrew', () => {
    expect(friendly(new Error('Token has expired or is invalid'))).toBe('הקוד לא נכון או שפג תוקפו. נסו שוב.');
    expect(friendly({ message: 'rate limit: too many listings' })).toBe('אפשר לפרסם עד 10 מאפים חדשים ביממה.');
    expect(friendly({ message: 'outside community' })).toBe('נראה שהמיקום מחוץ ללהבים. כרגע שוקי פעיל רק בלהבים.');
    expect(friendly(new TypeError('Network request failed'))).toBe('אין חיבור לאינטרנט. בדקו את החיבור ונסו שוב.');
    expect(friendly(new TypeError('Failed to fetch'))).toBe('אין חיבור לאינטרנט. בדקו את החיבור ונסו שוב.');
  });
  it('falls back to a generic message', () => {
    expect(friendly({ message: 'permission denied for table x' })).toBe('משהו השתבש. נסו שוב בעוד רגע.');
    expect(friendly(undefined)).toBe('משהו השתבש. נסו שוב בעוד רגע.');
  });
  it('shows the raw reason in development', () => {
    expect(errorMessage({ message: 'boom' })).toBe('משהו השתבש. נסו שוב בעוד רגע.\n(boom)');
  });
});
