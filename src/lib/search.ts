import type { CategoryFilter } from '@/data/categories';
import { CATEGORIES } from '@/data/categories';
import type { Listing } from '@/data/types';

/** Phase 1 client-side filter. Phase 2 moves this to a Postgres query. */
export function filterListings(listings: Listing[], query: string, category: CategoryFilter): Listing[] {
  const q = query.trim();
  return listings.filter((l) => {
    if (category !== 'all' && l.category !== category) return false;
    if (!q) return true;
    return (
      l.title.includes(q) ||
      l.description.includes(q) ||
      CATEGORIES[l.category].label.includes(q)
    );
  });
}
