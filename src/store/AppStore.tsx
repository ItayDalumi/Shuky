/**
 * Tiny in-memory store for Phase 1 so the mock screens feel alive
 * (publishing a listing, saving items). Phase 2 swaps this for Supabase queries.
 */
import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react';

import { currentUser, initialListings, sellers } from '@/data/mock';
import type { CurrentUser, Listing, Seller } from '@/data/types';

export type NewListingInput = Omit<Listing, 'id' | 'createdAt' | 'sellerId'>;

type AppStore = {
  user: CurrentUser;
  /** Listings from neighbors (excludes the current user's) */
  feed: Listing[];
  myListings: Listing[];
  savedListings: Listing[];
  getListing: (id: string) => Listing | undefined;
  getSeller: (id: string) => Seller | undefined;
  isSaved: (id: string) => boolean;
  toggleSaved: (id: string) => void;
  addListing: (input: NewListingInput) => Listing;
};

const AppStoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [savedIds, setSavedIds] = useState<string[]>(['l4']);

  const getListing = useCallback((id: string) => listings.find((l) => l.id === id), [listings]);
  const getSeller = useCallback((id: string) => sellers.find((s) => s.id === id), []);
  const isSaved = useCallback((id: string) => savedIds.includes(id), [savedIds]);

  const toggleSaved = useCallback((id: string) => {
    setSavedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
  }, []);

  const addListing = useCallback((input: NewListingInput) => {
    const listing: Listing = {
      ...input,
      id: `local-${Date.now()}`,
      sellerId: currentUser.id,
      createdAt: new Date().toISOString(),
    };
    setListings((prev) => [listing, ...prev]);
    return listing;
  }, []);

  const value = useMemo<AppStore>(() => {
    const byNewest = [...listings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      user: currentUser,
      feed: byNewest.filter((l) => l.sellerId !== currentUser.id),
      myListings: byNewest.filter((l) => l.sellerId === currentUser.id),
      savedListings: savedIds.map((id) => listings.find((l) => l.id === id)).filter((l): l is Listing => !!l),
      getListing,
      getSeller,
      isSaved,
      toggleSaved,
      addListing,
    };
  }, [listings, savedIds, getListing, getSeller, isSaved, toggleSaved, addListing]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStore {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used inside <AppStoreProvider>');
  return ctx;
}
