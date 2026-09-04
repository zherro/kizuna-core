/**
 * Shared semantic-tone vocabulary for list/table rows across `/painel` — `success`/`warning`/
 * `danger`/`info`/`muted`, backed by theme tokens the consuming project defines in its global CSS
 * (`--success`, `--warning`, `--danger`, `--info`, `--border`), never a fixed Tailwind palette
 * color (`amber-100`, `blue-100`...). Using these means a row's color follows whichever tenant
 * theme is active instead of staying fixed regardless of theme.
 *
 * Add a new consumer by importing from here — don't re-declare another copy of this map. Core
 * consumers: `list-block.tsx` (status badges), `responsive-resource-table.tsx` (row/card accent
 * strip), `entity-list-card.tsx` (card accent strip), `filter-stat-card.tsx` (stat value color).
 */
export type ThemeTone = 'success' | 'warning' | 'danger' | 'info' | 'muted';

/** For a `border-l-4` accent strip on a card or table row. */
export const TONE_BORDER_L: Record<ThemeTone, string> = {
  success: 'border-l-success',
  warning: 'border-l-warning',
  danger: 'border-l-danger',
  info: 'border-l-info',
  muted: 'border-l-border',
};

/** For a solid-fill accent strip (e.g. a narrow `<td>` in a `border-collapse` table, where a
 * `border-l` on the row itself doesn't reliably render). */
export const TONE_BG: Record<ThemeTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  muted: 'bg-border',
};

/**
 * For a pill/badge — solid background, no border, white text. Fixed white (not the theme's
 * light/dark-flipping `--foreground`) because `success`/`warning`/`danger`/`info` are themselves
 * mid-to-light accent hues in every theme preset and in dark mode — a translucent `/15` fill +
 * `text-{tone}` used to pair light-yellow text with a light-yellow `warning` badge, nearly
 * invisible.
 *
 * Each background is the token darkened via `color-mix()` (not the raw `--{tone}` value) — plain
 * `bg-success`/`bg-warning`/etc. are light enough that white text still reads weak on them,
 * `warning` worst of all (hence its higher mix ratio below). `muted` is a real neutral (not a
 * light accent), so it keeps the standard `text-muted-foreground` pairing instead.
 */
export const TONE_BADGE: Record<ThemeTone, string> = {
  success: 'bg-[color-mix(in_oklch,var(--success)_100%,black_20%)] text-white',
  warning: 'bg-[color-mix(in_oklch,var(--warning)_100%,black_35%)] text-white',
  danger: 'bg-[color-mix(in_oklch,var(--danger)_100%,black_15%)] text-white',
  info: 'bg-[color-mix(in_oklch,var(--info)_100%,black_20%)] text-white',
  muted: 'bg-muted text-muted-foreground',
};

/** Same as `TONE_BADGE` plus a matching tinted border — for `<Badge variant="outline">`, whose
 * outline variant otherwise has no border color of its own. */
export const TONE_BADGE_OUTLINE: Record<ThemeTone, string> = {
  success: 'bg-success/15 text-success border-success/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  info: 'bg-info/15 text-info border-info/30',
  muted: 'bg-muted text-muted-foreground border-border',
};

/** Plain solid text color, no background/border — for a big number (a stat card's value) where a
 * tinted pill would be too heavy. */
export const TONE_TEXT: Record<ThemeTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
  muted: 'text-muted-foreground',
};
