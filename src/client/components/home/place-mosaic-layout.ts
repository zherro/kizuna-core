/**
 * Helpers puros do bloco `PlaceMosaic` (sem JSX, sem `'use client'`): escolha determinística da
 * variante e das alturas, padrões de peças e sorteio. Nada aqui lê relógio ou `Math.random` por
 * conta própria, então servidor e hidratação sempre produzem o mesmo markup.
 */
import { normalizePlaceKicker } from './place-highlights-tone';

export type PlaceMosaicVariant = 'bento' | 'columns' | 'strips';
export type PlaceMosaicVariantProp = PlaceMosaicVariant | 'auto';

const AUTO_VARIANTS: readonly PlaceMosaicVariant[] = ['bento', 'columns', 'strips'];

/** FNV-1a 32 bits — estável entre ambientes. */
export function mosaicHash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Semente do dia ("AAAA-MM-DD") no fuso dado. Chame no SERVIDOR (loader/página) e passe como
 * `seed`: o cliente nunca recalcula a data, então a hidratação não diverge na virada do dia.
 */
export function mosaicDaySeed(date: Date = new Date(), timeZone = 'America/Sao_Paulo'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Variante efetiva. `auto` escolhe pela contagem (+ `seed`, ex.: o dia): poucos itens ficam em
 * `strips` (bento e colunas precisam de volume pra parecer mosaico); com 4+ a variante gira
 * entre as três de forma determinística.
 */
export function resolveMosaicVariant(
  variant: PlaceMosaicVariantProp,
  count: number,
  seed = ''
): PlaceMosaicVariant {
  if (variant !== 'auto') return variant;
  if (count < 4) return 'strips';
  return AUTO_VARIANTS[mosaicHash(`${seed}|${count}`) % AUTO_VARIANTS.length];
}

export type ColumnTileHeight = 'short' | 'medium' | 'tall';

/** Altura da peça na variante `columns`, pelo hash do título (não depende da foto). */
export function columnTileHeight(title: string): ColumnTileHeight {
  const heights: ColumnTileHeight[] = ['medium', 'tall', 'short', 'tall', 'medium', 'short'];
  return heights[mosaicHash(title.trim().toLowerCase()) % heights.length];
}

export type BentoTileKind = 'hero' | 'wide' | 'tall' | 'small';

/**
 * Padrão do bento: as 4 primeiras peças fecham um bloco de 4 colunas x 3 linhas (grande 2x3,
 * larga 2x1 e duas altas 1x2); depois repete [larga, pequena, pequena], que fecha linhas de 4.
 */
export function bentoTileKind(index: number): BentoTileKind {
  if (index === 0) return 'hero';
  if (index === 1) return 'wide';
  if (index === 2 || index === 3) return 'tall';
  return (index - 4) % 3 === 0 ? 'wide' : 'small';
}

/** Em `strips` (4 colunas no desktop) o destaque alterna de lado: 2-1-1 e 1-1-2. */
export function stripTileIsWide(index: number): boolean {
  const i = index % 6;
  return i === 0 || i === 5;
}

/** Grupos (kickers) únicos na ordem em que aparecem; mesma normalização da cor do grupo. */
export function uniqueKickers(items: { kicker: string }[]): { key: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const { kicker } of items) {
    const key = normalizePlaceKicker(kicker);
    if (key && !seen.has(key)) seen.set(key, kicker.trim());
  }
  return Array.from(seen, ([key, label]) => ({ key, label }));
}

/**
 * Sorteia um item. `rng` é injetável (teste). Com mais de um item evita repetir `avoidHref`
 * (o clique seguinte não "não faz nada"). Vazio → `null`.
 */
export function pickSurprise<T extends { href: string }>(
  items: T[],
  rng: () => number = Math.random,
  avoidHref?: string | null
): T | null {
  const pool = items.length > 1 && avoidHref ? items.filter((i) => i.href !== avoidHref) : items;
  if (pool.length === 0) return null;
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[index];
}

/** Cópia embaralhada (Fisher-Yates). `rng` é injetável (teste). */
export function shuffleItems<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
