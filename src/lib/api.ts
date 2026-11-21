/**
 * Live-mode data access (Supabase). Schema: supabase/migrations.
 * Every function here assumes isSupabaseConfigured === true.
 */
import type { Availability, Category, CurrentUser, DietaryTag, Listing, Seller } from '@/data/types';
import { LISTING_PHOTOS_BUCKET, requireSupabase } from './supabase';

// ---------------------------------------------------------------------------
// Phone auth
// ---------------------------------------------------------------------------

/** "050-123-4567" -> "+972501234567" */
export function toE164IL(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('972')) return `+${digits}`;
  return `+972${digits.replace(/^0/, '')}`;
}

/** "972501234567" -> "050-123-4567" */
export function toLocalIL(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '').replace(/^972/, '0');
  if (digits.length !== 10) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export async function sendOtp(phone: string) {
  const { error } = await requireSupabase().auth.signInWithOtp({ phone: toE164IL(phone) });
  if (error) throw error;
}

export async function verifyOtp(phone: string, token: string) {
  const { error } = await requireSupabase().auth.verifyOtp({ phone: toE164IL(phone), token, type: 'sms' });
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
};

function toCurrentUser(row: ProfileRow): CurrentUser {
  return {
    id: row.id,
    name: row.name,
    community: row.community,
    phone: toLocalIL(row.phone),
    xp: row.xp,
    trades: row.trades_count,
    rating: row.rating_avg === null ? null : Number(row.rating_avg),
  };
}

export async function fetchMyProfile(userId: string): Promise<CurrentUser | null> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('id, name, phone, community, xp, trades_count, rating_avg')
    .eq('id', userId)
    .maybeSingle<ProfileRow>();
  if (error) throw error;
  return data ? toCurrentUser(data) : null;
}

export async function createMyProfile(userId: string, name: string) {
  const { error } = await requireSupabase().from('profiles').insert({ id: userId, name });
  if (error) throw error;
}

export async function updateMyName(userId: string, name: string) {
  const { error } = await requireSupabase().from('profiles').update({ name }).eq('id', userId);
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

export type CreateListingInput = Omit<Listing, 'id' | 'createdAt' | 'sellerId' | 'photoUri'> & { photo?: NewPhoto };

/** Uploads the photo (if any) into <user id>/ and inserts the listing. Returns the new listing id. */
export async function createListing(userId: string, input: CreateListingInput): Promise<string> {
  const client = requireSupabase();
  let photoPath: string | null = null;

  if (input.photo) {
    const ext = input.photo.mimeType === 'image/png' ? 'png' : input.photo.mimeType === 'image/webp' ? 'webp' : 'jpg';
    photoPath = `${userId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await client.storage
      .from(LISTING_PHOTOS_BUCKET)
      .upload(photoPath, base64ToBytes(input.photo.base64), { contentType: input.photo.mimeType, upsert: false });
    if (uploadError) throw uploadError;
  }

  const { data, error } = await client
    .from('listings')
    .insert({
      title: input.title,
      category: input.category,
      price: input.price,
      unit: input.unit ?? null,
      description: input.description,
      availability: input.availability,
      baked_at: input.availability === 'ready' && input.bakedAt ? isoToDate(input.bakedAt) : null,
      notice_days: input.availability === 'preorder' ? (input.noticeDays ?? 1) : null,
      dietary: input.dietary,
      photo_path: photoPath,
    })
    .select('id')
    .single<{ id: string }>();

  if (error) {
    // Don't leave an orphaned photo behind.
    if (photoPath) await client.storage.from(LISTING_PHOTOS_BUCKET).remove([photoPath]);
    throw error;
  }
  return data.id;
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
  if (/rate limit|too many|security purposes/i.test(message)) return 'יותר מדי ניסיונות. חכו דקה ונסו שוב.';
  if (/network|fetch/i.test(message)) return 'אין חיבור לאינטרנט. בדקו את החיבור ונסו שוב.';
  if (/payload too large|exceeded the maximum allowed size/i.test(message)) return 'התמונה גדולה מדי. נסו תמונה אחרת.';
  return 'משהו השתבש. נסו שוב בעוד רגע.';
}
