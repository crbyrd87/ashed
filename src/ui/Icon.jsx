// Ashed — icon set
// Replaces every emoji used as interface iconography.
// One 24px grid, 1.5px stroke, round caps and joins. Colour comes from
// the `color` prop so icons can change with state — which emoji cannot.
//
// Usage:  <Icon.Search />                       // inherits textBody
//         <Icon.Search size={21} color={t.color.gold} />
//         <Icon.Flame filled />                 // the rating flame

import React from 'react';
import { color as c } from '../theme';

const S = ({ size = 21, color = c.textBody, children, label }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    role={label ? 'img' : 'presentation'}
    aria-label={label}
    aria-hidden={label ? undefined : true}
    focusable="false"
  >
    {children}
  </svg>
);

const FLAME_PATH =
  'M12 2C12 2 6 8 6 13a6 6 0 0012 0c0-3-2-5.5-2-5.5S14 10 12 10c0 0 1-3-0-8z';

// The rating flame. `filled` paints the ember gradient; otherwise it outlines.
// The gradient id is a module constant on purpose — do NOT generate it per
// render (the old FlameIcon called Math.random() inside the component body).
const EMBER_ID = 'ashed-ember';

export const EmberDefs = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
    <defs>
      <linearGradient id={EMBER_ID} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor={c.emberLow} />
        <stop offset="52%" stopColor={c.emberMid} />
        <stop offset="100%" stopColor={c.emberHigh} />
      </linearGradient>
    </defs>
  </svg>
);

const Flame = ({ size = 21, filled = true, label }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    role={label ? 'img' : 'presentation'}
    aria-label={label}
    aria-hidden={label ? undefined : true}
    focusable="false"
  >
    <path
      d={FLAME_PATH}
      fill={filled ? `url(#${EMBER_ID})` : 'none'}
      stroke={filled ? 'none' : c.borderStrong}
      strokeWidth={filled ? 0 : 1.4}
    />
  </svg>
);

const Icon = {
  Flame,

  // Tasks
  Search: (p) => (
    <S {...p}><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L20 20" /></S>
  ),
  Scan: (p) => (
    <S {...p}><path d="M4 9V6a2 2 0 012-2h3M20 9V6a2 2 0 00-2-2h-3M4 15v3a2 2 0 002 2h3M20 15v3a2 2 0 01-2 2h-3M3 12h18" /></S>
  ),
  Recommend: (p) => (
    <S {...p}><path d="M12 3.5l1.9 4.9 4.9 1.9-4.9 1.9L12 17.1l-1.9-4.9L5.2 10.3l4.9-1.9z" /><path d="M18.5 17.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" /></S>
  ),
  Drink: (p) => (
    <S {...p}><path d="M6 4h12l-4.5 6.5V19h2.5M6 4l4.5 6.5V19H8" /><path d="M7.2 8h9.6" /></S>
  ),
  Cigar: (p) => (
    <S {...p}><g transform="rotate(-32 12 12)"><rect x="3.5" y="9.5" width="17" height="5" rx="2.5" /><path d="M7.5 9.5v5" /><path d="M9.5 9.5v5" /></g></S>
  ),

  // Places
  Humidor: (p) => (
    <S {...p}><path d="M4 6h16v13a1 1 0 01-1 1H5a1 1 0 01-1-1z" /><path d="M4 9.5h16" /><path d="M10.5 13h3" /></S>
  ),
  Wishlist: (p) => (
    <S {...p}><path d="M6.5 4h11a1 1 0 011 1v15l-6.5-4.2L5.5 20V5a1 1 0 011-1z" /></S>
  ),
  Venue: (p) => (
    <S {...p}><path d="M12 21s6.5-6 6.5-10.5A6.5 6.5 0 0012 4a6.5 6.5 0 00-6.5 6.5C5.5 15 12 21 12 21z" /><circle cx="12" cy="10.5" r="2.4" /></S>
  ),
  Friends: (p) => (
    <S {...p}><circle cx="9" cy="8.5" r="3.2" /><path d="M3.5 19c0-3 2.5-4.8 5.5-4.8s5.5 1.8 5.5 4.8" /><path d="M16 6.2a3.2 3.2 0 010 6" /><path d="M17.5 14.6c1.9.5 3.2 1.9 3.2 4.4" /></S>
  ),
  Feed: (p) => (
    <S {...p}><path d="M4 7h16M4 12h16M4 17h10" /></S>
  ),

  // Chrome
  Bell: (p) => (
    <S {...p}><path d="M18 8a6 6 0 10-12 0c0 6-2 8-2 8h16s-2-2-2-8" /><path d="M10.5 20a2 2 0 003 0" /></S>
  ),
  Plus: (p) => (
    <S {...p}><path d="M12 5v14M5 12h14" /></S>
  ),
  Back: (p) => (
    <S {...p}><path d="M15 5l-7 7 7 7" /></S>
  ),
  Chevron: (p) => (
    <S {...p}><path d="M9 5l7 7-7 7" /></S>
  ),
  Close: (p) => (
    <S {...p}><path d="M6 6l12 12M18 6L6 18" /></S>
  ),
  Check: (p) => (
    <S {...p}><path d="M5 12.5l4.5 4.5L19 7" /></S>
  ),
  Send: (p) => (
    <S {...p}><path d="M12 19V5M5 12l7-7 7 7" /></S>
  ),
  Camera: (p) => (
    <S {...p}><path d="M3 8.5h3.5L8 6h8l1.5 2.5H21v11H3z" /><circle cx="12" cy="13.5" r="3.6" /></S>
  ),
  Settings: (p) => (
    <S {...p}><circle cx="12" cy="12" r="3.2" /><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" /></S>
  ),
};

export default Icon;
