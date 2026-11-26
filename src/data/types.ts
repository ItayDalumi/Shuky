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
  /** Demo mode only. Live mode asks the server for it when the buyer taps "order" (anti-scraping). */
  whatsapp?: string;
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
  /** Local or remote photo. Falls back to a category illustration. */
  photoUri?: string;
  /** Storage path of the photo (live mode), used to replace / delete it */
  photoPath?: string;
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

export type NotificationKind =
  | 'tradeConfirm'
  | 'tradeCompleted'
  | 'newListing'
  | 'rating'
  | 'preorder'
  | 'level'
  /** Admins only: a new report to review */
  | 'report';

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

export type TradeRole = 'buyer' | 'seller';

/** A trade from the current user's point of view (see my_trades() in the database). */
export type Trade = {
  id: string;
  /** null when the listing was deleted */
  listingId: string | null;
  listingTitle: string;
  listingCategory?: Category;
  role: TradeRole;
  otherId: string;
  otherName: string;
  iConfirmed: boolean;
  otherConfirmed: boolean;
  completedAt?: string;
  createdAt: string;
  iRated: boolean;
  /** XP is given once per pair of neighbors per 7 days (max 3 a day) */
  xpAwarded: boolean;
  /** One rating per neighbor per 30 days */
  canRate: boolean;
};

export type ReportReason = 'spam' | 'inappropriate' | 'unsafe_food' | 'fake' | 'harassment' | 'dangerous' | 'other';

/** A report as the operator sees it on the moderation screen. */
export type AdminReport = {
  id: string;
  createdAt: string;
  reason: ReportReason;
  details: string | null;
  status: 'open' | 'reviewed' | 'dismissed';
  listingId: string | null;
  listingTitle: string | null;
  listingActive: boolean | null;
  listingCategory: Category | null;
  listingPhotoUri?: string;
  reportedUserId: string;
  reportedName: string;
  reportedSuspended: boolean;
  reporterName: string;
  /** Open reports on the same listing (or user) */
  openOnTarget: number;
};

export type ModerationAction = 'hide' | 'restore' | 'dismiss' | 'suspend';

export type BlockedUser = { id: string; name: string };
