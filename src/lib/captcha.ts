import { isSupabaseConfigured } from './supabase';

/**
 * Optional CAPTCHA on sign-in: Cloudflare Turnstile (free). Turn it on by setting
 * EXPO_PUBLIC_TURNSTILE_SITE_KEY and enabling Turnstile in Supabase (Authentication → Attack Protection).
 * The site key is public by design; the secret key goes only into the Supabase dashboard.
 */
export const TURNSTILE_SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY ?? '';

/** The phone WebView pretends to be this page; add its hostname in the Turnstile widget settings. */
export const TURNSTILE_BASE_URL = process.env.EXPO_PUBLIC_TURNSTILE_BASE_URL || 'https://itaydalumi.github.io';

export const captchaEnabled = isSupabaseConfigured && TURNSTILE_SITE_KEY.length > 0;

export const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
