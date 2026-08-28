# Ashed — Consolidated Findings

Single handoff document for Claude Code and Claude Design.
Assembled 27 Aug 2026 against app version 0.9.2.

## What's in here

| Part | Contents |
|------|----------|
| **1** | Walkthrough findings — screens #7–12, tested on device |
| **2** | Defects found during code review — not in the design review |
| **3** | All 76 Claude Design recommendations, each verified against the source |
| **4** | Where the design review is out of date — read before acting on it |

## How to read the verdicts

**Checked** is what the code actually showed when verified, not what the review
claimed. **Call** is whether to do it: DO, DEFER or SKIP. **Status** is OPEN
unless it was fixed on 25 Aug 2026.

## Priority, if you only read one thing

1. **12-A** — badges are never awarded for logging a smoke. Two thirds of the
   badge system is inert.
2. **11-A / 11-B** — every date displays a day early, and check-ins logged after
   8pm Eastern save tomorrow's date.
3. **CR-5, CR-6, CR-7** — all three API endpoints trust the client. Fix before
   real users.
4. **Recs 1–4** — the design system. A third of the design review depends on it
   existing, and it is the work least suited to copy-paste.

---

# Part 1 · Walkthrough findings


Running log from the mobile walkthrough. Screens #1–6 were completed in an
earlier session. This file starts at #7.

Status key: OPEN = not fixed · FIXED = shipped · WONTFIX = decided against

---

## #7 Recommendations — walked 25 Aug 2026

Tested against the fixes deployed that morning (strength scale, mode reset).
Both confirmed working: Back and Refresh now hold survey mode.

| ID | Finding | Type | Where | Status |
|----|---------|------|-------|--------|
| 7-A | AI reasons are written in third person — "earth and spice characteristics **they** enjoyed in Padron lines". Should address the user directly as "you". | Bug | `Recommendations.js` — the `"why"` line in both `buildAutoPrompt` and `buildSurveyPrompt` | FIXED 27 Aug — both prompts now require second person and forbid they/their |
| 7-B | Survey strength pills show no colour until selected, so the Mild→Full scale isn't readable at a glance. Consistent with the Wishlist and Humidor filters, so this is a deliberate pattern — but worth revisiting. Suggested: a small colour dot on each pill regardless of state. | Design | `Recommendations.js` — `s.strengthPill` | OPEN |
| 7-C | Survey offers 14 flavours; the check-in screen has 18. Missing: **Wood, Hay, Grass, Mineral**. Two separate lists that should be one shared constant. | Bug | `Recommendations.js` `FLAVOR_OPTIONS` vs `CheckIn.js` `FLAVOR_TAG_NAMES` | FIXED 27 Aug — both import `src/flavors.js`; the survey now offers all 18 |
| 7-D | Results header reads "BASED ON YOUR 8 LOGGED CIGARS" even for survey results, because it keys off `hasEnoughData` rather than the active mode. This is why Refresh feels untrustworthy — the code is correct, the label is lying. Should state the actual basis, e.g. "Based on your preferences: Medium-Full, Full · Coffee, Chocolate, Pepper". | Bug | `Recommendations.js` line ~286 | FIXED 27 Aug — header keys off the mode actually used and names the survey preferences |
| 7-E | Adding a recommendation to the wishlist loses its strength. The `wishlist` table has no strength column — strength normally comes from joining to `cigars`, and a recommendation isn't linked to the catalog. Same gap in `humidor`. | Bug | Schema + `App.js` `handleAddToWishlist` | OPEN |
| 7-F | Offline shows the generic "Something went wrong. Try again." rather than saying the connection is the problem. Small version of design rec #72. | Design | `Recommendations.js` catch branch | OPEN |

**Passed:** loads without hanging · returns 5 results with reasons · reasons are
genuinely taste-specific · does not recommend already-smoked cigars · strength
labels use the correct 5-tier scale · wishlist add works and appears in the
Wishlist tab · close button is an easy target.

### Notes on 7-E

This is the first visible symptom of the catalog-matching gap (tracker 30-28 /
30-29). An unmatched wishlist item is also invisible to community ratings and
will not feed `avg_rating` when smoked. Two-part fix:

1. Add `cigar_strength` text to `wishlist` and `humidor` as a fallback,
   matching how `cigar_brand` / `cigar_name` / `cigar_vitola` already work.
2. Once 30-28 lands, matched items get strength from the catalog link and the
   fallback is only needed for genuinely unknown cigars.

### Suggested batching

7-A, 7-C, 7-D are all small edits to one file — good first batch in Claude Code.
7-E needs a migration. 7-B and 7-F are design calls, not urgent.

---

## #8 Pairings — walked 25 Aug 2026

**No issues found.** All three fixes deployed that morning confirmed working:

- Cocktails section persists on second open (was vanishing — the column was missing)
- Bottom button reads "Done" instead of "Cancel"
- Tapping the backdrop closes the sheet

Also passed: all five sections render · seasonal selector works and changes the
suggestion · content is cigar-specific · caching works (instant on second open).

---

## Feature requests raised during the walkthrough

### FR-1 · Photo upload on check-in — wanted for launch

Users should be able to attach a photo of the cigar they smoked.

**Already in place:** `checkins.photo_url` (text, nullable) exists in the schema
and is currently unused. `ai_band_identified` and `voice_entry` booleans exist
alongside it, so this was anticipated in the original design.

**Still needed:**

1. **Storage** — a Supabase Storage bucket with RLS so users can only write to
   their own folder and only image types are accepted. Decide on a size cap and
   whether to compress client-side before upload (phone photos are 3–8 MB;
   uploading those raw over lounge wifi will feel broken).
2. **Upload UI in CheckIn.js** — camera or library, matching the pattern
   BandScanner already uses (`<label>` wrapping a hidden `<input type="file">`).
   Needs a preview, a remove option, and progress feedback.
3. **AI moderation before save** — check the image is a cigar photo and contains
   nothing pornographic, violent or otherwise inappropriate. Run it through
   `/api/anthropic` with a new `feature: "photo_moderation"` rate-limit entry.
   Reject with a clear message rather than failing silently. Note: moderation
   must run server-side — a client-side check is trivially bypassed.
4. **Display** — show the photo on the check-in card in Feed, FeedModal and the
   Journal. Affects the Feed row density problem in design rec #29.
5. **Moderation fallback** — the `reports` table currently only references
   `comments`. If photos are public, users need a way to report one, and admins
   need a queue. Extend `reports` or add a parallel path.

**Visibility — DECIDED:** the photo inherits the check-in's visibility. A private
check-in means a private photo.

**Caveat on that decision:** app-level visibility is not storage-level privacy.
The uploaded file lives at a URL, and if the bucket is public that URL works for
anyone who has it regardless of the check-in's setting. To make "private" true,
the bucket must be private with signed URLs generated per view, or protected by
storage RLS. Worth settling before the first photo is uploaded, because changing
it afterwards means migrating existing files.

**Open questions:** what happens to a photo when its check-in is deleted (orphaned
files accumulate and still cost storage)? Is there a storage ceiling worth capping
at the free tier?

**Cost note:** one vision call per photo check-in. Cheaper on Haiku than the
band scanner's Opus, but it scales with every check-in rather than with premium
users only.

---

## #9 Venues — walked 25 Aug 2026

Tested against that morning's fixes (removed serial detail prefetch, removed
console.logs, cleared stale detail cache on "use my location").

**Fixes confirmed:** phone numbers and hours still appear on tap (now fetched
lazily instead of 20 upfront) · hours are consistent between city search and
"use my location", so the stale-cache fix worked.

