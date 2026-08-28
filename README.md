# Ashed

A cigar journal and community app. Log what you smoke, rate it, build a humidor
and wishlist, find cigar lounges near you, and follow what friends are smoking.
Several features are AI-assisted: identifying a cigar from a photo of its band,
recommending cigars from your history, suggesting drink pairings, and drafting
tasting notes.

React PWA, currently pre-launch (alpha, v0.9.2). Live at
[ashed.app](https://ashed.app); the app itself is behind `/login` while a
"Coming Soon" page serves the root.

## Running it

Requires **Node 24.x** (`package.json` pins `engines.node` to `24.x`).

```bash
npm install
npm start          # dev server at localhost:3000
npm run build      # production build — run before every push
```

**Run `npm run build` before pushing.** Vercel builds with `CI=true`, which
turns every ESLint warning into a build failure. An unused variable or a
missing hook dependency will fail the deploy. To reproduce that strictness
locally:

```powershell
$env:CI = "true"; npm run build
```

### The `/api` routes do not run under `npm start`

`/api/anthropic`, `/api/places` and `/api/db-refresh` are Vercel serverless
functions. Create React App's dev server does not serve them — it returns
`index.html` for any unmatched path, so a call to `/api/...` comes back as HTML
and the calling code's `response.json()` throws. Every AI feature will appear
broken locally, showing its generic "Something went wrong" message.

To run the functions locally you need the Vercel CLI:

```bash
vercel link                # link to the existing project, do not create a new one
vercel env pull .env.local
vercel dev
```

Note that `vercel env pull` will **not** return variables stored as Vercel
*Secrets* — they arrive as the literal string `[SENSITIVE]`. Only
`GOOGLE_PLACES_KEY` is currently a plain config value. The alternative, and what
this project has used, is to test on a preview deployment: push a branch, and
Vercel builds it with the real Preview environment.

## Deploying

Pushing to `master` deploys to production automatically.

```bash
git add . && git commit -m "msg" && git push origin master
```

There is no staging database. **Local development already reads and writes the
production Supabase project**, because `src/supabase.js` hardcodes its URL and
publishable key. Only the serverless functions are absent locally.

## Environment variables

Set in the Vercel project, not in the repo. The `/api` functions read:

| Variable | Used by | Notes |
|---|---|---|
| `ANTHROPIC_KEY` | `/api/anthropic`, `/api/db-refresh` | Secret |
| `GOOGLE_PLACES_KEY` | `/api/places` | Billed key |
| `SUPABASE_URL` | all three | Not actually secret — it also ships in the browser bundle |
| `SUPABASE_SERVICE_KEY` | all three | **Bypasses Row Level Security.** Server-side only |
| `CRON_SECRET` | `/api/db-refresh` | Sent by Vercel Cron as a bearer token |

`RESEND_API_KEY` is also set on the project for transactional email.

## The API layer

All three endpoints verify a Supabase access token and derive the caller's
identity from it. `user_id` in a request body is ignored. Client code should
call them through `src/apiClient.js`, which attaches the session token.

- **`/api/anthropic`** — proxy for all AI calls. Requires a valid token and a
  known `feature`. Enforces a premium check on Opus models and per-feature
  hourly rate limits (`band_scanner` 15, `recommendations` 5, `pairings` 5,
  `tasting_notes` 10) against the `api_usage` table.
- **`/api/places`** — Google Places proxy. Actions: `geocode`, `search`,
  `autocomplete`, `details`. Requires a valid token. The expensive Text Search
  action is rate limited to 60/hour per user.
- **`/api/db-refresh`** — monthly cron (1st, 09:00 UTC). Scrapes new releases
  and writes candidates to `db_refresh_candidates` for admin review. Requires
  `CRON_SECRET` as a bearer token, so it cannot be triggered from a browser.

Models: the band scanner uses `claude-opus-4-6`; everything else uses
`claude-haiku-4-5-20251001`.

## Database

Supabase Postgres, 23 tables, RLS enabled on all of them.

**Core** — `users`, `cigars`, `checkins`, `ratings`, `humidor`, `wishlist`, `places`
**Social** — `friends`, `fires`, `comments`, `notifications`, `badges`, `user_badges`, `referrals`
**Ops** — `reports`, `announcements`, `missing_cigars`, `api_usage`, `feedback`, `db_refresh_candidates`, `audit_log`, `pairings`, `tracker_progress`

Three things that trip people up:

- `cigars` stores **one row per vitola**, not per line. A brand + line lookup
  returns many rows, so `.maybeSingle()` on brand + line will error.
- `checkins.rating` and `ratings.score` both store a **0–10** value. The UI
  shows five flames and halves it.
- `users` has `member_since`, **not** `created_at`.

## Where to look next

- **`CLAUDE.md`** — architecture, conventions, styling, and the gotchas above in
  more depth. Read this before changing anything.
- **`ashed_findings.md`** — every known defect and design recommendation, with
  status.
- **`ashed_workplan.md`** — the order those are being worked through.
- **`/tracker`** — the project tracker, in-app, admin only. Its task definitions
  are the `PLAN` array in `src/Tracker.js`.
