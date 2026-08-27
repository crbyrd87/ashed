# Ashed

Cigar journal and community app. React PWA, currently pre-launch (alpha, v0.9.2).

## Commands

- `npm start` — dev server at localhost:3000
- `npm run build` — production build. **Run this before every push.**
- `git add . && git commit -m "msg" && git push origin master` — deploys to Vercel automatically

## Critical build rule

Vercel builds with `CI=true`, which turns **every ESLint warning into a build failure**.
An unused variable or a missing hook dependency will fail the deploy.
Always run `npm run build` locally and fix all warnings before pushing.

## Stack

React 19.2.4 on Create React App (react-scripts 5.0.1), Node 24.x.
Supabase for auth and database. Vercel serverless functions in `/api`.
leaflet + react-leaflet for maps. posthog-js for analytics.

No CSS framework, no icon library, no chart library, no router.

## How routing works

There is no router. Two path checks:

- `src/index.js` renders `<Tracker />` when the path is `/tracker`, otherwise `<App />`
- `src/Auth.js` shows the marketing "Coming Soon" page unless the path is `/login`

Everything else is state, not URLs. `App.js` switches screens with a `tab` state
variable, and overlays are boolean state (`showSettings`, `showFriends`, …).
This matters: there is no browser history, so Android's back button will not
close overlays. That is a known gap for the native build.

## Styling

Every component uses **inline style objects**. There is no stylesheet in use —
`App.css` is unmodified Create React App boilerplate and is imported by nothing.

Each file redeclares:
```js
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
```

Palette (dark theme only):
- Background `#1a0f08` · cards `#221508` / `#2a1a0e` · borders `#3a2510` / `#4a3520`
- Gold `#c9a84c` (some older files use `#d4b45a` — prefer `#c9a84c`)
- Text `#e8d5b7` · headings `#f5ead8` · muted `#8a7055`
- Green CTA `#4caf6e` · danger `#a0522d`
- Flame gradient `#cc2200` → `#ff6600` → `#ffcc00`

Inputs are `fontSize: 16` deliberately — anything smaller makes iOS Safari zoom on focus.
Overlays cap at `maxWidth: 420`.

**Known debt:** these values are hardcoded in ~20 files. Consolidating them into
`src/theme.js` is the next major piece of work and everything else in the design
review depends on it.

## Strength scale

Five levels, renamed from four in Aug 2026 (`Light` → `Mild`, `Mild-Medium` added):

```
Mild | Mild-Medium | Medium | Medium-Full | Full
```

Colors: Mild `#a8c5a0`, Mild-Medium `#b8d4a0`, Medium `#d4b483`,
Medium-Full `#c4894a`, Full `#a0522d`.

Any code or AI prompt still referencing `Light` is stale and is a bug.

## API layer

All three are Vercel serverless functions in `/api`, keys stay server-side.

- **`/api/anthropic`** — proxy for all AI calls. Requires `user_id` and `feature`
  in the body or returns 403. Enforces premium check on opus models and
  per-feature hourly rate limits (`band_scanner` 15, `recommendations` 5,
  `pairings` 5, `tasting_notes` 10) against the `api_usage` table.
- **`/api/places`** — Google Places proxy. Actions: `geocode`, `search`,
  `autocomplete`, `details`.
- **`/api/db-refresh`** — monthly cron (1st, 09:00 UTC). Scrapes new releases,
  writes candidates to `db_refresh_candidates` for admin review.

Models: band scanner uses `claude-opus-4-6`. Everything else uses
`claude-haiku-4-5-20251001`.

Env vars (set in Vercel): `ANTHROPIC_KEY`, `GOOGLE_PLACES_KEY`, `SUPABASE_URL`,
`SUPABASE_SERVICE_KEY`.

**Known security gaps — unfixed:** all three endpoints trust the client.
`/api/anthropic` reads `user_id` from the request body without verifying the
Supabase JWT, so the premium gate and rate limits are bypassable. `/api/places`
is fully open with `Access-Control-Allow-Origin: *` on a billed Google key.
`/api/db-refresh` has no auth at all. Fix before real users.

## Database

Supabase Postgres, 23 tables, RLS enabled on all of them.

Core: `users`, `cigars`, `checkins`, `ratings`, `humidor`, `wishlist`, `places`
Social: `friends`, `fires`, `comments`, `notifications`, `badges`, `user_badges`, `referrals`
Ops: `reports`, `announcements`, `missing_cigars`, `api_usage`, `feedback`,
`db_refresh_candidates`, `audit_log`, `pairings`, `tracker_progress`

Notes that trip people up:
- `cigars` stores **one row per vitola**, not per line. A brand + line lookup
  returns many rows — `.maybeSingle()` on brand+line will error. This is the
  cause of duplicate cigar records created by the band scanner.
- `checkins.rating` and `ratings.score` both store a **0–10** value.
  The UI shows 1–5 flames and divides by 2.
- `users` has `member_since`, **not** `created_at`.
- `users.referred_by` is `text` with no foreign key, but the app writes a uuid.

## Where things live

`src/App.js` is large and holds the search screen, profile, journal, filters,
stats, and **the entire Wishlist tab** — there is no `Wishlist.js`.

Screens: `CheckIn.js`, `Humidor.js`, `BandScanner.js`, `Feed.js`, `FeedModal.js`,
`Friends.js`, `Badges.js`, `Venues.js`, `Recommendations.js`, `Pairings.js`,
`Notifications.js`, `Settings.js`, `UserProfileModal.js`, `UpgradePrompt.js`,
`OnboardingTour.js`, `CigarSubmitModal.js`, `AdminConsole.js`, `PartnerDashboard.js`

Logic: `supabase.js`, `cigarAI.js`, `badgeEngine.js`, `notificationHelpers.js`, `sanitize.js`

`src/Tracker.js` is the admin project tracker at `/tracker`. Gated on being
signed in with `is_admin = true`. Progress saves to `tracker_progress`.

## Conventions

- Functional components with hooks. No class components.
- `refreshCount` state as a `useEffect` re-trigger is an established pattern here.
- Fix all ESLint warnings before every deploy (see build rule above).
- `AshendVersionTracker.jsx` at the repo root is the source for `src/Tracker.js`.
  Task definitions live there; completion state lives in the database.

## Working style

The project owner is not a programmer. When proposing changes:
- Explain what will change in plain terms before doing it
- Say what could break
- Prefer small, reviewable changes over large refactors
- Never assume a fix worked — say what to test
