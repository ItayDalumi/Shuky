/**
 * Live-mode data access (Supabase). Schema: supabase/migrations.
 * Every function here assumes isSupabaseConfigured === true.
 */
import type {
  AppNotification,
  Availability,
  Category,
  CurrentUser,
  DietaryTag,
  Listing,
  NotificationKind,
  NotificationPrefs,
  Seller,
  Trade,
} from '@/data/types';
import { LISTING_PHOTOS_BUCKET, requireSupabase } from './supabase';

// ---------------------------------------------------------------------------
// Email-code auth (free: no SMS provider needed)
// ---------------------------------------------------------------------------

/** "050-123-4567" -> "972501234567" (how phones are stored; what wa.me expects) */
export function toIntlDigitsIL(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('972')) return digits;
  return `972${digits.replace(/^0/, '')}`;
}

/** "972501234567" -> "050-123-4567" */
export function toLocalIL(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '').replace(/^972/, '0');
  if (digits.length !== 10) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Emails a one-time code (the "Magic Link" email template must include {{ .Token }}). */
export async function sendOtp(email: string) {
  const { error } = await requireSupabase().auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyOtp(email: string, token: string) {
  const { error } = await requireSupabase().auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: 'email' });
  if (error) throw error;
}

export async function signOut() {
  await requireSupabase().auth.signOut();
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

type ProfileRow = {
  id: string;
  name: string;
  phone: string | null;
  community: string;
  xp: number;
  trades_count: number;
  rating_avg: number | null;
  notification_prefs: NotificationPrefs | null;
};

const DEFAULT_PREFS: NotificationPrefs = { newListings: true, orders: true, ratings: true };

function toCurrentUser(row: ProfileRow, email: string): CurrentUser {
  return {
    id: row.id,
    name: row.name,
    community: row.community,
    email,
    phone: toLocalIL(row.phone),
    xp: row.xp,
    trades: row.trades_count,
    rating: row.rating_avg === null ? null : Number(row.rating_avg),
  };
}

export async function fetchMyProfile(
  userId: string,
  email: string,
): Promise<{ user: CurrentUser; prefs: NotificationPrefs } | null> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('id, name, phone, community, xp, trades_count, rating_avg, notification_prefs')
    .eq('id', userId)
    .maybeSingle<ProfileRow>();
  if (error) throw error;
  if (!data) return null;
  return { user: toCurrentUser(data, email), prefs: { ...DEFAULT_PREFS, ...(data.notification_prefs ?? {}) } };
}

export async function updateNotificationPrefs(userId: string, prefs: NotificationPrefs) {
  const { error } = await requireSupabase().from('profiles').update({ notification_prefs: prefs }).eq('id', userId);
  if (error) throw error;
}

export async function createMyProfile(userId: string, name: string, phone: string) {
  const { error } = await requireSupabase()
    .from('profiles')
    .insert({ id: userId, name, phone: toIntlDigitsIL(phone) });
  if (error) throw error;
}

export async function updateMyProfile(userId: string, patch: { name?: string; phone?: string }) {
  const row: { name?: string; phone?: string } = {};
  if (patch.name) row.name = patch.name;
  if (patch.phone) row.phone = toIntlDigitsIL(patch.phone);
  const { error } = await requireSupabase().from('profiles').update(row).eq('id', userId);
  if (error) throw error;
}