| ID | Finding | Type | Where | Status |
|----|---------|------|-------|--------|
| 9-A | First search of the session failed with *"Couldn't find results for Bradenton, FL, USA"*; an immediate retry worked. `doSearch` wraps geocoding and the shop search in one try/catch, so every failure — cold start, network blip, rate limit, genuine no-results — produces the same message telling the user to change their city. The advice is wrong for most of those cases. Most likely a Vercel cold start on `/api/places`. | Bug | `Venues.js` `doSearch` catch | FIXED 27 Aug — failures tagged network / service / not_found; only a genuine ZERO_RESULTS now advises changing the city, and retryable failures offer Try again |
| 9-B | Denied location permission gives correct instructions but the user has to fix it manually in device settings. Not fixable on web — browsers cannot open OS settings. Straightforward in the native app. | Native | `Venues.js` `requestLocation` | OPEN — native only |
| 9-C | Map popup "View details" selects the correct venue and switches to list view, but does not scroll to it. A venue far down the list is highlighted off-screen. Needs a ref + `scrollIntoView` on selection. | Bug | `Venues.js` map popup handler | FIXED 27 Aug — per-row refs plus a scrollIntoView effect once the list is showing |
| 9-D | List/Map segmented toggle is ~21px tall (`padding: "4px 12px"` on 11px text). Below Apple's 44pt and Android's 48dp minimums. Fine for the tester, likely not for older users. Part of design rec #10 / #63. | Design | `Venues.js` view toggle | OPEN |
| 9-E | "FIND A CIGAR SHOP" header is small, dim brown, wide letter-spacing — out of step with the Feed's "RECENT ACTIVITY" header, which was made gold and larger in Week 32. Part of the wider section-label inconsistency in design rec #8. | Design | `Venues.js` header | OPEN |

**Passed:** city/zip search with autocomplete · nearest-first sorting · star
rating, open/closed, distance · map pins and user location dot · Directions
opens the maps app · Call dials · gibberish search gives a sensible message.

**Not properly tested:** offline. Turning wifi off on a phone falls back to
mobile data — needs airplane mode to be a real test. Worth redoing given design
rec #72 (offline) is the largest functional gap for the mobile release.

**Not tested:** a location with genuinely zero cigar shops (different code path
from gibberish — the lookup succeeds and returns an empty list). Try Barrow or
Kotzebue, AK.

---

## #10 Notifications — walked 25 Aug 2026

| ID | Finding | Type | Where | Status |
|----|---------|------|-------|--------|
| 10-A | **No way to clear notifications.** They accumulate forever — no delete, no "clear all", no auto-expiry. The empty state exists in code but is unreachable once you have any history. An active user's list becomes unusable. | Bug | `Notifications.js` | FIXED 27 Aug — DECIDED: manual clearing, not auto-expiry. A Clear all control with an inline confirm sits in the header |
| 10-B | Badge notifications are not tappable and do nothing when tapped, but look identical to rows that are. Confirms the code review finding: every row gets `cursor: pointer`, only rows with a `checkin_id` act on it. Badge rows should open the Badges tab; friend_accepted should open that friend's profile. | Bug | `Notifications.js` `handleTap` / `TYPE_META` | FIXED 27 Aug — badge rows open the Badges tab, friend_accepted opens Friends, and the pointer cursor now appears only on rows that actually navigate. **Correction:** check-in rows were dead too — `onOpenCheckin` was never passed by `App.js`. **NOT YET OBSERVED WORKING:** the owner cleared their notifications before tapping one, so neither destination has been confirmed on a real row. Verify on the next badge award or friend acceptance |
| 10-C | Unread gold dots persist for the whole session and only clear when you leave and re-enter the screen. `markAllRead` runs after `setNotifications`, so the database is updated but local state is not. Self-correcting, but looks broken. | Bug | `Notifications.js` `loadNotifications` | FIXED 27 Aug — local state is updated after markAllRead, so the dots match the header count |
| 10-D | Notifications live inside the Me tab, so they are two taps from anywhere and invisible from the main screen. Convention in social apps is a top-level bell. The unread count already exists and is doing a top-level job from a buried location. | Design | `App.js` nav / Me tab header | OPEN — product decision |
| 10-E | Screen reads slightly dim overall — could be brightened a step. Overlaps design rec #9 (the muted brown ramp fails contrast). | Design | `Notifications.js` | OPEN |

**Passed:** existing notifications display with correct icons, labels and timing ·
unread rows are visually distinct (different background plus gold dot) · a real
feedback reply generated a working notification end to end · × is an easy target.

**Could not test — needs a second account:** fire and comment notifications. The
app correctly does not notify you about your own actions, so a self-comment
produces nothing. Also blocks testing tap-through to a check-in.

**Could not test:** empty state (unreachable, see 10-A) and list scrolling (not
enough notifications).

**Open question from this screen:** should notifications expire? If not, 10-A
needs manual clearing. If yes, decide the window — 30 days is typical — and
whether it is a scheduled job or a filter on read.

---

## #11 Settings / Me tab — walked 27 Aug 2026

