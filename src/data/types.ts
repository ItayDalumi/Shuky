/** Shuky sells home-baked goods only. */
export type Category = 'cakes' | 'cookies' | 'pastries' | 'breads' | 'desserts';

/** Ready now (already baked) or baked to order (pre-order). */
export type Availability = 'ready' | 'preorder';

export type DietaryTag = 'kosher' | 'parve' | 'glutenFree' | 'vegan' | 'nutFree';

export type Seller = {
  id: string;
  name: string;
  /** Rounded distance from the current user in meters; null when either side shared no location */
  distanceMeters: number | null;
  level: number;
  trades: number;
  /** null until the first rating */
  rating: number | null;
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
  /** Sign-in email */
  email: string;
  /** WhatsApp number for orders, e.g. "050-123-4567" (entered by the user, not verified) */
  phone: string;
  xp: number;
  trades: number;
  /** null until the first rating */
  rating: number | null;
};

export type NotificationKind = 'tradeConfirm' | 'newListing' | 'rating' | 'preorder' | 'level';

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  /** Where tapping the notification leads */
  href?: string;
};

/** Which push notifications the user wants (Phase 2: stored on the profile, sent via Expo Push). */
export type NotificationPrefs = {
  newListings: boolean;
  orders: boolean;
  ratings: boolean;
};
