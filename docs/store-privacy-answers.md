# Store privacy forms: answers for Shuky

Use these when filling **App Store Connect → App Privacy** and **Google Play Console → Data safety**.
They describe the app as built (see `src/content/legal.ts` and `supabase/migrations`). Re-check them
whenever data collection changes. Privacy policy URL: `https://itaydalumi.github.io/Shuky/privacy.html`.

## Summary

- No ads, no third-party analytics or tracking SDKs, no data sold, no cross-app tracking (App Store: "Data Not Used to Track You").
- Data is encrypted in transit (HTTPS / TLS).
- Users can delete their account and all data in the app (Settings → מחיקת חשבון) and download it (Settings → הורדת המידע שלי).

## Data collected

| Data (App Store type / Play type) | What exactly | Purpose | Linked to user | Optional? |
| --- | --- | --- | --- | --- |
| Contact info → Email address | Sign-in email | App functionality (account) | Yes | Required |
| Contact info → Phone number | WhatsApp number for orders, shown to a buyer who taps "order" | App functionality | Yes | Required for sign-up |
| Contact info → Name | Display name | App functionality | Yes | Required |
| Location → Coarse location | Rounded to ~100 m; others see only a rounded distance | App functionality (nearby listings, community check) | Yes | Optional (needed to post) |
| User content → Photos | Listing photos (metadata stripped), visible to signed-in neighbors only | App functionality | Yes | Optional |
| User content → Other user content | Listing texts, ratings and comments, reports | App functionality | Yes | Optional |
| Identifiers → Device ID | Expo push token, only if notifications are allowed | App functionality (notifications) | Yes | Optional |
| Usage / other → Purchase-like history | Trades marked between users (no payments) | App functionality (XP, ratings) | Yes | Optional |

**Not collected:** payment info, precise location, contacts, browsing history, health, financial info, advertising IDs, diagnostics / crash data (none integrated yet; update this file if added).

## Shared with third parties

None for advertising or sale. Service providers that process data for us: Supabase (database, storage, auth; EU region), Expo (push delivery), the email provider that sends the sign-in code. On Google Play these count as "service providers" and are **not** declared as sharing.

## Google Play specifics

- Data deletion: in-app (Settings → מחיקת חשבון). Web deletion request: email in the privacy policy.
- Target audience: 18+.
- Account creation: email + one-time code.
