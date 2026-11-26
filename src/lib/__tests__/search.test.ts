import { initialListings as MOCK_LISTINGS } from '@/data/mock';
import { filterListings } from '../search';

describe('filterListings', () => {
  it('returns everything for an empty query and "all"', () => {
    expect(filterListings(MOCK_LISTINGS, '  ', 'all')).toHaveLength(MOCK_LISTINGS.length);
  });
  it('filters by category', () => {
    const cakes = filterListings(MOCK_LISTINGS, '', 'cakes');
    expect(cakes.length).toBeGreaterThan(0);
    expect(cakes.every((l) => l.category === 'cakes')).toBe(true);
  });
  it('matches title, description and category name', () => {
    expect(filterListings(MOCK_LISTINGS, 'חלה', 'all').some((l) => l.title.includes('חלה'))).toBe(true);
    expect(filterListings(MOCK_LISTINGS, 'עוגיות', 'all').length).toBeGreaterThan(0);
    expect(filterListings(MOCK_LISTINGS, 'זה לא קיים בכלל', 'all')).toHaveLength(0);
  });
  it('combines query and category', () => {
    const r = filterListings(MOCK_LISTINGS, 'שוקולד', 'cookies');
    expect(r.every((l) => l.category === 'cookies')).toBe(true);
  });
});
