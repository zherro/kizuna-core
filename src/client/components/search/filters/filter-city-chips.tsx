'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { MapPin, Plus, Search, X } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { cityLabel, searchCities, type CityOption } from './filter-cities';
import { Collapse, Enter, useMountedFlag } from './filter-motion';
import { FilterNotice } from './filter-parts';

type Props = {
  /** cidades em vigor (IBGE) */
  selectedIds: string[];
  /** catálogo (`/api/location/cities`) — resolve nomes e alimenta o mini-seletor */
  cities: CityOption[];
  loading?: boolean;
  error?: boolean;
  /** lista de cidades difere do padrão da busca (cidade do cabeçalho + irmãs) */
  isCustom: boolean;
  /** sigla da UF, só pro texto "Estado inteiro (MT)" */
  stateCode?: string;
  /** nova lista de IBGEs (adicionar / remover) */
  onChange: (next: string[]) => void;
  /** "voltar ao padrão" */
  onResetDefault: () => void;
};

/**
 * Localização do filtro: chips de cidade com × e um mini-seletor inline ("+ Adicionar cidade").
 * Não usa o `LocationModal` — aquele troca a cidade do cabeçalho; aqui só se escolhe onde buscar.
 */
export function FilterCityChips({
  selectedIds,
  cities,
  loading = false,
  error = false,
  isCustom,
  stateCode,
  onChange,
  onResetDefault,
}: Props) {
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const ready = useMountedFlag();

  const results = useMemo(
    () => searchCities(cities, query, selectedIds),
    [cities, query, selectedIds]
  );
  const wholeState = selectedIds.length === 0;

  useEffect(() => {
    if (picking) inputRef.current?.focus();
  }, [picking]);

  function closePicker(returnFocus: boolean) {
    setPicking(false);
    setQuery('');
    if (returnFocus) addRef.current?.focus();
  }

  function add(id: string) {
    onChange([...selectedIds, id]);
    closePicker(true);
  }

  return (
    <div className="flex flex-col gap-2">
      {wholeState ? (
        <Enter animate={ready} className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-muted px-3 text-sm text-foreground">
            <MapPin aria-hidden="true" className="size-4 text-primary" />
            Estado inteiro{stateCode ? ` (${stateCode})` : ''}
          </span>
          <button
            type="button"
            onClick={onResetDefault}
            className="min-h-9 rounded text-sm text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0 sm:text-xs"
          >
            voltar ao padrão
          </button>
        </Enter>
      ) : (
        <ul className="flex flex-wrap gap-2" aria-label="Cidades da busca">
          {selectedIds.map((id) => {
            const label = cityLabel(cities, id, loading);
            return (
              <li key={id}>
                <Enter
                  as="span"
                  variant="pop"
                  duration={180}
                  animate={ready}
                  className="inline-flex min-h-11 items-center gap-1 rounded-full bg-primary/10 pl-3 pr-1 text-sm text-foreground sm:min-h-8 sm:text-xs"
                >
                  <MapPin aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
                  <span className="max-w-[10rem] truncate">{label}</span>
                  <button
                    type="button"
                    aria-label={`Remover ${label}`}
                    onClick={() => onChange(selectedIds.filter((c) => c !== id))}
                    className="-my-1.5 -mr-1.5 inline-flex size-11 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-primary/15 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none sm:m-0 sm:size-6"
                  >
                    <X aria-hidden="true" className="size-4 sm:size-3.5" />
                  </button>
                </Enter>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          ref={addRef}
          type="button"
          aria-expanded={picking}
          aria-controls={listId}
          onClick={() => (picking ? closePicker(false) : setPicking(true))}
          className={cn(
            'inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium outline-none transition-colors duration-150 sm:min-h-8 sm:text-xs',
            'focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
            picking ? 'bg-primary/10 text-primary' : 'text-primary hover:bg-primary/10'
          )}
        >
          <Plus
            aria-hidden="true"
            className={cn(
              'size-4 transition-transform duration-200 motion-reduce:transition-none',
              picking && 'rotate-45'
            )}
          />
          Adicionar cidade
        </button>
        {isCustom && !wholeState && (
          <button
            type="button"
            onClick={onResetDefault}
            className="min-h-9 rounded text-sm text-muted-foreground underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0 sm:text-xs"
          >
            voltar ao padrão
          </button>
        )}
      </div>

      <Collapse open={picking}>
        <div id={listId} className="flex flex-col gap-1.5 pb-1">
          <label className="relative block">
            <span className="sr-only">Buscar cidade</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              placeholder="Buscar cidade..."
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  closePicker(true);
                } else if (e.key === 'Enter' && results[0]) {
                  e.preventDefault();
                  add(results[0].value);
                }
              }}
              className="h-11 w-full rounded-[var(--ui-radius-field,0.375rem)] border border-input bg-background pl-8 pr-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9 sm:text-sm"
            />
          </label>

          {error ? (
            <FilterNotice tone="danger">
              Não deu para carregar as cidades. Tente de novo em instantes.
            </FilterNotice>
          ) : loading && cities.length === 0 ? (
            <p className="px-1 py-2 text-sm text-muted-foreground">Carregando cidades…</p>
          ) : results.length === 0 ? (
            <p className="px-1 py-2 text-sm text-muted-foreground">
              {query.trim() ? 'Nenhuma cidade com esse nome.' : 'Todas as cidades já estão na busca.'}
            </p>
          ) : (
            <ul className="flex flex-col" aria-label="Cidades encontradas">
              {results.map((city) => (
                <li key={city.value}>
                  <button
                    type="button"
                    onClick={() => add(city.value)}
                    aria-label={`${city.label} – ${city.stateCode}`}
                    className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[var(--ui-radius-card-sm,0.5rem)] px-2.5 text-left text-base outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none sm:min-h-9 sm:text-sm"
                  >
                    <span className="truncate">{city.label}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{city.stateCode}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Collapse>
    </div>
  );
}
