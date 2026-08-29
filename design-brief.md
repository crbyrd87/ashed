# Ashed — design brief

For Claude Design. Written 29 Aug 2026.

---

## What Ashed is

A cigar journal and community app. People log the cigars they smoke, rate
them, keep a humidor inventory and a wishlist, see what friends are smoking,
and find cigar shops and lounges.

It is a **mobile web app** (a PWA) used almost entirely on a phone, in Safari
on iOS. Not yet in either app store. Pre-launch, alpha, no real users yet, so
there is no legacy interface to protect — this is the moment to change it.

The owner is not a programmer.

---

## The two directions

### 1. Sophisticated, not cartoonish

The app should read as modern, elegant and sophisticated, and explicitly
**less cartoonish** than it is today.

This is the governing brief. It outranks the individual findings listed later:
an alternative that fixes a specific problem while still reading as cartoonish
has not done the job.

The things that most contribute to the cartoonish read today:

- **Emoji used as interface iconography.** 🔍 👤 🔖 🔥 👍 📍 🚬 📊 throughout
  the navigation, buttons, stat cards and empty states. This is the single
  biggest contributor.
- **The flame gradient at full saturation** (`#cc2200` → `#ff6600` → `#ffcc00`)
  used for star-equivalent ratings. The flame is the product's identity and
  should stay — the objection is to how literal and how bright it is, not to
  the motif.
- **Heavy borders, large corner radii, high-contrast gold on near-black.**
  Together these read as a game interface rather than a journal.
- **No display typeface.** Everything is the system sans stack. This caps how
  sophisticated the app can look no matter what else changes.

Reference points the owner has *not* given, so treat this as open: whether the
target is closer to a spirits/whisky brand, a members' club, a field notebook,
or a modern reading app is yours to propose.

### 2. Open on a task, not on a feed

Today the app opens on a screen that stacks a search box, two quick-action
buttons, and the activity feed. Its tab is labelled "Feed".

The owner wants it to open on a screen that asks **"What do you want to do?"**
and offers the functions directly. Their list, verbatim:

- Search for a cigar
- Scan a cigar band
- Get a recommendation
- Find a drink pairing for my cigar
- Find a cigar pairing for my drink
- See the activity feed

"Etc." — the list is illustrative, not exhaustive. **Every area must remain
reachable.** This re-thinks the route to them; it removes nothing.

Two of those are not simply new routes to existing screens:

- **"Find a cigar pairing for my drink" does not exist.** The app only runs
  cigar → drink today. The reverse needs a way to name or pick a drink and a
  result format that returns cigars. It is a new feature.
- **"Find a drink pairing for my cigar" currently requires a cigar to have been
  found first** — it is reachable only from a search result or a humidor item.
  As a top-level choice it needs its own cigar picker as an entry step.

---

## What exists now

### Navigation

A bottom bar with five entries: **Feed · Me · Wishlist · Humidor · Venues.**
Everything else opens as a full-screen panel or a bottom sheet over the top:
Band scanner, Recommendations, Pairings, Friends, Badges, Notifications,
Settings, Admin console, Partner dashboard, Onboarding tour, Upgrade prompt.

There is **no router**. Screens are a state variable, not URLs. Back-button
handling for overlays was added on 29 Aug 2026, so Back now closes them one at
a time, but there are still no shareable or deep-linkable URLs.

### Screens

Search · Me (profile, journal, stats, badges) · Wishlist · Humidor · Venues ·
Check-in · Feed · Feed comments · Band scanner · Recommendations · Pairings ·
Friends · Badges · Notifications · Settings · Upgrade prompt · Onboarding tour
(10 screens) · Cigar submission · Admin console · Partner dashboard

### Premium

Three features are paid: **band scanner, recommendations, pairings.** Three of
the six items on the owner's home-screen list are therefore premium, which the
home screen design has to handle gracefully.

The paywall currently promises a free trial that does not exist, and onboarding
runs to ten screens. Both are flagged for simplification.

---

## Constraints that are real

These are not preferences; they are how the app is built.

