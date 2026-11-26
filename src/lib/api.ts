/**
 * Live-mode data access (Supabase). Schema: supabase/migrations.
 * Every function here assumes isSupabaseConfigured === true.
 */
import type {
  AdminReport,
  AppNotification,
  BlockedUser,
  Availability,
  Category,
  CurrentUser,
  DietaryTag,
  Listing,
  NotificationKind,
  NotificationPrefs,
  ModerationAction,
  ReportReason,
  Seller,
  Trade,
} from '@/data/types';
import { stripJpegMetadata } from './jpegMetadata';
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
export async function sendOtp(email: string, captchaToken?: string) {
  const { error } = await requireSupabase().auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true, captchaToken },
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
  // Own full profile through an RPC: the phone column isn't readable directly (anti-scraping).
  const { data: rows, error } = await requireSupabase().rpc('get_my_profile');
  if (error) throw error;
  const data = ((rows ?? []) as ProfileRow[]).find((r) => r.id === userId);
  if (!data) return null;
  return { user: toCurrentUser(data, email), prefs: { ...DEFAULT_PREFS, ...(data.notification_prefs ?? {}) } };
}

export async function updateNotificationPrefs(userId: string, prefs: NotificationPrefs) {
  void userId; // the server only ever updates the signed-in user's own row
  const { error } = await requireSupabase().rpc('set_my_notification_prefs', { p_prefs: prefs });
  if (error) throw error;
}

export async function createMyProfile(userId: string, name: string, phone: string) {
  void userId; // the server uses the signed-in user's id
  const { error } = await requireSupabase().rpc('create_my_profile', {
    p_name: name,
    p_phone: toIntlDigitsIL(phone),
  });
  if (error) throw error;
}

export async function updateMyProfile(userId: string, patch: { name?: string; phone?: string }) {
  void userId; // the server only ever updates the signed-in user's own row
  const { error } = await requireSupabase().rpc('update_my_profile', {
    p_name: patch.name || null,
    p_phone: patch.phone ? toIntlDigitsIL(patch.phone) : null,
  });
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
  seller_level: number;
  seller_trades: number;
  seller_rating: number | null;
  distance_meters: number | null;
};

/** How long a photo link stays valid. Photos are private: only signed-in neighbors who can see the listing. */
const PHOTO_URL_TTL_SECONDS = 60 * 60;

