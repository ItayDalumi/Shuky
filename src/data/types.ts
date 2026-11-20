export type Category = 'vegetables' | 'fruits' | 'eggs' | 'baked';
export type DealType = 'sale' | 'trade' | 'free';

export type Seller = {
  id: string;
  name: string;
  /** Approximate distance from the current user in meters (Phase 2: PostGIS, rounded) */
  distanceMeters: number;
  level: number;
  trades: number;
  rating: number;
  /** Used only to build the wa.me deep link */
  whatsapp: string;
};

export type Listing = {
  id: string;
  title: string;
  category: Category;
  dealType: DealType;
  /** ILS, only for dealType === 'sale' */
  price?: number;
  /** e.g. "קופסה של 12" */
  unit?: string;
  /** May be empty */
  description: string;
  /** ISO date the item was baked / picked / collected */
  freshAt: string;
  sellerId: string;
  /** Local or remote photo. Phase 1 falls back to a category illustration. */
  photoUri?: string;
  createdAt: string;
};

export type CurrentUser = {
  id: string;
  name: string;
  community: string;
  phone: string;
  xp: number;
  trades: number;
  rating: number;
};
