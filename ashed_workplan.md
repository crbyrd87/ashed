# Ashed — Work Plan

**For Claude Code.** Read this file, then work through it one session at a time.
Detail for every item lives in `ashed-findings.md` — this file is the order.

---

## Rules for this plan

1. **One session at a time.** Do not start the next session until the person
   running this says to. Sessions are ordered by dependency, not preference.
2. **Stop at every STOP.** Report what changed, what to test, and wait.
3. **Always run `npm run build` before saying a session is done.** Vercel builds
   with `CI=true`, so any ESLint warning — an unused variable, a missing hook
   dependency — fails the deploy. A session is not finished until the build is
   clean.
4. **Never batch sessions.** Sessions 9 and 10 in particular touch every file in
   the app. Combining them with anything else makes the change unreviewable.
5. **Mark work done.** When a session is complete, update the Status column in
   `ashed-findings.md` from OPEN to FIXED for the items covered, and tick the
   session box in this file.
6. **The person you are working with is not a programmer.** Explain what you are
   about to change in plain terms before changing it. Say what could break. Say
   what to test. Do not assume a fix worked.
7. **If a finding turns out to be wrong, say so.** Several items in the findings
   document were corrected once the code was actually read. Do not implement
   something that does not match what you find — report the mismatch instead.

---

# Phase A · Correctness

Small, contained, individually verifiable. Do these first — they are real bugs
users would hit, and they build confidence in the workflow before the large
refactors in Phase D.

### ☑ Session 1 — Badges are never awarded — DONE 27 Aug 2026

**The single highest-value fix in this document.**

- Findings: `12-A`, `12-B`, `11-D`
- `CheckIn.js` contains no reference to `badgeEngine`, and `App.js` only calls
  `checkAndAwardBadges` from `processReferral`. The `"checkin"` trigger is never
  fired, so 12 of 18 badges cannot be earned by anyone.
- Add the call on the check-in save path. Decide whether it belongs in
  `CheckIn.js` after a successful save, or in `App.js`'s `onSaved` — say which
  you chose and why. It must run after both the `checkins` and `ratings` inserts
  succeed, and must not block or delay the success UI.
- Then fix `11-D`: the 🏅 Aficionado pip in the Me tab header is hardcoded and
  shows for everyone. Drive it from real badge data, or remove it.

**Verify:** log a smoke. With 12 check-ins already recorded, Aficionado
(threshold 10) and Founding Member should both be awarded, with notifications.

**Commit:** `Fix: award badges on check-in, remove hardcoded profile badge`

**STOP.**

---

### ☐ Session 2 — Dates are wrong

- Findings: `11-A`, `11-B`
- Two separate bugs that must be fixed together, or one masks the other.
- **Display:** `new Date("2026-08-27")` parses as midnight UTC, then renders in
  local time — one day earlier for every user west of UTC. Fix everywhere
  `smoke_date` is rendered: Journal, Feed, FeedModal, Friends profile.
- **Save:** `CheckIn.js` seeds `smokeDate` from
  `new Date().toISOString().split("T")[0]`, which is the UTC date. After 8pm
  Eastern that is tomorrow.
- Consider a single shared date helper rather than fixing each call site.

**Verify:** log a smoke and confirm the date shown matches the date chosen. Test
after 8pm Eastern if possible, or temporarily set the device clock.

**Commit:** `Fix: date off-by-one on display and UTC date on save`

**STOP.**

---

### ☐ Session 3 — Privacy setting is ignored

- Finding: `11-C`
- Settings writes `users.default_private_checkins` and promises "New check-ins
  will be private". `CheckIn.js` hardcodes `useState(false)` and never reads it.
- Read the setting and use it as the initial value. The user must still be able
  to override it per check-in.

**Verify:** turn the setting on, log a smoke, confirm it saves as private.

**Commit:** `Fix: honour default private check-ins setting`

**STOP.**

---

### ☐ Session 4 — Recommendations copy and content

Three small edits to one file.

- Findings: `7-A`, `7-C`, `7-D`
- `7-A` — both prompts ask the AI to explain why a cigar matches "their taste
  profile". Change to second person so results read "you enjoyed…".
- `7-C` — `FLAVOR_OPTIONS` has 14 entries; `CheckIn.js`'s `FLAVOR_TAG_NAMES` has
  18. Missing: Wood, Hay, Grass, Mineral. Make both use one shared constant.
- `7-D` — the results header keys off `hasEnoughData`, so survey results are
  labelled "BASED ON YOUR 8 LOGGED CIGARS". Key it off the active mode and state
  the real basis, e.g. "Based on your preferences: Medium-Full, Full · Coffee,
  Chocolate, Pepper".

**Verify:** run both auto and survey modes; check the header is accurate in each.

**Commit:** `Fix: Recommendations wording, shared flavour list, accurate header`

**STOP.**

---

### ☐ Session 5 — Venues

