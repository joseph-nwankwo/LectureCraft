/**
 * UAMSA Craft Suite — canonical brand tokens
 * Shared across LectureSuite, ScholarCraft, and all future UAMSATech products.
 * Use these when you need JS-land color values (inline styles, canvas, charting).
 * For Tailwind/CSS, use the CSS custom properties (--brand-navy, etc.) defined in globals.css.
 */
export const BRAND = {
  navy:     '#0a2540',
  navyDark: '#051526',
  gold:     '#c9a227',
  blue:     '#2f6feb',
} as const

export type BrandColor = keyof typeof BRAND

/**
 * Semantic aliases for JS-land usage (canvas, recharts, print, email).
 * For all CSS/Tailwind use, prefer the CSS custom properties instead.
 * primary → Professional Blue (matches --primary in globals.css)
 */
export const COLOR = {
  primary:   '#1D4ED8',
  secondary: BRAND.gold,
  accent:    BRAND.blue,
  darkBg:    BRAND.navyDark,
} as const

export const SURFACE = {
  page: 'var(--background)',
  card: 'var(--card)',
  sidebar: 'var(--sidebar)',
} as const

export const TEXT = {
  primary: 'var(--text-primary)',
  secondary: 'var(--text-secondary)',
  muted: 'var(--muted-foreground)',
} as const

export const SHADOW = {
  card: 'var(--shadow-card-value)',
  dropdown: 'var(--shadow-dropdown-value)',
} as const

export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
} as const

/** Border radius scale — matches UAMSA 0.625rem base */
export const RADIUS = {
  sm:   '0.375rem',  //  6px
  md:   '0.5rem',    //  8px
  lg:   '0.625rem',  // 10px — UAMSA base
  xl:   '0.875rem',  // 14px
  '2xl':'1rem',      // 16px
  full: '9999px',
} as const

/** Typography scale labels */
export const FONT_FAMILY = {
  sans: "'IBM Plex Sans', system-ui, -apple-system, sans-serif",
  mono: "'IBM Plex Mono', 'Fira Code', ui-monospace, monospace",
} as const
