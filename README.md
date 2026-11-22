# Shuky · שוקי

![Shuky logo](docs/brand/logo-wordmark.png)

**מה שנאפה בשכונה שלך** – a hyperlocal marketplace for home-baked goods. Neighbors who bake at home
(cakes, cookies, pastries, breads, desserts) sell to neighbors who want to buy, with seller ratings and
levels front and center. Items are either ready now or baked to order (pre-order). Launch community:
Lehavim. The app is mobile-first (iOS / Android), and the whole UI is Hebrew, right-to-left.

> **Status: Phase 2.** Supabase backend: sign-in with an email code, profiles, location (rounded),
> listings with photos. Only free tools. Without a `.env` the app runs in **demo mode** on mock data.

![The 9 Phase 1 screens](docs/phase-1-screens.png)

## Running it

Requirements: Node 20+ and npm.

```bash
npm install
npm run web          # = npx expo start --web, opens http://localhost:8081
npm start            # Expo dev server for iOS / Android (Expo Go or a dev build)
```

| Script | What it does |
| --- | --- |
| `npm run web` | Dev server for the web build |
| `npm start` | Dev server (press `i` / `a` for simulators) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `expo lint` (ESLint, `eslint-config-expo`) |
| `npm run build:web` | Static web export to `dist/` |

### Demo mode vs live mode

- **Demo** (no `.env`): everything runs in memory on `src/data/mock.ts`. Any email and any 4-digit
  code work. Good for design work and quick previews in Expo Go.
- **Live** (`.env` with your Supabase project): sign-in with a 6-digit code sent by email, profiles,
  rounded distances and listings with photos, all from Supabase.