- Findings: `9-C`, `9-A`
- `9-C` — the map popup's "View details" selects the right venue and switches to
  list view but does not scroll to it. Add a ref and `scrollIntoView`.
- `9-A` — `doSearch` wraps geocoding and the shop search in one try/catch, so
  every failure produces "Couldn't find results for X. Try a different city or
  zip." That advice is wrong for a network failure or a cold start. Separate the
  two failures, give distinct messages, and offer a Try again action.

**Verify:** tap a far-down venue from the map and confirm it scrolls into view.

**Commit:** `Fix: scroll to selected venue, distinguish search failures`

**STOP.**

---

### ☐ Session 6 — Notifications

- Findings: `10-A`, `10-B`, `10-C`
- `10-A` — notifications accumulate with no way to clear them. **Ask first**
  whether they should auto-expire (30 days is typical) or need manual clearing.
  Do not choose unilaterally.
- `10-B` — badge and friend_accepted rows look tappable but do nothing. Badge
  rows should open the Badges tab; friend_accepted should open that profile.
- `10-C` — `markAllRead` runs after `setNotifications`, so unread dots persist
  for the session. Update local state too.

**Verify:** open notifications, close, reopen — dots should be gone. Tap a badge
notification and confirm it goes somewhere.

**Commit:** `Fix: notification clearing, tap targets, unread state`

**STOP.**

---

# Phase B · Security

Do before any real users. Independent of everything else — could be done first
if launch timing demands it.

### ☐ Session 7 — Close the API holes

- Findings: `CR-5`, `CR-6`, `CR-7`
- `CR-5` — `/api/anthropic` reads `user_id` from the request body with no JWT
  verification, so the premium gate and rate limits are bypassable. Verify the
  Supabase bearer token and derive `user_id` server-side.
- `CR-6` — `/api/places` is fully open with `Access-Control-Allow-Origin: *` on
  a billed Google key. Require auth, add rate limiting.
- `CR-7` — `/api/db-refresh` has no auth at all. Check a `CRON_SECRET`
  environment variable.
- Env vars are set in Vercel, not in the repo.

**Verify:** the app still works signed in. Calling the endpoints directly without
a token should now fail.

**Commit:** `Security: verify auth on all API endpoints`

**STOP.**

---

# Phase C · Repo hygiene

Do before Phase D. These reduce the surface the design system work has to cover.

### ☐ Session 8 — Clean the repo

- Findings: rec `53`, `54`, `55`, `4`, `CR-16`, `CR-17`
- Delete `project files/Chat 1.3/` and `project files/Chat 1.4/` — outdated forks
  of nearly every component. These have already caused a wrong-version incident.
- Delete `src/App.css` — unmodified CRA boilerplate, imported by nothing.
- Delete `src/App.test.js` — boilerplate that always fails.
- Fix `public/manifest.json` — still says "React App" / "Create React App
  Sample". Should be Ashed, theme colour `#1a0f08`.
- If `build/` is committed, untrack it and add to `.gitignore`.
- Replace the CRA `README.md`: what Ashed is, how to run it, the Supabase tables
  it expects, the env vars `/api` needs.

**Verify:** `npm run build` succeeds and the app still runs.

**Commit:** `Chore: remove stale forks and boilerplate, add real README`

**STOP.**

---

# Phase D · Design system

**Read Part 4 of `ashed-findings.md` before starting.** The design review's token
block is out of date and would undo a rename that shipped in Week 32.

These sessions touch every file in the app. Do not combine them with anything.

### ☐ Session 9 — Tokens

- Findings: recs `1`, `2`
- Create `src/theme.js` with colour, type, spacing, radius and strength tokens.
- **The strength scale is `Mild | Mild-Medium | Medium | Medium-Full | Full`.**
  The review still says `Light` with four tiers. Do not use its version.
  Colours: Mild `#a8c5a0`, Mild-Medium `#b8d4a0`, Medium `#d4b483`,
  Medium-Full `#c4894a`, Full `#a0522d`.
- The review's palette also misses ten load-bearing values — the whole Partner
  Dashboard identity (`#7a8a9a`, `#5a6a7a`, `#a0b0c0`) plus `#e8632a`,
  `#a08060`, `#ddc9a8`, `#d4b45a`, `#a07830`, `#9a7a9a`, `#1e1208`, `#2d1810`.
  Audit the actual files rather than trusting the list.
- Collapse the duplicates: eight muted browns for one role, and a gold split
  between `#c9a84c` and `#d4b45a` — standardise on `#c9a84c`.
- Then migrate files to the tokens. **Do this in batches of three or four files
  and stop between batches**, so the diffs stay reviewable.

**Verify:** the app looks identical. This session should change no pixels.

**Commit:** one per batch, e.g. `Refactor: move Feed, FeedModal, Badges to theme tokens`

**STOP between every batch.**

---

### ☐ Session 10 — Shared components

- Finding: rec `3`
- Extract into `src/ui/`: `Button`, `Sheet`, `Pill`/`Badge`, `Toggle`, `Toast`,
  `SectionLabel`, `EmptyState`.