- **Dark theme only.** There is no light mode and none is planned.
- **Every style is an inline style object in JavaScript.** No CSS framework, no
  stylesheets, no class names. Designs need to survive being expressed as flat
  style objects — so no complex selectors, no `:hover` chains, no pseudo
  elements. Hover matters little anyway; this is a touch app.
- **Text inputs must be at least 16px.** Anything smaller makes iOS Safari zoom
  the page when the field is focused.
- **Tap targets should be at least 48px**, which satisfies both Apple and
  Android.
- **The app column is capped at 420px** and centred on wider screens.
- **A typeface must be bundled, not loaded from a CDN** — offline is a
  requirement for a PWA.
- **Badge icons come from the database**, not from code, so changing them is a
  data change and can be done independently.

---

## The palette today

Offered as the starting point, not as something to preserve. Renaming or
replacing it is in scope.

| Role | Value |
|---|---|
| Page background | `#1a0f08` |
| Cards | `#221508`, raised `#2a1a0e` |
| Borders | `#3a2510`, stronger `#4a3520` |
| Gold (primary accent) | `#c9a84c` |
| Headings | `#f5ead8` · body `#e8d5b7` · muted `#8a7055` · faint `#5a4535` |
| Green (CTA / community) | `#4caf6e`, softer `#7a9a7a` |
| Danger / alert | `#a0522d` · `#e8632a` |
| Flame gradient | `#cc2200` → `#ff6600` → `#ffcc00` |

**The faint tone is a known accessibility problem.** `#5a4535` on `#1a0f08` is
roughly 2:1 contrast and currently carries loading text, timestamps and legal
copy. It needs to get lighter.

### The strength scale

Five levels, with a colour each. The names are fixed; the colours are not.

`Mild` `#a8c5a0` · `Mild-Medium` `#b8d4a0` · `Medium` `#d4b483` ·
`Medium-Full` `#c4894a` · `Full` `#a0522d`

---

## What already exists to design against

A shared component library was extracted on 29 Aug 2026, in `src/ui/`. Designing
these eleven pieces changes the whole app at once, which is much cheaper than
redesigning screen by screen:

`Sheet` (bottom sheet / centred dialog) · `Screen` (full-screen panel) ·
`Button` · `Pressable` · `ClickableRow` · `CloseButton` · `Toggle` · `Pill` ·
`SectionLabel` · `EmptyState` · `Notice` (inline success / error banner)

Colour, type, spacing and radius are already centralised in `src/theme.js`, so
a new palette or type scale is a change in one file.

---

## Known problems worth fixing while you are in here

- The **Me tab header** is cramped: photo, name, handle, member-since date and
  badges compete in one row, and badge names wrap onto two lines on a phone.
- **Badges** are a 2×2 grid that would read better as single-column rows, and
  the progress bar is weak.
- **Settings** is a wall of transparent outline buttons that all look alike.
- The **feed row** carries about thirteen elements in roughly 70px. It has to be
  thinned before type sizes or tap targets inside it can be raised — this
  currently blocks an accessibility fix.
- **Onboarding is ten screens**; it should be about three.
- **The paywall** pricing needs simplifying, and its free-trial claim removed.

---

## Open questions for you to answer

1. Does the home screen **replace** the bottom bar, or sit above it?
2. Where do **Humidor, Wishlist, Venues, Friends and Badges** live? They are
   places rather than tasks, so they do not fit "what do you want to do?"
   cleanly.
3. Is the **feed one option among many**, or still the default destination for a
   returning user who just wants to see what friends smoked?
4. What does a **premium-locked choice** look like sitting in a list of choices?
5. What replaces **emoji icons** — a bundled icon set, or drawn SVG?
6. What is the **display typeface**, and what pairs with it for body text?

---

## What would be most useful back

In rough priority order:

1. **The home screen**, as a concrete layout with real labels — the piece the
   owner most wants to see.
2. **A palette and type scale**, expressible as flat values.
3. **Treatments for the eleven components above**, since those propagate
   everywhere.
4. **The rating flame** — a version that keeps the identity without the
   saturation.
5. **An icon direction** to replace emoji.

Screens can follow once those are settled.