/** Short-lived signed links for photos the user is allowed to see (path -> url). */
async function signPhotoUrls(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;
  const { data, error } = await requireSupabase()
    .storage.from(LISTING_PHOTOS_BUCKET)
    .createSignedUrls(paths, PHOTO_URL_TTL_SECONDS);
  if (error) return urls; // listings still show, with the category illustration
  for (const item of data ?? []) {
    if (item.path && item.signedUrl && !item.error) urls.set(item.path, item.signedUrl);
  }
  return urls;
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
  const photoUrls = await signPhotoUrls([...new Set(rows.map((r) => r.photo_path).filter((p): p is string => !!p))]);
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
      photoUri: r.photo_path ? photoUrls.get(r.photo_path) : undefined,
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
  // Second safety net after preparePhoto(): drop any EXIF / GPS / XMP segments left in the bytes.
  const bytes = stripJpegMetadata(base64ToBytes(photo.base64));
  const { error } = await requireSupabase()
    .storage.from(LISTING_PHOTOS_BUCKET)
    .upload(path, bytes, { contentType: photo.mimeType, upsert: false });
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

/** Removes files from the photo bucket, retrying once; throws if they're still there. */
async function removePhotos(paths: string[]) {
  if (paths.length === 0) return;
  const bucket = requireSupabase().storage.from(LISTING_PHOTOS_BUCKET);
  for (let i = 0; i < paths.length; i += 100) {
    const chunk = paths.slice(i, i + 100);
    let { error } = await bucket.remove(chunk);
    if (error) ({ error } = await bucket.remove(chunk));
    if (error) throw error;
  }
}

export async function deleteListing(listing: Listing) {
  const client = requireSupabase();
  const { error } = await client.from('listings').delete().eq('id', listing.id);
  if (error) throw error;
  // The listing is gone; don't fail the whole action if only the photo cleanup hiccups.
  if (listing.photoPath) await removePhotos([listing.photoPath]).catch(() => {});
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
  xp_awarded: boolean;
  can_rate: boolean;
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
    xpAwarded: r.xp_awarded,
    canRate: r.can_rate,
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
// Contact, reports and blocks
// ---------------------------------------------------------------------------

/** The seller's WhatsApp number for one listing (logged and rate limited on the server). */
export async function getSellerWhatsapp(listingId: string): Promise<string> {
  const { data, error } = await requireSupabase().rpc('get_seller_whatsapp', { p_listing_id: listingId });
  if (error) throw error;
  return data as string;
}

export async function reportListing(listingId: string, sellerId: string, reason: ReportReason) {
  const { error } = await requireSupabase()
    .from('reports')
    .insert({ reported_user_id: sellerId, listing_id: listingId, reason });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Moderation (operator only; the server checks public.admins)
// ---------------------------------------------------------------------------
export async function amIAdmin(): Promise<boolean> {
  const { data, error } = await requireSupabase().rpc('is_admin');
  if (error) return false;
  return data === true;
}

type AdminReportRow = {
  id: string;
  created_at: string;
  reason: ReportReason;
  details: string | null;
  status: AdminReport['status'];
  listing_id: string | null;
  listing_title: string | null;
  listing_active: boolean | null;
  listing_photo_path: string | null;
  listing_category: Category | null;
  reported_user_id: string;
  reported_name: string;
  reported_suspended: boolean;
  reporter_name: string;
  open_reports_on_target: number;
};

export async function fetchAdminReports(): Promise<AdminReport[]> {
  const { data, error } = await requireSupabase().rpc('admin_reports');
  if (error) throw error;
  const rows = (data ?? []) as AdminReportRow[];
  const photos = await signPhotoUrls([
    ...new Set(rows.map((r) => r.listing_photo_path).filter((p): p is string => !!p)),
  ]);
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    reason: r.reason,
    details: r.details,
    status: r.status,
    listingId: r.listing_id,
    listingTitle: r.listing_title,
    listingActive: r.listing_active,
    listingCategory: r.listing_category,
    listingPhotoUri: r.listing_photo_path ? photos.get(r.listing_photo_path) : undefined,
    reportedUserId: r.reported_user_id,
    reportedName: r.reported_name,
    reportedSuspended: r.reported_suspended,
    reporterName: r.reporter_name,
    openOnTarget: Number(r.open_reports_on_target),
  }));
}

export async function resolveReport(reportId: string, action: ModerationAction) {
  const { error } = await requireSupabase().rpc('admin_resolve_report', { p_report: reportId, p_action: action });
  if (error) throw error;
}

export async function unsuspendUser(userId: string) {
  const { error } = await requireSupabase().rpc('admin_unsuspend', { p_user: userId });
  if (error) throw error;
}

export async function blockUser(userId: string) {
  const { error } = await requireSupabase().from('blocks').insert({ blocked_id: userId });
  if (error && error.code !== '23505') throw error; // already blocked is fine
}

export async function unblockUser(me: string, userId: string) {
  const { error } = await requireSupabase().from('blocks').delete().eq('blocker_id', me).eq('blocked_id', userId);
  if (error) throw error;
}

export async function fetchBlocks(): Promise<BlockedUser[]> {
  const { data, error } = await requireSupabase().rpc('my_blocks');
  if (error) throw error;
  return ((data ?? []) as { user_id: string; name: string }[]).map((b) => ({ id: b.user_id, name: b.name }));
}

// ---------------------------------------------------------------------------
// Push notifications
// ---------------------------------------------------------------------------

export async function registerPushToken(token: string, platform: 'ios' | 'android') {
  const { error } = await requireSupabase().rpc('register_push_token', { p_token: token, p_platform: platform });
  if (error) throw error;
}

