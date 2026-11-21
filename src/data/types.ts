/** Shuky sells home-baked goods only. */
export type Category = 'cakes' | 'cookies' | 'pastries' | 'breads' | 'desserts';

/** Ready now (already baked) or baked to order (pre-order). */
export type Availability = 'ready' | 'preorder';

export type DietaryTag = 'kosher' | 'parve' | 'glutenFree' | 'vegan' | 'nutFree';

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
  /** ILS. Every listing is for sale. */
  price: number;
  /** e.g. "קופסה של 12" */
  unit?: string;
  /** May be empty */
  description: string;
  availability: Availability;
  /** ready: ISO date it was baked */
  bakedAt?: string;
  /** preorder: minimum days of notice the baker needs */
  noticeDays?: number;
  dietary: DietaryTag[];
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
