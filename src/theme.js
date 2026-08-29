// Ashed design tokens.
//
// WHAT THIS IS: every colour, size and spacing value the app already uses,
// given a name. Nothing here is new. Migrating a file to these tokens must not
// change a single pixel — that is the check for this work.
//
// WHY IT EXISTS: these values were written out by hand in ~20 files, 2,404
// colour literals across 115 distinct colours. Changing the gold meant editing
// twenty files and hoping none were missed. Now it is one line here.
//
// DUPLICATES ARE PRESERVED ON PURPOSE. The palette has real redundancy — two
// golds, several near-identical browns for the same role. Collapsing them is a
// visible change, so it does not belong in a rename. Each one is marked RETIRE
// below with what it should become. That is a separate, deliberate step.

export const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export const color = {
  // ---- Grounds ---------------------------------------------------------
  bg:            "#1a0f08",  // page background, also set in index.css
  surface:       "#221508",  // cards
  surfaceRaised: "#2a1a0e",  // cards that sit on other cards, inputs
  surfaceSunken: "#1e1208",  // read notification rows
  surfaceWarm:   "#2d1810",  // gradient top on headers
  surfaceDeep:   "#1a0d06",  // RETIRE -> bg. 5 uses, one file.
  surfaceAlt:    "#2a1508",  // RETIRE -> surface. 7 uses, two files.
  surfaceCard:   "#261a0a",  // RETIRE -> surface. 3 uses, one file.

  // ---- Lines -----------------------------------------------------------
  line:       "#3a2510",  // default border
  lineStrong: "#4a3520",  // border that needs to read as a divider
  lineInput:  "#4a3020",  // RETIRE -> lineStrong. 23 uses.

  // ---- Text ------------------------------------------------------------
  heading: "#f5ead8",  // headings
  text:    "#e8d5b7",  // body
  soft:    "#ddc9a8",  // slightly recessed body
  cream:   "#c8b89a",  // labels on admin surfaces
  tan:     "#a08060",  // secondary text
  muted:   "#8a7055",  // the standard muted label
  dim:     "#7a6048",  // more recessed than muted
  dimAlt:  "#7a6050",  // RETIRE -> dim. 6 uses; differs by 8 in one channel.
  // faint fails contrast on bg at roughly 2:1 and carries loading text,
  // timestamps and legal copy. Design review rec 9 raises this ramp; the
  // value is unchanged here so the rename stays invisible.
  faint:    "#5a4535",
  faintAlt: "#5a4030",  // RETIRE -> faint. 10 uses, two files.
  faintDim: "#6a5040",  // RETIRE -> faint. 9 uses, one file.

  // ---- Gold ------------------------------------------------------------
  gold:     "#c9a84c",  // canonical. 254 uses across 18 files.
  goldDeep: "#a07830",  // the dark end of the gold gradient
  // RETIRE -> gold. 144 uses across 6 files. The two are close but not equal,
  // so swapping them IS a visible change and is deliberately not done here.
  goldLegacy: "#d4b45a",
  goldPale:   "#e8cc7a",  // premium pip
  goldMuted:  "#8a7a4a",  // RETIRE -> goldDeep. 6 uses.

  // ---- Green -----------------------------------------------------------
  green:       "#7a9a7a",  // community/verified accents. 123 uses.
  greenBright: "#4caf6e",  // primary CTA
  greenDeep:   "#4a7a4a",
  greenPale:   "#a0c4a0",
  greenDim:    "#5a7a5a",  // RETIRE -> greenDeep. 4 uses, one file.

  // ---- Warning and danger ----------------------------------------------
  danger:     "#a0522d",  // also Full on the strength scale
  dangerText: "#e8a07a",  // readable danger copy on dark
  alert:      "#e8632a",  // unread count bubbles
  ember:      "#8a3a2a",
  emberDeep:  "#6a2a1a",

  // ---- Partner dashboard ------------------------------------------------
  // A separate identity for the venue-partner surface. The design review's
  // palette missed these entirely.
  partner:      "#7a8a9a",
  partnerDeep:  "#5a6a7a",
  partnerPale:  "#a0b0c0",

  // ---- Misc -------------------------------------------------------------
  plum:  "#9a7a9a",  // Phase 4 accent in the tracker
  cedar: "#7a4a20",  // avatar gradient end
  white: "#fff",
  unknown: "#888",   // fallback when a strength is unrecognised
};

// Five levels since Aug 2026. `Light` is gone — any code still using it is a
// bug. Declared in five files today; they should all import this instead.
export const strength = {
  "Mild":        "#a8c5a0",
  "Mild-Medium": "#b8d4a0",
  "Medium":      "#d4b483",
  "Medium-Full": "#c4894a",
  "Full":        "#a0522d",
};

export const strengthColor = (s) => strength[s] || color.unknown;

// Bottom to top, as used by the rating flames and the app icon.
export const flame = {
  base: "#cc2200",
  mid:  "#ff6600",
  tip:  "#ffcc00",
};

// 21 distinct sizes are in use across 1,000 declarations. These are the ones
// that carry real weight. Note xs and xxs sit below the 13px floor the design
// review asks for — 94 uses today. Named so that work has something to change.
export const type = {
  xxs: 10,
  xs:  11,
  sm:  12,
  md:  13,
  base: 14,
  lg:  15,
  input: 16,  // never go below this: smaller makes iOS Safari zoom on focus
  xl:  18,
  h3:  20,
  h2:  22,
  h1:  28,
};

export const weight = {
  normal: 400,
  medium: 600,
  bold:   700,
};

export const radius = {
  xs:   4,
  sm:   6,
  md:   8,
  lg:   10,
  xl:   12,
  xxl:  16,  // overlay panels
  pill: 20,
};

export const space = {
  xxs: 2,
  xs:  4,
  sm:  6,
  md:  8,
  lg:  10,
  xl:  12,
  xxl: 16,
};

export const layout = {
  // The app column. UserProfileModal uses 480 in three places, which design
  // review rec 27 flags as an inconsistency to settle inside a Sheet primitive.
  maxWidth: 420,
  overlayZ: 300,
  navZ:     100,
  toastZ:   500,
};
