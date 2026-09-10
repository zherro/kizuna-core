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
export declare const TONE_BORDER_L: Record<ThemeTone, string>;
/** For a solid-fill accent strip (e.g. a narrow `<td>` in a `border-collapse` table, where a
 * `border-l` on the row itself doesn't reliably render). */
export declare const TONE_BG: Record<ThemeTone, string>;
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
export declare const TONE_BADGE: Record<ThemeTone, string>;
/** Same as `TONE_BADGE` plus a matching tinted border — for `<Badge variant="outline">`, whose
 * outline variant otherwise has no border color of its own. */
export declare const TONE_BADGE_OUTLINE: Record<ThemeTone, string>;
/** Plain solid text color, no background/border — for a big number (a stat card's value) where a
 * tinted pill would be too heavy. */
export declare const TONE_TEXT: Record<ThemeTone, string>;
//# sourceMappingURL=ui-tone.d.ts.map