Sign-in uses a free email code instead of SMS. Sellers still need a phone number for WhatsApp orders,
so new users enter one on the name screen (it isn't verified).

## Supabase setup (live mode)

1. Create a project at [supabase.com](https://supabase.com) (region: Frankfurt is closest to Israel).
2. **SQL Editor** → run each file in `supabase/migrations/` **in order** (paste → **Run**):
   `20261121120000_init.sql`, then `20261122090000_email_auth.sql`. This creates the tables, the
   security rules (RLS), the feed / trade / delete-account functions and the `listing-photos` bucket.
3. **Email code** (free; the Email provider is on by default):
   **Authentication → Emails → Templates → Magic Link**: set the body to show the code, e.g.
   `<h2>הקוד שלך לשוקי</h2><p style="font-size:28px">{{ .Token }}</p>` and subject `הקוד שלך לשוקי`.
   Supabase's built-in mailer is limited to a few emails per hour, which is fine for testing. Before
   launch, connect a free SMTP service (e.g. Resend or Brevo free tiers) under
   **Authentication → Emails → SMTP Settings**.
4. **Project Settings → API**: copy the Project URL and the anon / publishable key into a `.env` file
   (see `.env.example`). Never use the `service_role` / secret key in the app.
5. Restart with a clean cache: `npx expo start --clear`.

The database tests in `supabase/tests` check the security rules against a local Postgres + PostGIS
(see `supabase/tests/run.sh`).

### RTL

- **Native:** `I18nManager.forceRTL(true)` at startup, plus `supportsRTL` / `forcesRTL` in `app.json`
  (via the `expo-localization` config plugin) so a dev build starts in RTL from the first launch.
  In Expo Go, the very first launch may need one reload before RTL applies.
- **Web:** react-native-web ignores `I18nManager`. `public/index.html` sets `<html dir="rtl" lang="he">`,
  and the app root (and modal roots) get `dir="rtl"` through `webDir()` in `src/lib/rtl.ts`.
- Layout uses logical sides only (`start` / `end`, `marginStart`, …), never `left` / `right`. The first
  child of a `row` is on the right.
- LTR snippets inside Hebrew text (phone numbers, `+20 XP`) are wrapped with `ltr()` (Unicode isolates).

## Project structure

```
src/
  app/                      Expo Router routes (every file is a screen)
    _layout.tsx             Root: fonts (Rubik), RTL, providers, stack
    index.tsx               Start: resumes the session, or goes to /welcome
    (onboarding)/           01 welcome · 02 email · 03 otp · name (new users) · 04 location
    (app)/                  Signed-in area (its _layout redirects to /welcome when signed out)
      (tabs)/               Bottom tabs: home (05) · search · saved · profile (08)
      product/[id].tsx      06 product page
      listing/new.tsx       07 add listing (modal)
      trade/[id].tsx        09 trade completed
      notifications.tsx     Notifications list
      settings.tsx          Settings
  components/               Design-system components (see below)
  theme/tokens.ts           Colors, radii, spacing, fonts, type scale
  data/                     Types, category config, mock data
  store/AppStore.tsx        App state: live (Supabase) or demo (mock) mode
  lib/supabase.ts           Supabase client (session kept in AsyncStorage)
  lib/api.ts                Live-mode calls: auth, profile, location, feed, listings, delete account
  lib/                      Also: format, whatsapp, levels/XP, rtl, navigation, confirm
supabase/
  migrations/               Database schema, RLS, functions, storage bucket
  tests/                    Security tests for the schema (local Postgres + PostGIS)
public/index.html           Web shell (RTL, cream background)
docs/                       Screenshots
```

### Routes

| URL | Screen |
| --- | --- |
| `/welcome` | 01 · פתיחה |
| `/email` | 02 · התחברות (email) |
| `/otp` | 03 · קוד אימות |
| `/name` | Name + WhatsApp number for new users (after the code) |
| `/location` | 04 · מיקום |
| `/home` | 05 · בית (פיד) |
| `/product/:id` | 06 · עמוד מוצר |
| `/listing/new` | 07 · הוספת מוצר (opened by the + button) |
| `/profile` | 08 · פרופיל ורמה |
| `/trade/:id` | 09 · עסקה הושלמה |
| `/search`, `/saved` | Search and saved tabs (built from the same components) |
| `/notifications` | Notifications (bell on the home screen) |
| `/settings` | Settings: profile, notification toggles, privacy, sign out, delete account |

### Design system

Logo: a home with a fresh cookie and a wisp of steam from the chimney (home-baked, from the
neighborhood). Source: `docs/brand/logo.svg`; app icons in `assets/` (iOS icon, Android adaptive
foreground / background / monochrome, splash, favicon).

Tokens live in `src/theme/tokens.ts` and mirror the Figma file: tomato (primary), leaf (freshness,
location, success), honey (baked goods, XP), cream background (never pure white), white cards,
1px `line` borders, radius 16–20, pill chips, no heavy shadows. Font: Rubik (400/500/600/700).

Components (`src/components`): `Button` (primary / secondary / leaf), `Chip`, `Input` (text or
select trigger), `ProductCard`, `BottomNav`, plus `AppText`, `IconButton`, `Pill`, `ProgressBar`,
`SegmentedControl`, `OtpInput`, `SellerCard`, `SearchField`, `CategoryChips`, `CategoryArt`,
`ProductGrid`, `SelectSheet`, `SectionHeader`, `EmptyState`, `StepHeader`, `Screen`, `WhatsAppIcon`.

Icons are [Lucide](https://lucide.dev) (`lucide-react-native`), the same line style as the Figma icons.

### Product model

- **Sales only.** Every listing has a price (no barter or giveaways).
- **Categories:** עוגות, עוגיות, מאפים, לחם וחלות, קינוחים (`src/data/categories.ts`).
- **Availability:** `ready` (baked on a given day) or `preorder` (baked to order, with a minimum notice:
  a day, two days, three days or a week).
- **Diet and kashrut tags:** כשר, פרווה, ללא גלוטן, טבעוני, ללא אגוזים.
- **Trust:** seller rating and level are shown on every card and on the product page.

### MVP rules and where they live

- **No in-app chat or payments.** Ordering goes through a WhatsApp deep link with a prefilled message
  (`src/lib/whatsapp.ts`, `wa.me`), and payment happens between the neighbors.
- **Distances are always rounded**, never an exact location. The phone rounds the position, the
  database snaps it to a ~100 m grid, no user can read another user's point, and the feed
  (`nearby_listings()`) returns only a distance rounded to 50 m. The app shows "350 מ׳ ממך".
- **XP is awarded only when both sides confirm a trade.** Enforced in the database by
  `confirm_trade()` (each side +20 XP, once). `src/lib/levels.ts` mirrors the level ladder. The app
  wires the confirmation flow in Phase 3; the trade-completed screen is still a demo preview.

## Roadmap

- **Phase 2 (done):** Supabase schema (`profiles`, `profile_locations`, `listings`, `trades`,
  `ratings`) with RLS, phone OTP auth, name step, location via `expo-location`, PostGIS feed with
  rounded distances, photo upload to Storage, delete account.
- **Phase 3:** in-app trade confirmation (both sides) and XP, ratings UI, saved items and
  notifications on the server, push notifications, editing / removing your own listings.