/** On sign out: stop pushes to this device for this account. */
export async function removePushToken(token: string) {
  const { error } = await requireSupabase().from('push_tokens').delete().eq('token', token);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

/**
 * Deletes ALL of the user's photos first (every page of their folder), then the account; profile,
 * listings, trades, ratings, notifications etc. cascade in the database. If the photos can't be
 * removed, the account is not deleted, so the user can retry and nothing is left behind.
 */
export async function deleteMyAccount(userId: string) {
  const client = requireSupabase();
  const bucket = client.storage.from(LISTING_PHOTOS_BUCKET);
  const paths: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data: files, error } = await bucket.list(userId, { limit: 100, offset });
    if (error) throw error;
    paths.push(...(files ?? []).map((f) => `${userId}/${f.name}`));
    if (!files || files.length < 100) break;
  }
  await removePhotos(paths);
  const { error } = await client.rpc('delete_my_account');
  if (error) throw error;
  await client.auth.signOut();
}

/** Everything the server holds about the signed-in user (right of access). */
export async function exportMyData(): Promise<unknown> {
  const { data, error } = await requireSupabase().rpc('export_my_data');
  if (error) throw error;
  return data;
}

/** Friendly Hebrew message for errors shown to the user. */
export function errorMessage(error: unknown): string {
  const friendly = friendlyMessage(error);
  // Development builds also show the server's reason, so setup problems are easy to spot.
  if (__DEV__) {
    const raw = rawMessage(error);
    if (raw) return `${friendly}\n(${raw})`;
  }
  return friendly;
}

/** Supabase auth errors are Error instances; PostgREST / storage errors are plain objects. */
function rawMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message);
  return error ? String(error) : '';
}

function friendlyMessage(error: unknown): string {
  const message = rawMessage(error);
  if (/error sending .*email|smtp/i.test(message)) return 'לא הצלחנו לשלוח את המייל. נסו שוב בעוד כמה דקות.';
  if (/invalid api key|no api key|apikey/i.test(message)) return 'האפליקציה לא מחוברת נכון לשרת (מפתח שגוי).';
  if (/token has expired|invalid.*otp|otp.*invalid|Token has expired or is invalid/i.test(message)) {
    return 'הקוד לא נכון או שפג תוקפו. נסו שוב.';
  }
  if (/location required/i.test(message)) return 'כדי לפרסם צריך קודם לשתף מיקום משוער בלהבים.';
  if (/outside community/i.test(message)) return 'נראה שהמיקום מחוץ ללהבים. כרגע שוקי פעיל רק בלהבים.';
  if (/too many listings/i.test(message)) return 'אפשר לפרסם עד 10 מאפים חדשים ביממה.';
  if (/too many trades/i.test(message)) return 'הגעת למקסימום העסקאות החדשות להיום. נסו שוב מחר.';
  if (/too many contacts/i.test(message)) return 'פנית להרבה מוכרים היום. נסו שוב מחר.';
  if (/too many reports/i.test(message)) return 'שלחת הרבה דיווחים היום. נבדוק אותם בהקדם.';
  if (/not available/i.test(message)) return 'המאפה או המשתמש כבר לא זמינים.';
  if (/account suspended/i.test(message)) return 'החשבון הושעה בעקבות דיווחים. לבירור כתבו לנו מעמוד בטיחות ועזרה.';
  if (/hidden by moderation/i.test(message)) return 'המאפה הוסתר בעקבות דיווחים ולא ניתן להציג אותו שוב.';
  if (/not allowed/i.test(message)) return 'אין לך הרשאה לפעולה הזו.';
  if (/rate limit|too many|security purposes/i.test(message)) return 'יותר מדי ניסיונות. חכו כמה דקות ונסו שוב.';
  if (/invalid.*email|email.*invalid|unable to validate email/i.test(message)) return 'כתובת המייל לא תקינה.';
  if (/captcha/i.test(message)) return 'בדיקת האבטחה נכשלה. נסו שוב.';
  if (/timed out|timeout/i.test(message)) return 'השרת לא עונה כרגע. בדקו את החיבור ונסו שוב.';
  if (/network|fetch|load failed/i.test(message)) return 'אין חיבור לאינטרנט. בדקו את החיבור ונסו שוב.';
  if (/payload too large|exceeded the maximum allowed size/i.test(message)) return 'התמונה גדולה מדי. נסו תמונה אחרת.';
  return 'משהו השתבש. נסו שוב בעוד רגע.';
}
