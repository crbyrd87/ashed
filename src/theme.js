// Ashed — design tokens
// Direction: "members' club" — restrained, dark, gold as a hairline not a fill.
// From the 29 Aug 2026 design handoff. See "Ashed Redesign/handoff/DESIGN.md".
//
// ── One change from the delivered file ────────────────────────────────────
// The handoff shipped the old token names as a separate `legacy` export. That
// does not do what it intends: the app says `color.muted`, not `legacy.muted`,
// so 1,406 references across 37 tokens would have resolved to `undefined` —
// legal JavaScript, a passing build, and missing colours everywhere. The
// aliases are therefore merged INTO `color` below, which is what makes a
// file-by-file migration actually possible.
//
// The old size names are deliberately NOT merged. Several collide with new
// names at different values — old `type.md` was 13, new `type.md` is 17 — so
// merging them would silently resize text. The handful of call sites using old
// size names were updated instead.

// ── The new palette ───────────────────────────────────────────────────────
const base = {
  // Grounds
  bg:            '#14100D', // page
  surface:       '#1C1713', // cards, sheets, selected rail row
  surfaceRaised: '#241E19', // inputs, chips, pressed rows
  surfaceSunken: '#100D0A', // read notification rows

  // Lines
  border:       '#2E2721', // hairline dividers — the default
  borderStrong: '#3D342C', // outlined controls, avatar rings, input borders

  // Text (contrast measured against bg #14100D)
  textPrimary: '#F2EAE0', // headings                  15.9:1
  textBody:    '#DCD2C6', // body, row labels          12.8:1
  textMuted:   '#A2968A', // secondary, metadata        7.9:1
  textFaint:   '#7D7168', // timestamps, legal          4.7:1  ← AA floor

  // Gold — the member-facing accent
  gold:    '#C9A84C', // hairlines, numerals, the ONE filled button
  goldDim: '#A8905A', // gold on gold, disabled gold

  // Semantic
  positive:   '#6E9B78',
  danger:     '#B4674A', // borders, icons, non-zero flag counts
  dangerText: '#D99B7E', // danger copy that has to be READ on dark
  alert:      '#C87740', // unread count bubbles — the ember mid tone

  // Ember — the rating flame, desaturated ~35% from #cc2200 → #ff6600 → #ffcc00
  emberLow:  '#A8462A',
  emberMid:  '#C87740',
  emberHigh: '#D9A65C',

  // Internal tools. One accent per surface so you always know where you are,
  // and neither is ever a fill behind text. See ADMIN-PARTNER.md.
  partner:     '#8C96A2', // partner dashboard — slate
  partnerDeep: '#5F6874',
  partnerPale: '#AEB7C2',
  admin:       '#948AA0', // admin console — mauve
  adminDeep:   '#655C70',

  white:   '#FFFFFF',
  unknown: '#7D7168', // fallback when a strength is unrecognised
};

// ── Migration aliases ─────────────────────────────────────────────────────
// Old name on the left, new token on the right. Several old names collapse
// into one new token; that collapse is the point. Delete an entry once no
// file references it. None of these names collide with a `base` key.
const aliases = {
  // grounds
  surfaceWarm: base.surface, // was #2d1810, the header gradient top
  surfaceDeep: base.bg,
  surfaceAlt:  base.surface,
  surfaceCard: base.surface,
  // lines
  line:       base.border,
  lineStrong: base.borderStrong,
  lineInput:  base.borderStrong,
  // text
  heading:  base.textPrimary,
  text:     base.textBody,
  soft:     base.textBody,
  cream:    base.textMuted,
  tan:      base.textMuted,
  muted:    base.textMuted,
  dim:      base.textFaint,
  dimAlt:   base.textFaint,
  faint:    base.textFaint, // ← the 2:1 contrast fix
  faintAlt: base.textFaint,
  faintDim: base.textFaint,
  // gold — the second ramp is gone
  goldDeep:   base.goldDim,
  goldLegacy: base.gold,
  goldPale:   base.gold,
  goldMuted:  base.goldDim,
  // green
  green:       base.positive,
  greenBright: base.positive,
  greenDeep:   base.positive,
  greenPale:   base.positive,
  greenDim:    base.positive,
  // ember
  ember:     base.emberLow,
  emberDeep: base.emberLow,
  // misc — pick a real token at the call site when you touch these
  plum:  base.admin,
  cedar: base.borderStrong,
};

export const color = { ...base, ...aliases };

// Kept so the handoff's own examples resolve; `color` already includes these.
export const legacy = aliases;

// Rating flame gradient. Bottom to top. Use as an SVG linearGradient.
export const emberStops = [
  { offset: '0%',   color: color.emberLow  },
  { offset: '52%',  color: color.emberMid  },
  { offset: '100%', color: color.emberHigh },
];

// Five levels. Names are fixed; colours muted from the originals.
// This map was previously declared in five files with two different sets of
// values — Feed.js had its own. Import from here only.
export const strength = {
  'Mild':        '#9DAF93',
  'Mild-Medium': '#AFBC8E',
  'Medium':      '#C4A87C',
  'Medium-Full': '#B58255',
  'Full':        '#9A5F42',
};

export const strengthColor = (s) => strength[s] || color.unknown;

export const font = {
  // Bundled via @fontsource — see DESIGN.md §2
  display: "'Spectral', Georgia, 'Times New Roman', serif",
  sans:    "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono:    "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace",
};

// Type scale. 13 is the floor — nothing renders below it.
// Inputs use md (17) so iOS Safari never zooms on focus.
export const type = {
  xs:  13, // timestamps, captions, uppercase labels
  sm:  15, // secondary, metadata
  md:  17, // body, row labels, buttons, ALL inputs
  lg:  21, // section headings, cigar names in lists
  xl:  26, // screen questions
  xxl: 30, // home greeting, large stat numerals
};

export const weight = {
  displayLight: 300, // serif at 26px and up
  displayMed:   500, // serif at 17–21px
  body:         400,
  bodyMed:      500,
  bodyBold:     600, // buttons only
};

export const space  = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 30 };
export const radius = { sm: 6, md: 12, lg: 14, pill: 20, sheet: 20 };

// Letter-spacing for the uppercase SectionLabel treatment.
export const TRACK_LABEL = '0.16em';

// Minimum tap target. Satisfies both Apple (44) and Material (48).
// Does NOT apply to admin/partner, which are desk tools — see ADMIN-PARTNER.md.
export const TAP = 48;

export const layout = {
  maxWidth:     420,  // the app column
  partnerWidth: 900,
  adminWidth:   1140, // AdminConsole is 900 today; widen it
  overlayZ:     300,
  navZ:         100,
  toastZ:       500,
};

// The old default font export. Most call sites want font.sans; this keeps the
// 302 existing `SANS` references working until each file is migrated.
export const SANS = font.sans;

// Retired. The old flame gradient — use emberStops.
export const flame = {
  base: color.emberLow,
  mid:  color.emberMid,
  tip:  color.emberHigh,
};