/** The server snaps the point to a ~100 m grid; we round here too so the exact spot never leaves the phone. */
export async function setMyLocation(lat: number, lng: number) {
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const { error } = await requireSupabase().rpc('set_my_location', { lat: round(lat), lng: round(lng) });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

type FeedRow = {
  id: string;
  seller_id: string;
  title: string;
  category: Category;
  price: number;
  unit: string | null;
  description: string;
  availability: Availability;
  baked_at: string | null;
  notice_days: number | null;
  dietary: DietaryTag[];
  photo_path: string | null;
  created_at: string;
  seller_name: string;
  seller_phone: string | null;
  seller_level: number;
  seller_trades: number;
  seller_rating: number | null;
  distance_meters: number | null;
};

export function photoUrl(path: string): string {
  return requireSupabase().storage.from(LISTING_PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** "2026-11-21" (a calendar date) -> ISO timestamp at local midnight */
function dateToIso(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toISOString();
}

/** ISO timestamp -> "2026-11-21" in local time */
function isoToDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Same-community listings with seller info and a rounded distance (see nearby_listings()). */
export async function fetchFeed(): Promise<{ listings: Listing[]; sellers: Seller[] }> {
  const { data, error } = await requireSupabase().rpc('nearby_listings');
  if (error) throw error;
  const rows = (data ?? []) as FeedRow[];
  const sellers = new Map<string, Seller>();
  const listings = rows.map((r): Listing => {
    if (!sellers.has(r.seller_id)) {
      sellers.set(r.seller_id, {
        id: r.seller_id,
        name: r.seller_name,
        distanceMeters: r.distance_meters,
        level: r.seller_level,
        trades: r.seller_trades,
        rating: r.seller_rating === null ? null : Number(r.seller_rating),
        whatsapp: r.seller_phone ?? '',
      });
    }
    return {
      id: r.id,
      title: r.title,
      category: r.category,
      price: r.price,
      unit: r.unit ?? undefined,
      description: r.description,
      availability: r.availability,
      bakedAt: r.baked_at ? dateToIso(r.baked_at) : undefined,
      noticeDays: r.notice_days ?? undefined,
      dietary: r.dietary,
      sellerId: r.seller_id,
      photoUri: r.photo_path ? photoUrl(r.photo_path) : undefined,
      photoPath: r.photo_path ?? undefined,
      createdAt: r.created_at,
    };
  });
  return { listings, sellers: [...sellers.values()] };
}

export type NewPhoto = { base64: string; mimeType: string };

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export type CreateListingInput = Omit<Listing, 'id' | 'createdAt' | 'sellerId' | 'photoUri' | 'photoPath'> & {
  photo?: NewPhoto;
};

async function uploadPhoto(userId: string, photo: NewPhoto): Promise<string> {
  const ext = photo.mimeType === 'image/png' ? 'png' : photo.mimeType === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await requireSupabase()
    .storage.from(LISTING_PHOTOS_BUCKET)
    .upload(path, base64ToBytes(photo.base64), { contentType: photo.mimeType, upsert: false });
  if (error) throw error;
  return path;
}

function listingColumns(input: CreateListingInput) {
  return {
    title: input.title,
    category: input.category,
    price: input.price,
    unit: input.unit ?? null,
    description: input.description,
    availability: input.availability,
    baked_at: input.availability === 'ready' && input.bakedAt ? isoToDate(input.bakedAt) : null,
    notice_days: input.availability === 'preorder' ? (input.noticeDays ?? 1) : null,
    dietary: input.dietary,
  };
}

/** Uploads the photo (if any) into <user id>/ and inserts the listing. Returns the new listing id. */
export async function createListing(userId: string, input: CreateListingInput): Promise<string> {
  const client = requireSupabase();
  const photoPath = input.photo ? await uploadPhoto(userId, input.photo) : null;

  const { data, error } = await client
    .from('listings')
    .insert({ ...listingColumns(input), photo_path: photoPath })
    .select('id')
    .single<{ id: string }>();

  if (error) {
    // Don't leave an orphaned photo behind.
    if (photoPath) await client.storage.from(LISTING_PHOTOS_BUCKET).remove([photoPath]);
    throw error;
  }
  return data.id;
}

/** Updates a listing; with a new photo, uploads it and removes the old one. */
export async function updateListing(userId: string, listing: Listing, input: CreateListingInput) {
  const client = requireSupabase();
  const newPath = input.photo ? await uploadPhoto(userId, input.photo) : undefined;
  const { error } = await client
    .from('listings')
    .update({ ...listingColumns(input), ...(newPath ? { photo_path: newPath } : {}) })
    .eq('id', listing.id);
  if (error) {
    if (newPath) await client.storage.from(LISTING_PHOTOS_BUCKET).remove([newPath]);
    throw error;
  }
  if (newPath && listing.photoPath) await client.storage.from(LISTING_PHOTOS_BUCKET).remove([listing.photoPath]);
}

export async function deleteListing(listing: Listing) {
  const client = requireSupabase();
  const { error } = await client.from('listings').delete().eq('id', listing.id);
  if (error) throw error;
  if (listing.photoPath) await client.storage.from(LISTING_PHOTOS_BUCKET).remove([listing.photoPath]);
}

// ---------------------------------------------------------------------------
// Trades & ratings (XP only when both sides confirm, enforced in confirm_trade())
// ---------------------------------------------------------------------------

type TradeRow = {
  id: string;
  listing_id: string | null;
  listing_title: string;
  listing_category: Category | null;
  role: 'buyer' | 'seller';
  other_id: string;
  other_name: string;
  i_confirmed: boolean;
  other_confirmed: boolean;
  completed_at: string | null;
  created_at: string;
  i_rated: boolean;
};

export async function fetchTrades(): Promise<Trade[]> {
  const { data, error } = await requireSupabase().rpc('my_trades');
  if (error) throw error;
  return ((data ?? []) as TradeRow[]).map((r) => ({
    id: r.id,
    listingId: r.listing_id,
    listingTitle: r.listing_title,
    listingCategory: r.listing_category ?? undefined,
    role: r.role,
    otherId: r.other_id,
    otherName: r.other_name,
    iConfirmed: r.i_confirmed,
    otherConfirmed: r.other_confirmed,
    completedAt: r.completed_at ?? undefined,
    createdAt: r.created_at,
    iRated: r.i_rated,
  }));
}

/** Buyer marks "I bought this". Returns the trade id. */
export async function markBought(listingId: string): Promise<string> {
  const { data, error } = await requireSupabase().rpc('confirm_trade', { p_listing_id: listingId });
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function confirmTrade(tradeId: string) {
  const { error } = await requireSupabase().rpc('confirm_trade_by_id', { p_trade_id: tradeId });
  if (error) throw error;
}

export async function declineTrade(tradeId: string) {
  const { error } = await requireSupabase().rpc('decline_trade', { p_trade_id: tradeId });
  if (error) throw error;
}

export async function rateTrade(tradeId: string, rateeId: string, stars: number, comment: string) {
  const { error } = await requireSupabase()
    .from('ratings')
    .insert({ trade_id: tradeId, ratee_id: rateeId, stars, comment: comment.trim() || null });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Saved items
// ---------------------------------------------------------------------------

export async function fetchSavedIds(): Promise<string[]> {
  const { data, error } = await requireSupabase()
    .from('saved_listings')
    .select('listing_id')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: { listing_id: string }) => r.listing_id);
}

export async function setSaved(userId: string, listingId: string, saved: boolean) {
  const client = requireSupabase();
  const { error } = saved
    ? await client.from('saved_listings').insert({ listing_id: listingId })
    : await client.from('saved_listings').delete().eq('user_id', userId).eq('listing_id', listingId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Notifications (created by the server)
// ---------------------------------------------------------------------------

type NotificationRow = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data, error } = await requireSupabase()
    .from('notifications')
    .select('id, kind, title, body, href, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return ((data ?? []) as NotificationRow[]).map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    href: n.href ?? undefined,
    read: n.read_at !== null,
    createdAt: n.created_at,
  }));
}

/** Marks the given notifications (or all unread when ids is omitted) as read. */
export async function markNotificationsRead(ids?: string[]) {
  let query = requireSupabase().from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
  if (ids) query = query.in('id', ids);
  const { error } = await query;
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

/** Removes the user's photos, then the account (profile, listings etc. cascade in the database). */
export async function deleteMyAccount(userId: string) {
  const client = requireSupabase();
  const { data: files } = await client.storage.from(LISTING_PHOTOS_BUCKET).list(userId, { limit: 1000 });
  if (files && files.length > 0) {
    await client.storage.from(LISTING_PHOTOS_BUCKET).remove(files.map((f) => `${userId}/${f.name}`));
  }
  const { error } = await client.rpc('delete_my_account');
  if (error) throw error;
  await client.auth.signOut();
}

/** Friendly Hebrew message for errors shown to the user. */
export function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/token has expired|invalid.*otp|otp.*invalid|Token has expired or is invalid/i.test(message)) {
    return 'הקוד לא נכון או שפג תוקפו. נסו שוב.';
  }
  if (/rate limit|too many|security purposes/i.test(message)) return 'יותר מדי ניסיונות. חכו כמה דקות ונסו שוב.';
  if (/invalid.*email|email.*invalid|unable to validate email/i.test(message)) return 'כתובת המייל לא תקינה.';
  if (/network|fetch/i.test(message)) return 'אין חיבור לאינטרנט. בדקו את החיבור ונסו שוב.';
  if (/payload too large|exceeded the maximum allowed size/i.test(message)) return 'התמונה גדולה מדי. נסו תמונה אחרת.';
  return 'משהו השתבש. נסו שוב בעוד רגע.';
}