**Fixes confirmed:** Privacy section loads without hanging · guide accordions
open and close correctly · toggles animate smoothly (all three were this
morning's Settings fixes).

| ID | Finding | Type | Where | Status |
|----|---------|------|-------|--------|
| 11-A | **Dates display one day early.** `smoke_date` is a date-only column. `new Date("2026-08-27")` parses as midnight **UTC**, then `toLocaleDateString` renders it in the user's zone — 8pm on the 26th in America/New_York. Storage is correct; display is wrong for every user west of UTC. Affects Journal, Feed, FeedModal and Friends profiles. Fix: parse as local (split the string, or append `T00:00:00`). | Bug | everywhere `new Date(c.smoke_date)` is rendered | FIXED 27 Aug — `src/dateUtils.js` parses date-only strings as local. **Correction:** Feed.js was listed but never renders `smoke_date`; it shows relative time from `created_at`, a full timestamp, which was never affected |
| 11-B | **Check-ins save the wrong date after 8pm ET.** `CheckIn.js` seeds `smokeDate` with `new Date().toISOString().split("T")[0]`, which is the **UTC** date. Between 8pm and midnight Eastern that is tomorrow. Not yet visible because it currently coincides. Must be fixed together with 11-A or one will mask the other. | Bug | `CheckIn.js` `smokeDate` initial state | FIXED 27 Aug — seeded from `todayLocalISO()` instead of the UTC date |
| 11-C | **"Default check-ins private" has no effect.** Toggle saves and persists, but a new check-in still saves as public. `CheckIn.js` hardcodes `useState(false)` for `isPrivate` and never reads `users.default_private_checkins`. Confirms the code review finding — a privacy promise the app does not keep. | Bug | `CheckIn.js` ↔ `Settings.js` | FIXED 27 Aug — CheckIn seeds the toggle from `users.default_private_checkins`; a ref guards the per-check-in override against the async load |
| 11-D | **🏅 Aficionado pip is hardcoded** on the Me header — renders for every user regardless of badges earned. Invisible to the tester because they legitimately hold it. Same defect as design rec #42 on the Friends profile. | Bug | `App.js` Me tab header | FIXED 27 Aug — hardcoded Aficionado pip replaced with earned badges |
| 11-E | Changing email reports "a user with that email exists" even after deleting the row from `public.users`. Correct behaviour: Supabase stores credentials in `auth.users`, which is separate and not visible in the table editor. Deleting the profile row leaves an orphaned login. Same root cause as account deletion not deleting. **Cleanup needed:** the orphaned auth user from this test. | Not a bug — needs cleanup | Supabase `auth.users` | OPEN |
| 11-F | Password reset email has light text on a light background — barely readable. Fixed in Supabase (Auth → Email Templates), not in app code. First email a new user receives, so worth doing. | Design | Supabase email template | OPEN |
| 11-G | **Help & Support requires heavy scrolling.** Order is bug/feedback buttons → text box → past submissions → help links. Requested: make Bug Report, Feedback, Replay Tour, Contact, Privacy and ToS all top-level buttons that expand on tap, so every option is visible on the first screen. The text box should appear only after choosing bug or feedback. | Design | `Settings.js` `HelpSection` | OPEN |
| 11-H | Settings UI has too many transparent/outline buttons — reads flat and low-contrast against the recent bolder, gold-forward direction. | Design | `Settings.js` | OPEN |
| 11-I | Username "Cannot be changed" still gives no reason. Confirmed design rec #41 — decision needed on what the explanation should say and whether support can change it. | Design | `Settings.js` | OPEN |
| 11-J | Suggested: a light haptic tick when toggles flip. Matches design rec #76. Native only. | Design | native | OPEN — native only |

**Passed:** display name change persists · password reset email arrives ·
private profile toggle persists · Cigar Guide sections all work · bug report and
feedback submit, appear in history, and replies come back · Replay Tour works ·
account deletion is properly gated behind typing DELETE · three stat boxes and
four sub-tabs all load · Premium pip correctly conditional.

---

### FR-2 · Me tab and Settings layout review — for Claude Design

The Me tab header (name, handle, avatar, badge pips) and the placement of the
Friends and Notifications buttons inside it are not working. Related to 10-D,
which questions whether Notifications belongs in Me at all.

**Ask Claude Design for alternatives on:**
- The Me header composition — avatar, name, handle, member-since, badge pips
- Where Friends and Notifications belong: in Me, in the top bar, or in the nav
- Settings visual treatment — currently too many transparent outline buttons
- The Help & Support layout from 11-G

**Partially addressed 27 Aug 2026.** The header was one flex row holding the
avatar, name block, Friends button and bell. After the 64px avatar, three 16px
gaps and both buttons, the name column was about 130px on a 420px screen —
narrower than the handle line needs — so the badge pip wrapped onto a second
line on mobile. Split into two rows: identity (avatar, name, handle, member
since) on top with nothing competing for width, badges and both quick actions
below. This is a layout fix, not the composition review; it needed no tokens,
so it did not wait for Session 9.

**Owner's verdict on the interim fix, 27 Aug:** the wrapping is resolved and the
two rows work, but they are still not satisfied with the overall composition.
Treat the current header as a holding position, not a solution — the brief below
stands in full.

**Still open for Claude Design:** whether Friends and Notifications belong in
this header at all (see 10-D), the avatar treatment, and the Settings and Help
layouts.

Do this **after** the design system (recs 1–4) exists, so alternatives are built
from tokens rather than more hardcoded values.

---

### FR-3 · Let the user choose which badge their profile wears

Raised 27 Aug 2026, immediately after the Session 1 badge fix went in.

The first check-in to fire the restored `"checkin"` trigger awarded four badges
at once — Aficionado, Founding Member, Vitola Variety and Regular — and the Me
header displayed **Regular**, the least impressive of the four.

**Root cause of that specific symptom (fixed 27 Aug):** the header sorted earned
badges by `awarded_at` descending. Badges awarded by a single check-in share an
identical timestamp, so the sort tied and fell through to the `(category, name)`
order returned by `fetchUserBadges`. "Most recent" is meaningless whenever
several badges land together, which is the normal case. Replaced with an
explicit `BADGE_DISPLAY_ORDER` in `badgeEngine.js`, hardest-won first.

**Still wanted:** a deliberate user choice, rather than the app deciding.

1. **Schema** — add `users.display_badge_key` (text, nullable). Run as SQL in
   the Supabase editor; there is no migration tooling in this repo.
2. **UI** — the Badges tab is the natural home, since the badges are already
   there. Tapping an earned badge offers "Show on my profile". Locked badges are
   not selectable, and there must be a way back to showing none.
3. **Read path** — the header uses the chosen badge when it is set *and* still
   earned, otherwise falls back to `BADGE_DISPLAY_ORDER`. The fallback stays
   regardless; most users will never open the picker.
4. **Do this with rec `42`.** `Friends.js` line 66 hardcodes the same
   `🏅 Aficionado` on friend profiles. A badge the user has deliberately chosen
   is what friends should see too, so building the picker and fixing rec 42
   separately would mean touching the same surface twice.

### 12-H · Band Scanner opened inline instead of as an overlay

Found 28 Aug 2026 while testing the security branch, and pre-existing on
`master` — unrelated to that work.

`BandScanner`'s root element was
`<div style={{ background: "#1a0f08", minHeight: "100%" }}>` with no
`position: fixed`, and `App.js` renders `<BandScanner />` with no wrapping
overlay. The scanner therefore laid out in normal page flow and appeared as a
scrollable panel *below* whatever was already on screen, rather than covering
it. Every other full-screen surface — `CheckIn.js` for instance — uses
`position: fixed, inset: 0, zIndex: 300`.

This contradicts the file history in `Tracker.js`, which records for
BandScanner v1.5: "Week 32: Full UI redesign. Wrapped in fixed overlay
(App.js)." No such wrapper exists in `App.js`, so either it was lost or the
note was aspirational.

**FIXED 28 Aug 2026** — the root now uses the same overlay treatment as
`CheckIn.js`.

---

## #12 Badges — walked 27 Aug 2026

**Fix confirmed:** all 18 seeded badges render in four categories with icons,
names and descriptions. Progress bar reads 2/18 and is proportional.

| ID | Finding | Type | Where | Status |
|----|---------|------|-------|--------|
| 12-A | **Badges are never awarded for logging a smoke.** `CheckIn.js` contains no reference to `badgeEngine` at all, and `App.js` only calls `checkAndAwardBadges` from `processReferral` with trigger `"referral"`. The `"checkin"` trigger — which drives `checkMilestoneBadges`, `checkVarietyBadges`, `checkFoundingMember` and `checkRegularBadge` — is **never fired from anywhere**. That is 12 of 18 badges that cannot be earned. Confirmed live: 12 check-ins logged, Aficionado (threshold 10) still locked. The two badges held were awarded by older code (First Ash, April) and via the referral path (Ambassador), which works. **This is also why the badgeEngine `member_since` fix appeared not to work — the fix was correct, nothing was calling it.** | Bug — high | `CheckIn.js` `handleSave`, or `App.js` `onSaved` | FIXED 27 Aug — `checkAndAwardBadges(user.id, "checkin")` now fires in `CheckIn.js` `handleSave` after both inserts succeed |
| 12-B | Me tab shows the 🏅 Aficionado pip while the Badges list shows Aficionado as locked — the two disagree on screen. Root cause is 11-D (the pip is hardcoded) compounded by 12-A. Fixing 12-A alone would hide this by making the pip accidentally correct. Both need fixing. | Bug | `App.js` Me header | FIXED 27 Aug — pips now render from real `user_badges` data |
| 12-C | Badge descriptions use "fires" — superseded, see DEC-1. Affects the `badges.icon`/`description` rows seeded 25 Aug, notification copy, and the `fires` table name. | Copy | `badges` table, `notificationHelpers.js` | OPEN |
| 12-D | Badges render as a 2×2 grid of small boxes; text is cramped and the "🔒 Locked" label is 9px — the smallest text in the app. Suggested: single-column rows with a larger icon and readable text. For Claude Design. | Design | `Badges.js` | OPEN |
| 12-E | "BADGES & ACHIEVEMENTS" header is small and low-contrast against the background. Same problem as 9-E — the section-label inconsistency in design rec #8. | Design | `Badges.js` | OPEN |
| 12-F | Progress bar works but is visually plain — wants a design pass. | Design | `Badges.js` | OPEN |
| 12-G | General: too much of this screen is dim and small. Overlaps design recs #5 (13px floor) and #9 (contrast). | Design | `Badges.js` | OPEN |

**Passed:** 18 badges in 4 correct categories · icons, names and descriptions all
render · earned vs locked visually distinct · progress bar proportional and
accurate · category headers collapse and expand.

---

### CR-19 · UserProfileModal is built but never rendered

Found 28 Aug 2026 while migrating it to theme tokens.

`src/UserProfileModal.js` is a complete 155-line component that nothing
imports. Searching `src/` finds it only in prose inside `Tracker.js`. It has
never been mounted, so the profile view it implements has never been reachable.

The visible symptom: tapping a person's handle or avatar in the Feed opens the
comments sheet rather than their profile. That is not a bug in the Feed — the
whole row is a single tap target (`Feed.js` line 174) and there is no separate
handler on the avatar or handle. Nothing is broken; the feature was never wired.

Related to 10-B, where notification rows for `friend_accepted` currently open
the Friends list rather than the specific person's profile, for the same
underlying reason: `App.js` has no profile-modal plumbing at all.

**Three ways out, needs a decision:**

1. **Wire it.** Give the avatar and handle their own tap target with
   `stopPropagation`, so the row still opens comments and the person opens
   their profile. This also gives 10-B somewhere to send `friend_accepted`.
2. **Use `FriendProfile` instead.** `Friends.js` already contains a working,
   richer profile view. Two components doing one job is the deeper problem;
   design rec 42 also flags `FriendProfile` for its hardcoded badges.
3. **Delete it.** If `FriendProfile` is the real one, this is dead weight that
   still has to be maintained through every design change — it already carries
   its own `BADGE_ICONS` map, which CR-14 flags as one of three disagreeing
   sources of badge icons.

### CR-20 · Signing up with an existing email looks like success

Investigated 28 Aug 2026. **This entry replaces an earlier version that was
wrong on three counts; the corrections are recorded below because the wrong
version was committed.**

**What actually happens.** Signing up with an address that already has an
account returns success from Supabase without creating anything and without
sending any email. That is deliberate on Supabase's part — it stops people
probing which addresses are registered. `Auth.js` then shows "Account created!
Check your email to confirm your account", because it inspects only `error`,
which is null. The person believes they made an account, waits for an email
that will never arrive, and may then find they can log in anyway with their
old password — which reads as the app being broken.

Real users will hit this. It is the single most likely thing to happen when
someone forgets they already signed up.

**The fix.** `supabase.auth.signUp` returns a user whose `identities` array is
empty in exactly this case. `Auth.js` should check it and say so plainly —
"An account with that email already exists. Try logging in, or use Forgot
password" — instead of promising an email.

**Corrections to the earlier version of this finding:**

1. It claimed the `handle_new_user` trigger was missing or dropped. It is not.
   `on_auth_user_created AFTER INSERT ON auth.users` exists and the function is
   correct. This was inferred from a missing row rather than checked.
2. It claimed email confirmation was disabled in the Supabase project. It is
   enabled. All six accounts carry `email_confirmed_at`, set between ten
   seconds and two minutes after creation — a person clicking a real link.
3. It claimed every new signup was broken and that this blocked launch. It does
   not. Five of six accounts have profile rows, including one created in
   August, after the orphan. The trigger has worked before and since.

**The orphan is a known leftover, not a new bug.** `rareops@gmail.com` was
created 29 Apr 2026 and confirmed the same minute. Its `public.users` row was
created by the trigger and later deleted by hand — which is precisely what
finding 11-E already records: "Deleting the profile row leaves an orphaned
login. Cleanup needed: the orphaned auth user from this test."

**To clean it up**, either delete the account from Supabase's Authentication →
Users page, or restore its profile row to match what the trigger would have
made:

```sql
insert into public.users (id, email, username, display_name, is_premium, is_founding_member, referral_code)
select u.id, u.email,
       u.raw_user_meta_data->>'username',
       u.raw_user_meta_data->>'display_name',
       false, false, substr(md5(random()::text), 1, 8)
from auth.users u
where not exists (select 1 from public.users p where p.id = u.id);
```

**Still true and worth fixing separately:** `Settings.js` line 167 changes an
address with `supabase.auth.updateUser()`, which writes `auth.users.email` and
never `public.users.email`, so the two drift apart permanently. Same root cause
as 11-E, and the reason the admin console can show a stale address.

### CR-21 · Deleting a user from the admin console orphans their login

Found 28 Aug 2026, following CR-20.

`AdminConsole.js` deletes a user with `supabase.from("users").delete()` and
then reports "User deleted." Nothing in `src/` or `api/` ever calls
`auth.admin.deleteUser`, so the credentials in `auth.users` survive. The person
can still sign in, and lands in an account with no profile row — every flag
false, no username, and no ability to write to any of the twenty-four tables
that carry a foreign key to `users.id`.

This is the same orphan the owner created by hand in the Supabase table editor,
and the reason it matters is that **using the admin UI instead would not have
avoided it.** Only Supabase's own Authentication → Users page performs a
complete delete today.

**Why it cannot be fixed purely in the client:** deleting an auth account
requires the service-role key, which must never reach the browser. It needs a
serverless endpoint that verifies the caller is an admin and then calls
`auth.admin.deleteUser`. That is the same machinery rec `40` needs — account
deletion currently only sets a flag — and the same machinery rec `58` makes
mandatory if the app ever ships to the app stores, where in-app account
deletion is a review requirement.

Worth doing all three together rather than three times.

**Interim:** delete test accounts from Supabase's Authentication → Users page,
not from the table editor and not from the admin console.

## Decisions recorded during the walkthrough

### DEC-1 · "Fires" becomes "Likes" — reverses design rec #14

The reaction was changed back to a thumbs up, so the product language is
**Likes**, not Fires. Design rec #14 argues the opposite — make the 👍 a flame,
because the database calls it `fires`, the notification says "fired your
check-in", and the flame is the brand. **That recommendation is rejected.**

Affected surfaces: the `fires` table name, badge names and descriptions seeded
25 Aug ("Received 25 fires…", "A single check-in received 10 fires"),
notification copy in `notificationHelpers.js`, and button labels in `Feed.js`
and `FeedModal.js`.

Renaming the table is optional — an internal name can differ from the UI — but
if it stays, note it in `CLAUDE.md` so nobody "corrects" the mismatch later.

### DEC-2 · Photo visibility follows check-in visibility

See FR-1.

### DEC-3 · AI recommendations are never auto-added to the catalog

Unmatched recommendations go to `missing_cigars` for admin review. See tracker
30-29.

---

---

# Part 2 · Code review defects


Found while verifying the design review against the source on 25 Aug 2026.
None of these appear in Claude Design's list. Several outrank most of it.

Two of the original twelve have been corrected — see the corrections note at the
bottom. They are kept here rather than deleted so the record is honest.

## Fixed 25 Aug 2026

| ID | Defect | Where |
|----|--------|-------|
| CR-1 | **Password reset was completely broken.** `resetPasswordForEmail` used `redirectTo: window.location.origin`, which resolves to `ashed.app` — failing the `/login` path check in `Auth.js`, so every reset link landed on the marketing wall. Nobody could recover an account. | `Auth.js` |
| CR-2 | **Comment input dismissed the modal.** A stray `</div>` closed the sheet before the comment footer, so the footer sat outside the element that stops click propagation. Tapping the input, or Post, triggered the overlay's `onClose`. Commenting was broken on the primary path. | `FeedModal.js` |
| CR-3 | **Badges table was empty**, so nothing could be awarded and no badge UI had anything to show. Seeded with 18 rows matching `BADGE_NAMES` in `badgeEngine.js`. | `badges` table |
| CR-4 | **Founding Member could never be awarded.** `checkFoundingMember` selected `created_at` from `users`, but that column does not exist — it is `member_since`. The query errored, returned null, and the function exited early every time. | `badgeEngine.js` |

## FIXED 28 Aug 2026 — security

All three endpoints trusted the client. Identity now comes only from a Supabase
access token the server verifies; `user_id` in a request body is ignored.
Verified against production after deploy: unauthenticated calls to all three
return 401, including the CR-5 attack of passing a premium user's id in the
body, and the wildcard CORS header is gone from both public endpoints.

**Still outstanding from tracker task `30-18`**, which is broader than these
three: RLS coverage across all 23 tables, no secrets in the frontend bundle,
input sanitisation, and an OWASP top-10 pass.

**Cron verified 28 Aug 2026.** The authenticated path was exercised once by
hand with the real secret: HTTP 200, "DB refresh complete for July 2026. Found
8 candidates, inserted 3 new." So the September run will authenticate rather
than silently 401. The three inserted rows are in the admin review queue.

| ID | Defect | Where |
|----|--------|-------|
| CR-5 | **Premium gate and rate limits are bypassable.** `/api/anthropic` reads `user_id` straight from the request body with no Supabase JWT verification. Any caller can pass a premium user's id to unlock Opus, and rotating `user_id` or omitting `feature` defeats the rate limiter entirely. | `api/anthropic.js` |
| CR-6 | **Open proxy on a billed Google key.** `/api/places` serves `Access-Control-Allow-Origin: *` with no auth, no rate limit and no referer check. Any site can drive Google Places on your account, and `search` uses Text Search — one of the pricier calls. | `api/places.js` |
| CR-7 | **Cron endpoint has no auth.** `/api/db-refresh` checks the HTTP method and nothing else. Every hit runs a page scrape plus an AI call and writes rows. AdminConsole displays the curl command in the UI. Needs a `CRON_SECRET` check. | `api/db-refresh.js` |

## Open — correctness

| ID | Defect | Where |
|----|--------|-------|
| CR-8 | **Admin and Partner form inputs accept one character.** `Field` is declared inside `ListingSection`'s body, so React treats it as a new component type on every render and remounts the input, losing focus after each keystroke. All five listing fields are unusable. `AdminConsole`'s `AddCigarForm` has the identical defect with `SelectField` / `TextField`. | `PartnerDashboard.js`, `AdminConsole.js` |
| CR-9 | **Smoke One saves check-ins with no cigar link.** `fetchHumidor`'s join selects `cigars(brand, line, vitola, …)` without `id`, so `cigar.id` is undefined and the check-in saves `cigar_id: null` — orphaned from the catalog, never updating `avg_rating`. Adding `id` to the select is the entire fix. | `Humidor.js` |
| CR-10 | **Scanning creates duplicate catalog rows.** Both scanners use `.eq("brand",…).eq("line",…).maybeSingle()`, but `cigars` stores one row **per vitola**. Multiple matches make `maybeSingle()` error and return null, so every scan inserts a fresh `ai_generated`, `verified: false` duplicate. Pollutes the curated catalog. Tracker 30-26 / 30-27. | `Humidor.js`, `BandScanner.js` |
| CR-11 | **Non-premium users reach the Humidor scanner.** `App.js` passes `isPremium` and `onUpgrade` to `<Humidor>`, whose signature accepts neither. The server correctly returns 403, but the client then reads an empty response and reports "Could not identify any cigars in this photo" instead of showing the paywall. | `App.js` ↔ `Humidor.js` |
| CR-12 | **Band scanner turns API failures into fake cigars.** A 403, 429 or 500 yields `{}`, which matches none of the error branches, so it falls through to caching `brand: undefined` and shows a vitola picker for "UNKNOWN / Unknown". Humidor's equivalent path is guarded; BandScanner's is not. | `BandScanner.js` |
| CR-13 | **Fire is written twice from the modal.** `FeedModal`'s `handleFireToggle` performs the insert/delete itself, then calls `onFireToggle`, which `Feed` wires to its own handler that performs a second write based on stale state. The prop is used as a "sync your state" callback but implemented as a "do the action" callback. | `Feed.js` ↔ `FeedModal.js` |
| CR-14 | **Badge icons come from three sources that disagree.** `UserProfileModal` has its own `BADGE_ICONS` map whose keys largely do not match what `badgeEngine` awards — only about 5 of 19 are ever earned, everything else falls back to 🏅. `Friends.js` reads icons from the `badges` table instead. Three sources, no agreement. | `UserProfileModal.js`, `badgeEngine.js`, `Friends.js` |
| CR-15 | **PostHog session replay is promised but never runs.** `index.js` imports posthog but never assigns `window.posthog`, so `window.posthog?.get_session_id?.()` is always undefined and every feedback row stores `null`. Session recording is never configured either. The UI tells users "your session replay will be attached" — currently false. Either wire it and disclose properly, or delete the sentence. | `index.js`, `Settings.js` |
| CR-16 | **`manifest.json` is unmodified CRA boilerplate** — installs to a home screen as "React App" with a white splash against a `#1a0f08` product. **FIXED 28 Aug** — now names Ashed, with `theme_color` and `background_color` both `#1a0f08` so the splash matches the app. See CR-18: the icons it points at are still wrong. | `public/manifest.json` |
| CR-17 | **`App.test.js` is boilerplate that always fails** — asserts on text this app does not contain. The only test in the repo is red. **FIXED 28 Aug** — deleted. `npm test` now reports 0 tests rather than 1 failure. `setupTests.js` was kept so a real test suite can be added without re-scaffolding. | `src/App.test.js` |
| CR-18 | **The PWA icons are still the Create React App React logo.** `favicon.ico`, `logo192.png` and `logo512.png` have one commit each — "Initialize project using Create React App" — and have never been touched. Fixing `manifest.json` (CR-16) corrected the app's *name* and splash colour but it still points at these three files, so installing Ashed to a home screen puts a React logo there, and every browser tab shows one. **FIXED 28 Aug** — artwork produced in Claude Design: a flame in the brand gradient on a dark radial glow, reusing the same SVG path the app's rating flames already use, so the icon and the ratings are visibly the same mark. Shipped at 512, 192 and 64, plus the SVG source. `favicon.ico` was rebuilt as an ICO wrapping the 64px PNG so bare `/favicon.ico` requests no longer serve React's logo, and `logo192.png` / `logo512.png` are deleted. The 192 and 512 are declared `any maskable` — the mark sits well inside the circle Android crops to. | `public/` |

## Corrections to my own earlier claims

Both came from trusting `n_live_tup` in `pg_stat_user_tables`, which is an
estimate and was badly stale. Recorded here rather than deleted.

| Original claim | Reality |
|---|---|
| "`cigars` has 8 rows, so the seed-id exclusion breaks every check-in" | Exact count is **1,372 cigars**, ids from 309 up. The `[1..8]` exclusion never matched anything. Worth removing as a latent hazard, but it was not breaking anything. |
| "Every badge award fails the foreign key" | `badges` was genuinely empty, but `user_badges` already held rows referencing badge keys — which should be impossible under an enforced foreign key. The seed was still correct to run; the stated reason was not verified. |

**Process note:** row counts from `pg_stat_user_tables` are estimates and go
stale without an `ANALYZE`. Use `count(*)` when the number matters.

---

# Part 3 · Claude Design recommendations


Every item verified against the source and the live schema on 25 Aug 2026.

**Checked** = what the code actually showed. **Call** = whether to do it.

Items marked **DO FIRST** were the urgent ones; several are now fixed — see the Status column.


## P1 · Design system

| # | Recommendation | Files | Checked | Call | Status | Reasoning |
|---|---|---|---|---|---|---|
| 1 | Create src/theme.js and export tokens **DO FIRST** | all files | CONFIRMED | DO | OPEN | Every file redeclares `SANS` and hardcodes hexes. Everything in phases 1–3 depends on this landing first. **Correct the strength map before pasting** — see the stale-notes section. |
| 2 | Collapse the duplicate palette values **DO FIRST** | all files | CONFIRMED | DO | OPEN | Eight distinct muted browns for one role; gold split `#c9a84c` vs `#d4b45a` confirmed file by file. Humidor declares the strength map three times on its own. |
| 3 | Extract shared UI primitives into src/ui/ | Button, Sheet, Pill, Toggle, Toast, SectionLabel, EmptyState | CONFIRMED | DO | OPEN | The × close button is byte-identical in three files. Five near-identical pill styles across three files. The bottom sheet appears in eight places. Highest-leverage dedup in the codebase. |
| 4 | Delete src/App.css | App.css | CONFIRMED | DO | OPEN | Verified unmodified CRA boilerplate and imported by nothing. Zero risk. Same commit: `App.test.js` is boilerplate that must fail, and `manifest.json` still names the app "React App". |

## P2 · Typography

| # | Recommendation | Files | Checked | Call | Status | Reasoning |
|---|---|---|---|---|---|---|
| 5 | Set a minimum font size of 13px | all files | CONFIRMED | DO | OPEN | True floor is 8px (`BEST DEAL`), not 9. **Sequence this after 6, 17 and 29** — raising type on a Feed row already carrying 13 elements in 70px will break the layout. |
| 6 | Fix the inverted hierarchy in Feed.js | Feed.js | CONFIRMED | DO | OPEN | Cigar name is 13px while vitola (14/600) and strength (14/700) shout over it. Two-line change, largest single visual improvement available. |
| 7 | Adopt a display typeface | theme.js | CONFIRMED | DEFER | OPEN | No display face anywhere — the app has no typographic voice. Real brand value, but do it after tokens so it lands in one place, and bundle it per rec 69 rather than adding a CDN dependency you'll have to remove. |
| 8 | Standardize the label style | all files | CONFIRMED | DO | OPEN | Labels vary across two letter-spacings, two sizes and three colours. Falls out of the `SectionLabel` primitive in rec 3. |

## P3 · Contrast

| # | Recommendation | Files | Checked | Call | Status | Reasoning |
|---|---|---|---|---|---|---|
| 9 | Fix failing contrast | all files | CONFIRMED | DO | OPEN | `#5a4535` on `#1a0f08` is roughly 2:1 and carries loading text, timestamps, "Cannot be changed", the paywall legal line and the PostHog disclosure — precisely the strings that must be readable. |
| 10 | Bring every tap target to 44×44 | Feed, Humidor, CheckIn, Friends, Pairings, Venues, Settings, Notifications | CONFIRMED | DO | OPEN | All values verified exactly. **Build to 48, not 44** (rec 63) so one number satisfies both platforms. App.js's Purchased sheet already uses 44×44 — the pattern exists, it just wasn't applied elsewhere. |
| 11 | Convert clickable divs to real buttons | Badges, Humidor, BandScanner, Venues, CheckIn, Feed, Notifications, App.js | CONFIRMED | DO | OPEN | Confirmed in all eight files. Also the prerequisite for Android back (rec 67). Venues' autocomplete uses `onMouseDown` to beat an `onBlur` timeout — that never fires for keyboard or assistive input at all. |
| 12 | Add aria-label to icon-only controls | all files | CONFIRMED | DO | OPEN | Same commit as rec 11 — no reason to separate them. |

## P4 · Icons

| # | Recommendation | Files | Checked | Call | Status | Reasoning |
|---|---|---|---|---|---|---|
| 13 | Replace emoji with a real icon set | all files, src/icons/ | PARTIAL | DO | OPEN | Inventory is incomplete: 🤖 📖 ⚠️ 👥 📊 🔖 ⭐ 🎖️ ✅ are all load-bearing and unlisted. Two corrections — badge icons live in the `badges.icon` column (data, not code), and glyphs like `→ ✎ ✓ × ›` are text characters that don't need replacing. |
| 14 | Make the fire button a flame | Feed.js, FeedModal.js | CONFIRMED | DO | OPEN | `FlameIcon` already exists in the same file as the 👍 button. The database calls it fires and the notification says "fired your check-in". Smallest brand win on the list. |
| 15 | Drop the emoji from the 18 flavor tags | CheckIn.js | CONFIRMED | DO | OPEN | Already half-done: `FLAVOR_TAG_NAMES` (18 plain names) sits at the top of the file and feeds the AI prompt. The UI just needs to render from it. Also kills the fragile `split(" ")` parse. |

## P5 · Rating

| # | Recommendation | Files | Checked | Call | Status | Reasoning |
|---|---|---|---|---|---|---|
| 16 | Pick one public rating scale | CheckIn, Feed, Friends, FeedModal, App.js | CONFIRMED | DO | OPEN | Schema confirms both `checkins.rating` and `ratings.score` store the 10-point value. Keep the storage, change the display only — no migration needed. Five flames is the brand. |
| 17 | Show the rating once per feed row | Feed.js | CONFIRMED | DO | OPEN | Numeral, five flame glyphs and a colour-coded accent bar all say the same thing. Keep the numeral and the bar. |
| 18 | Hoist the SVG gradient ids out of render | Feed.js, CheckIn.js, Friends.js | CONFIRMED | DO | OPEN | Worse in CheckIn than the rec says — `FlameRating` re-renders on every `touchmove`, minting five new gradient DOM ids per frame for the whole length of a slider drag. |

## P6 · States

| # | Recommendation | Files | Checked | Call | Status | Reasoning |
|---|---|---|---|---|---|---|
| 19 | Replace plain-text loading with skeletons | Feed, Badges, Humidor, Friends, Notifications, Settings, BandScanner | CONFIRMED | DEFER | OPEN | Nine distinct loading strings across two colours and two sizes. Real improvement, but it needs the rec 3 primitives to exist first — otherwise you write the skeleton nine times. |
| 20 | Standardize the four loading treatments | Humidor, Recommendations, Pairings, BandScanner, Venues, FeedModal | CONFIRMED | DO | OPEN | The `@keyframes scan` block is byte-identical in four files, injected as four inline `<style>` tags sharing one global name. That's a namespace collision waiting to happen. |
| 21 | Give empty states a consistent shape | Friends, Venues, Notifications, UserProfileModal | CONFIRMED | DO | OPEN | Three different shapes plus four bare one-liners in Friends alone. Note Badges has *no* empty state and divides by zero — a new user gets `width: "NaN%"` on the progress bar. |

## P7 · Flows

| # | Recommendation | Files | Checked | Call | Status | Reasoning |
|---|---|---|---|---|---|---|
| 22 | Fix the paywall's broken promise | UpgradePrompt.js | CONFIRMED | DO | OPEN | The CTA fires `alert("coming soon")` under a legal line reading "Card required. No charge for 7 days." That's a promise the app cannot keep. Needs a `waitlist` table — not in the schema yet. |
| 23 | Simplify the paywall pricing | UpgradePrompt.js | CONFIRMED | DO | OPEN | Four numbers at the decision point. Cheap copy change. Note the four-number state only exists while founding slots remain — after that the second table stands alone. |
| 24 | Cut onboarding from 10 screens to 3 | OnboardingTour.js | PARTIAL | DO | OPEN | Ten screens confirmed, but **three** carry the PRO pip, not four — Wishlist soft-sells without one. The rec's own suggestion is backed by the copy: screen 3 says "After 5 check-ins, Ashed learns your palate." |
| 25 | Replace the window.confirm / alert calls | App.js | CONFIRMED | DO | OPEN | Both confirmed — delete check-in and empty-journal export. Humidor already does inline confirm correctly; copy that pattern. Becomes a hard blocker under rec 66. |
| 26 | Move the Coming Soon gate out of Auth.js **DO FIRST** | Auth.js | CONFIRMED | DO | FIXED 25 Aug (password reset redirect) | **This is a live P0, not an architecture smell.** Password reset redirects to the origin, which fails the `/login` check — every reset link lands on the marketing wall. Nobody can recover an account today. |
| 27 | Unify overlay centring | CheckIn, Friends, Notifications, Recommendations, FeedModal, Settings, UserProfileModal, UpgradePrompt | CONFIRMED | DO | OPEN | Worse than described — **five** approaches, not two. UserProfileModal caps at 480 while everything else caps at 420, and Settings carries both idioms in one style object with `left` declared twice. |
| 28 | Make the Smoke One flow return somewhere | Humidor.js, App.js | PARTIAL | DO | OPEN | Week 32 fixed the decrement correctly — it only fires after the check-in saves, and cancel is safe. But nothing refetches the humidor (`fetchHumidor` is bound to `[user.id]`), so the count on screen stays stale until you leave the tab. |

## P8 · Screens

| # | Recommendation | Files | Checked | Call | Status | Reasoning |
|---|---|---|---|---|---|---|
| 29 | Feed.js — thin the row | Feed.js | CONFIRMED | DO | OPEN | Exactly 13 elements in `padding: "10px 14px"`, counted. Strength does carry its own colour scale at 14px/700. Do this before the type floor. |
| 30 | Feed.js — add pagination | Feed.js | CONFIRMED | DO | OPEN | Hard limits of 20 / 10 / 5 with no load-more. `const [refreshCount] = useState(0)` is declared without a setter yet used as an effect dependency — the refresh path is dead code that reads as working. |
| 31 | Humidor.js — scan flow replaces the screen | Humidor.js | CONFIRMED | DO | OPEN | Survived the Week 32 rebuild. The only exit is a 13px `#5a4535` "Cancel" — the worst-contrast token in the app, used on the only way out of a full-screen takeover. |
| 32 | Humidor.js — scan-confirm writes serially | Humidor.js | CONFIRMED | DO | OPEN | Verbatim as described, and worse: zero error handling anywhere in the function and no disabled state on the button, so a double-tap double-imports. |
| 33 | Venues.js — drop the serial prefetchDetails | Venues.js | CONFIRMED | DO | FIXED 25 Aug | Pure waste — `handleVenueTap` already fetches lazily with a cache guard. Deleting the prefetch costs only the hours badge on unopened rows and saves up to 20 Places Details calls per search. Direct billing reduction. |
| 34 | Venues.js — show the map on the empty state | Venues.js | CONFIRMED | DEFER | OPEN | `userLocation` is only ever set inside `requestLocation`, which searches at the same moment — there is no state today where a location-only map could render. Needs new plumbing, and rec 73 may replace Leaflet entirely. Don't build it twice. |
| 35 | Venues.js — remove the console.log calls | Venues.js | CONFIRMED | DO | FIXED 25 Aug | Both present. The three `console.error` calls can stay — they're legitimate. |
| 36 | Recommendations.js — survey and auto fight | Recommendations.js | PARTIAL | DO | FIXED 25 Aug | **Right bug, wrong location.** The effect depends on a boolean that can't flip mid-session. The clobbering is in Back, Refresh and both error branches. Refresh silently re-runs the auto prompt over survey results. |
| 37 | Pairings.js — cocktails is never persisted | Pairings.js | CONFIRMED | DO | FIXED 25 Aug (added cocktails column) | Schema proves it — `pairings` has spirits, beer, coffee, non_alcoholic, notes and no cocktails column. The AI returns it and the UI renders it, so the section vanishes on second view. One `ALTER TABLE`. |
| 38 | Pairings.js — the Cancel button is mislabelled | Pairings.js | CONFIRMED | DO | FIXED 25 Aug | Same `onClose` handler as the header ×, on a read-only view. Nothing is cancellable. Also note the backdrop has no dismiss handler at all. |
| 39 | Settings.js — PrivacySection fetches during render | Settings.js | CONFIRMED | DO | FIXED 25 Aug | React 19 StrictMode double-fires it. Worse, a rejected promise never sets `loaded`, so the section is stuck on "Loading…" forever with no retry. |
| 40 | Settings.js — account deletion only sets a flag | Settings.js | CONFIRMED | DO | OPEN | Also a store blocker (rec 58), so it's not optional if you go native. The update's error is never checked either — if RLS blocks the write, the user is signed out and told nothing, and the account is neither deleted nor flagged. |
| 41 | Settings.js — username says Cannot be changed | Settings.js | CONFIRMED | DO | OPEN | No reason given, no route to support. Both the value and the label use `#5a4535`, so the whole row is also the worst-contrast text in the file. |
| 42 | Friends.js — friend profile shows hardcoded badges | Friends.js | CONFIRMED | DO | OPEN | **Not fixed by Week 32** — and the rebuild made it worse. It added a real computed badge card below, so a user with no badges now shows "🏅 Aficionado" in the hero above an empty card. Aficionado is a real badge key, so the literal contradicts actual state. |
| 43 | Friends.js — Remove has no confirmation | Friends.js | CONFIRMED | DO | OPEN | Deletes immediately, and sits on the same tappable row as "View Profile ›". The button is ~26px tall in `#5a4535` — nearly invisible, directly beside the primary action. |
| 44 | Friends.js — invite URL has two sources | Friends.js | CONFIRMED | DO | OPEN | **Not fixed by Week 32.** The card prints `ashed.app?ref=` as text (no scheme); the share button builds from `window.location.origin`. They diverge on any preview deploy. |
| 45 | BandScanner.js — fix the violasLoading typo | BandScanner.js, App.js | CONFIRMED | DO | OPEN | Present in **both** files, not just BandScanner — App.js declares the same misspelled pair. A rename has to cover both or it'll look half-done. |
| 46 | BandScanner.js — flag writes to cigars directly | BandScanner.js | CONFIRMED | DO | OPEN | Any user can unverify a curated record, unscoped. Two further defects: on the "Not Sure" path vitola is null so `.eq("vitola", null)` matches nothing, and `setFlagged(true)` fires unconditionally so the user is thanked when nothing happened. No moderation table exists yet. |
| 47 | CheckIn.js — remove the hardcoded seed-id exclusion **DO FIRST** | CheckIn.js | CONFIRMED | DO | FIXED 25 Aug | **CORRECTION (27 Aug):** I originally called this critical on the basis that `cigars` had only 8 rows, which came from a stale Postgres row estimate. An exact count shows **1,372 cigars with ids from 309 up**, so the `[1..8]` exclusion never actually matched anything. It was a landmine, not an active fire. Still right to remove — ids are reused if the table is ever reseeded — but it was not the emergency I described. |
| 48 | CheckIn.js — the AI Suggest button is single-use | CheckIn.js | CONFIRMED | DO | OPEN | `setSuggestionsUsed(true)` sits outside the try/catch, so a failed call hides the button permanently while the fallback hint still points at it. Separately: the AI's `tags` response is fetched and thrown away. |
| 49 | CheckIn.js — the rating slider is touch-only | CheckIn.js | CONFIRMED | DO | OPEN | No pointer events, no keyboard, and the div isn't focusable. Also unlisted: tapping the leftmost ~5% silently resets the rating to null and re-disables Save, with no affordance explaining it. |
| 50 | App.js — remove the dead branches | App.js, Humidor.js | NOT FOUND | SKIP | OPEN | Searched App.js, Humidor.js, Feed.js, FeedModal.js and Badges.js — the `count ? 0 && …` pattern is nowhere in the current tree. Those line numbers point into the stale fork folders. Close it. |
| 51 | Notifications.js — cursor doesn't match behavior | Notifications.js | CONFIRMED | DO | OPEN | Every row gets `cursor: pointer`; only some do anything. Separately, `markAllRead` runs after `setNotifications`, so unread dots persist all session while the badge count drops to zero. |
| 52 | FeedModal.js — the JSX is mis-nested **DO FIRST** | FeedModal.js | CONFIRMED | DO | FIXED 25 Aug | **This is a functional break, not a nesting nit.** The escaped footer has no `stopPropagation`, so the overlay's `onClick={onClose}` fires when you tap the input or Post. Commenting is broken on the primary path. |

## P9 · Repo

| # | Recommendation | Files | Checked | Call | Status | Reasoning |
|---|---|---|---|---|---|---|
| 53 | Delete project files/Chat 1.3/ and Chat 1.4/ **DO FIRST** | repo | CONFIRMED | DO | OPEN | **This already caused a real incident.** A stale `Venues.js` from one of those folders sorted as newest during this review and would have been the version analysed. Highest-value cleanup on the list. |
| 54 | Remove the committed build/ directory | repo | N/A | DO | OPEN | Not verifiable from source, but standard hygiene. Fold it into the Claude Code migration along with a real `.gitignore`. |
| 55 | Replace the CRA boilerplate README | repo | N/A | DO | OPEN | Write it as README plus CLAUDE.md when the repo lands. Env vars to document: `GOOGLE_PLACES_KEY`, `ANTHROPIC_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`. |
| 56 | Move the PostHog key out of src/index.js | index.js, supabase.js | CONFIRMED | DO | OPEN | Broader than stated — `supabase.js` hardcodes the URL and anon key the same way. Both are public by design, but neither belongs inline, and the env pattern is needed anyway for the API keys. |

## P10 · Native

| # | Recommendation | Files | Checked | Call | Status | Reasoning |
|---|---|---|---|---|---|---|
| 57 | Subscriptions must use StoreKit / Play Billing | UpgradePrompt.js | N/A | DEFER | OPEN | Store blocker if you ship native — but only then. Changes the destination of recs 22 and 23, not their urgency: the honesty fix ships now either way. Price with the 15–30% cut in mind. |
| 58 | In-app account deletion is mandatory | Settings.js | CONFIRMED | DO | OPEN | Guideline 5.1.1(v). Upgrades rec 40 from "fix the copy" to "implement a real server-side delete". Worth doing regardless — the current copy is inaccurate on web too. |
| 59 | Age rating and an age gate | Auth.js, schema | CONFIRMED | DO | OPEN | Half the work is already done — `users.age_verified` exists in the schema and is never written. Check Google Play's tobacco policy before submitting; it's stricter than Apple's. |
| 60 | Guideline 4.2 minimum functionality | — | N/A | DEFER | OPEN | You already have camera flows, which is most of the bar. Push (rec 74) and haptics (rec 76) finish it. Awareness item rather than a task. |
| 61 | Privacy disclosures for PostHog | Settings.js, index.js | PARTIAL | DO | OPEN | **The feature it describes doesn't actually run.** `window.posthog` is never assigned, so every feedback row stores `null`, and session recording is never configured. The UI copy promising a session replay is false today — wire it and disclose properly, or delete the sentence. |
| 62 | Permission purpose strings | native shell | N/A | DEFER | OPEN | Only exists once there's a native shell. Write them as user-facing copy, not placeholders — vague strings get rejected. |
| 63 | Use 48dp as the tap target floor | all files | CONFIRMED | DO | OPEN | Supersedes rec 10 — one value clears both Apple's 44pt and Android's 48dp. Build to 48 the first time so you don't revisit every target twice. |
| 64 | Safe areas | App.js, BandScanner.js | CONFIRMED | DO | OPEN | `env(safe-area-inset-*)` appears nowhere in the tree. The fixed nav and both toasts (bottom 90 and 100) will sit under the home indicator and the Android gesture bar. |
| 65 | Drop the 420px max-width | all overlays | CONFIRMED | DEFER | OPEN | Only once native is the primary target — on web the 420 column is a deliberate and reasonable choice. Do rec 27 regardless; the five conflicting centring idioms are a problem on any platform. |
| 66 | alert() and window.confirm are disqualifying | App.js, UpgradePrompt.js | CONFIRMED | DO | OPEN | In a webview these render the platform dialog with your domain in the title — instantly "this is a website". Folds entirely into recs 22 and 25; no separate work. |
| 67 | Android hardware back must dismiss overlays | App.js and every overlay | CONFIRMED | DEFER | OPEN | Every sheet is state-only, so back currently exits the app. Depends on rec 11 landing first — you need real focusable controls and a navigation stack before this is wireable. |
| 68 | Emoji get worse on Android | all files | CONFIRMED | DO | OPEN | Not a separate task — it's the argument for moving rec 13 up the list. Apple's emoji can't ship on Android, so the same glyphs render flat or missing. Your own SVG set gives identical rendering on both for free. |
| 69 | Bundle the fonts | theme.js | N/A | DO | OPEN | Pairs with rec 7 — decide it once. If you're going to bundle, don't add the CDN link first and remove it later. |
| 70 | Keyboard handling | FeedModal.js, index.html | CONFIRMED | DEFER | OPEN | `interactive-widget=resizes-content` is a web-only hint. **Fix rec 52 first** — the comment input can't be a sticky footer while it lives outside the sheet. |
| 71 | Drop the 16px input workaround | Humidor, Friends, FeedModal, CheckIn | CONFIRMED | SKIP | OPEN | Only true if you retire the web app. While web is the product the workaround is still doing its job, and 16px already clears the 13px floor — it costs nothing to keep. Revisit if web is ever dropped. |
| 72 | Offline behavior | all screens | CONFIRMED | DEFER | OPEN | The biggest functional gap for a mobile release — a humidor that's unusable in a lounge with no signal is unusable exactly where it's used. But it's a large piece of work and it needs the data layer settled first. |
| 73 | Native maps and tiles | Venues.js | CONFIRMED | DO | OPEN | **This is a web problem today, not just a native one** — OSM's tile policy doesn't cover production traffic. Also unlisted: every marker image loads from `unpkg.com`, so pins vanish offline and a native CSP will block them outright. |
| 74 | Push notifications | Notifications.js | CONFIRMED | DEFER | OPEN | Notifications are in-app only, and push is most of the retention case for a social journal. Needs APNs and FCM. Ask for permission after the first check-in, not on launch. |
| 75 | Referral deep links | Auth.js, App.js | CONFIRMED | DEFER | OPEN | Needs Universal Links, App Links and a deferred path for store installs. Worth noting now: `users.referred_by` is `text` with no foreign key, while App.js writes a uuid into it. Fix the column type before the traffic arrives. |
| 76 | Haptics | CheckIn.js | N/A | DO | OPEN | A light tick at each half-step on the flame slider — the app's signature interaction — for about ten lines. Cheapest delight on the entire list. |

---

# Part 4 · Where the design review is out of date


The review was written against a pre-Week-32 tree. Six places where following it
literally would introduce a bug or waste time.

| Rec | Problem |
|-----|---------|
| **1, 2** | **The strength scale is stale.** The proposed token block still says `Light` and has four tiers. The app runs `Mild / Mild-Medium / Medium / Medium-Full / Full`, and `#b8d4a0` — the Mild-Medium colour — appears nowhere in the review. Pasting the block as written would regress the rename. |
| **1** | **The palette is incomplete.** It misses ten load-bearing values, including the entire Partner Dashboard identity (`#7a8a9a`, `#5a6a7a`, `#a0b0c0`) plus `#e8632a`, `#a08060`, `#ddc9a8`, `#d4b45a`, `#a07830`, `#9a7a9a`, `#1e1208`, `#2d1810`. A `theme.js` built only from that list will not cover AdminConsole or PartnerDashboard. |
| **13** | **Badge icons are not in the code.** They come from the `badges.icon` column, so that slice is a data migration, not a component change. Several glyphs the inventory lists — `→ ✎ − + ✓ × › ♡ ⚑` — are plain text characters, not emoji. They render from the font and have no cross-platform problem. The inventory also **misses** 🤖 📖 ⚠️ 👥 📊 🔖 ⭐ 🎖️ ✅, all load-bearing. |
| **24** | **Miscounted.** Ten onboarding screens is right, but **three** carry the PRO pip, not four. Wishlist soft-sells without one. |
| **36** | **Right diagnosis, wrong mechanism.** The `useEffect` depends on a boolean that cannot flip while the modal is open. The actual clobbering was in three handlers — Back, Refresh, and both error branches. Fixing the effect alone would have changed nothing. *(Fixed 25 Aug.)* |
| **50** | **Already gone.** The always-falsy `count ? 0 && …` pattern does not exist anywhere in the current tree. Those line numbers point into the stale `project files/Chat 1.3` and `Chat 1.4` fork folders — which is rec 53's whole point. |
| **61** | **The feature it describes does not run.** See CR-15. |
| **28-1 equivalent** | The review says Pairings still calls Anthropic directly with an exposed key. It does not — `Pairings.js` already posts to `/api/anthropic` with `user_id` and `feature`. That note described an older fork. |

## Note on line numbers

Line numbers throughout the review refer to the stale fork folders, not the
current files. Search by symbol name instead.
