import { faixaLabel, tipoLabel } from './turismo-labels';

/** O que o filtro precisa saber de um lugar. */
export type FilterablePlace = { tipo: string; faixaPreco?: string | null; regiao?: string | null };

export type PlaceFilters = { tipo: string | null; faixa: string | null; regiao: string | null };

export const NO_FILTERS: PlaceFilters = { tipo: null, faixa: null, regiao: null };

export type FilterOption = { value: string; label: string; count: number };

export type FilterOptions = { tipos: FilterOption[]; faixas: FilterOption[]; regioes: FilterOption[] };

export const hasActiveFilters = (f: PlaceFilters): boolean => Boolean(f.tipo || f.faixa || f.regiao);

export function filterPlaces<T extends FilterablePlace>(items: T[], f: PlaceFilters): T[] {
  return items.filter(
    (p) =>
      (!f.tipo || p.tipo === f.tipo) &&
      (!f.faixa || p.faixaPreco === f.faixa) &&
      (!f.regiao || p.regiao === f.regiao)
  );
}

const TIPO_ORDER = ['dormir', 'comer', 'atracao'];
const FAIXA_ORDER = ['$', '$$', '$$$'];

function count<T>(items: T[], pick: (item: T) => string | null | undefined): Map<string, number> {
  const out = new Map<string, number>();
  for (const item of items) {
    const v = pick(item);
    if (v) out.set(v, (out.get(v) ?? 0) + 1);
  }
  return out;
}

/** "bairro-do-porto" -> "Bairro do Porto" quando a região não veio na lista de títulos. */
function humanize(slug: string): string {
  return slug
    .split('-')
    .map((w, i) => (i > 0 && ['do', 'da', 'de', 'dos', 'das'].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/**
 * Opções de filtro só com o que existe nos lugares (com contagem). Uma dimensão com menos de 2
 * opções é devolvida vazia: filtrar por algo que todos os lugares têm igual não ajuda ninguém.
 */
export function buildFilterOptions(
  items: FilterablePlace[],
  regioes: { slug: string; title: string }[] = []
): FilterOptions {
  const titles = new Map(regioes.map((r) => [r.slug, r.title]));
  const pack = (m: Map<string, number>, label: (v: string) => string, order?: string[]): FilterOption[] => {
    const opts = [...m].map(([value, n]) => ({ value, label: label(value), count: n }));
    opts.sort((a, b) =>
      order
        ? (order.indexOf(a.value) + 1 || 99) - (order.indexOf(b.value) + 1 || 99)
        : a.label.localeCompare(b.label, 'pt-BR')
    );
    return opts.length >= 2 ? opts : [];
  };
  return {
    tipos: pack(count(items, (p) => p.tipo), (v) => tipoLabel(v, true), TIPO_ORDER),
    faixas: pack(count(items, (p) => p.faixaPreco), (v) => `${v} ${faixaLabel(v)}`, FAIXA_ORDER),
    regioes: pack(count(items, (p) => p.regiao), (v) => titles.get(v) ?? humanize(v)),
  };
}
