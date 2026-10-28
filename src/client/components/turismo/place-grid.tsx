'use client';

import { useMemo, useState } from 'react';
import { PlaceCard, type TurismoPlaceItem } from './place-card';
import {
  buildFilterOptions,
  filterPlaces,
  hasActiveFilters,
  NO_FILTERS,
  type FilterOption,
  type PlaceFilters,
} from './place-filter';
import { lugaresLabel } from './turismo-labels';
import { FOCUS_RING } from './turismo-media';
import { TurismoEmpty } from './turismo-empty';
import { TurismoGrid } from './turismo-section';

export type PlaceGridProps = {
  items: TurismoPlaceItem[];
  /** Títulos das regiões para o filtro (slug -> título). Sem título, o slug é formatado. */
  regioes?: { slug: string; title: string }[];
  /** Props do estado vazio (lista sem nenhum lugar publicado). */
  empty?: { title?: string; description?: string; actionHref?: string; actionLabel?: string };
};

function Chips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: FilterOption[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <span className="shrink-0 text-sm font-semibold text-muted-foreground">{label}</span>
      <div className="-mr-4 flex gap-2 overflow-x-auto pb-1 pr-4 [scrollbar-width:none] sm:mr-0 sm:flex-wrap sm:overflow-visible sm:pb-0 sm:pr-0 [&::-webkit-scrollbar]:hidden">
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? null : o.value)}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-bold transition-colors ${FOCUS_RING} ${
                on ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground ring-1 ring-border hover:ring-primary/50'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Grade de lugares com filtro por tipo, faixa de preço e região. Só aparecem os filtros que
 * ajudam (pelo menos 2 opções reais). Sem lugares: estado vazio. Filtro sem resultado: aviso
 * com botão para limpar. Cartões no mesmo padrão de largura da home e da busca.
 */
export function PlaceGrid({ items, regioes = [], empty }: PlaceGridProps) {
  const [filters, setFilters] = useState<PlaceFilters>(NO_FILTERS);
  const options = useMemo(() => buildFilterOptions(items, regioes), [items, regioes]);
  const shown = useMemo(() => filterPlaces(items, filters), [items, filters]);

  if (items.length === 0) return <TurismoEmpty {...empty} />;

  const set = (key: keyof PlaceFilters) => (v: string | null) => setFilters((f) => ({ ...f, [key]: v }));
  const hasFilters = options.tipos.length + options.faixas.length + options.regioes.length > 0;

  return (
    <div>
      {hasFilters ? (
        <div className="mb-6 flex flex-col gap-2">
          <Chips label="Tipo" options={options.tipos} value={filters.tipo} onChange={set('tipo')} />
          <Chips label="Preço" options={options.faixas} value={filters.faixa} onChange={set('faixa')} />
          <Chips label="Região" options={options.regioes} value={filters.regiao} onChange={set('regiao')} />
        </div>
      ) : null}
      <p aria-live="polite" className="mb-4 text-sm text-muted-foreground">
        {lugaresLabel(shown.length)}
      </p>
      {shown.length > 0 ? (
        <TurismoGrid>
          {shown.map((item) => (
            <PlaceCard key={item.href} item={item} />
          ))}
        </TurismoGrid>
      ) : (
        <div className="rounded-3xl border border-dashed border-border px-6 py-10 text-center">
          <p className="font-display text-lg font-black">Nenhum lugar com esses filtros</p>
          <p className="mt-1 text-sm text-muted-foreground">Tire um filtro para ver mais opções.</p>
          {hasActiveFilters(filters) ? (
            <button
              type="button"
              onClick={() => setFilters(NO_FILTERS)}
              className={`mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground ${FOCUS_RING}`}
            >
              Limpar filtros
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