- Evidence: the `×` close button is byte-identical in three files; five
  near-identical pill styles across three files; the bottom sheet appears eight
  times; `CheckIn` and `Settings` have two different toggle implementations.
- Also rec `27` — five different overlay centring approaches, including
  `UserProfileModal` at `maxWidth: 480` while everything else uses 420. Settle on
  one inside `Sheet`.

**Verify:** every screen still opens and closes correctly.

**STOP between batches.**

---

### ☐ Session 11 — Type and contrast

- Findings: recs `5`, `6`, `8`, `9`, `17`, `29`
- **Order matters.** Do `6`, `17` and `29` first — thin the Feed row — then apply
  the 13px floor. The Feed row carries 13 elements in ~70px; raising type first
  will break it.
- `6` — cigar name is 13px while vitola and strength below it are 14px/700.
  Invert.
- `9` — `#5a4535` on `#1a0f08` is about 2:1 and carries loading text, timestamps
  and legal copy. Lighten the muted ramp two steps.
- `8` — one `SectionLabel` treatment everywhere. Also fixes `9-E` and `12-E`.

**Verify:** nothing is unreadable, nothing overflows its row.

**STOP between batches.**

---

### ☐ Session 12 — Tap targets and real buttons

- Findings: recs `10`, `11`, `12`, `63`, and `9-D`
- **Build to 48px, not 44.** One value satisfies both Apple and Android.
- Convert clickable `div`s to real `<button>`s in Badges, Humidor, BandScanner,
  Venues, CheckIn, Feed, Notifications and App.js. Add `aria-label` to icon-only
  controls.
- This is also the prerequisite for Android's back button working later.

**Verify:** every control still works, and is reachable by keyboard.

**STOP between batches.**

---

# Phase E · Data model

### ☐ Session 13 — Catalog matching

- Tracker `30-26` … `30-30`, findings `CR-10`, `7-E`
- Build one shared helper (`src/cigarMatch.js`) that normalises brand, line and
  vitola before comparing — lowercase, strip accents (Padrón/Padron), collapse
  whitespace, strip punctuation (No. 9 / No 9). Returns exact vitola match, line
  match, or no match.
- Replace `.eq(brand).eq(line).maybeSingle()` everywhere. That pattern errors
  whenever a line has multiple vitolas — which is most of them — and is silently
  creating duplicate catalog rows on every scan.
- Audit `cigars` for duplicates already created this way and merge them.
- Wire Recommendations to the helper so results link to real catalog entries.
- Unmatched recommendations go to `missing_cigars` for admin review —
  **never auto-insert into `cigars`** (decision DEC-3).
- Add `cigar_strength` text to `wishlist` and `humidor` as the fallback for
  unmatched items (`7-E`).

**Verify:** scan a cigar from a multi-size line twice — no duplicate row should
appear in `cigars`.

**STOP.**

---

# Needs a decision before it can be built

Do not start these without an answer.

| Item | Question |
|------|----------|
| `10-A` | Should notifications auto-expire, or only clear manually? |
| `10-D` | Should Notifications move out of the Me tab to a top-level position? |
| `11-I` | What should the username field say instead of "Cannot be changed"? |
| `DEC-1` | Should the `fires` table be renamed to `likes`, or keep the internal name and change only the UI? |
| `FR-1` | Photo storage: private bucket with signed URLs, or public? Max file size? What happens to photos when a check-in is deleted? |
| rec `22` | The paywall promises a free trial that does not exist. Relabel as a waitlist now, or wait for billing? |
| rec `40` | Account deletion only sets a flag. Implement real deletion, or change the copy? |

---

# For Claude Design, not Claude Code

Do these **after** Session 9, so alternatives are built from tokens.

| Item | Brief |
|------|-------|
| `FR-2` | Me tab header composition; where Friends and Notifications belong; Settings visual treatment (too many transparent outline buttons); Help & Support layout (`11-G`) |
| `12-D`, `12-F` | Badges as single-column rows rather than a 2×2 grid; a better progress bar |
| rec `7`, `69` | Choose a display typeface and bundle it rather than loading from a CDN |
| rec `13`, `68` | Icon set to replace emoji. Note: badge icons come from the `badges.icon` database column, not code |
| rec `23`, `24` | Simplify paywall pricing; cut onboarding from 10 screens to 3 |

---

# Deferred — native only

Not buildable until the React Native app exists (tracker Week 31).

`9-B` device permission prompt · `11-J` haptics · recs `57`–`76` except where
already covered above.

---

# Not doing

| Item | Why |
|------|-----|
| rec `14` | Make the 👍 a flame — **reversed by DEC-1.** Product language is Likes now. Do not reinstate. |
| rec `50` | The dead branches it describes do not exist in the current tree. |
| rec `71` | The 16px input workaround still earns its keep while web is the product. |
| rec `34` | Venues map on the empty state — needs plumbing that does not exist, and Leaflet may be replaced (rec 73). |
