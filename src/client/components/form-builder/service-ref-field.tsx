'use client';

import { useEffect, useId, useState } from 'react';
import { Link2, Loader2, MapPin, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { cn } from '../../../lib/utils';
import {
  buildServiceRefSearchBodies,
  humanizeServiceRefValue,
  pickServiceRefOptions,
  resolveServiceRefValue,
  searchServiceRefRows,
  type ServiceRefOption,
} from './service-ref';
import type { ServiceRefFilter } from './types';

const DEBOUNCE_MS = 250;

export type ServiceRefPickerProps = {
  id: string;
  /** chosen ad `uid` (or empty) */
  value: unknown;
  filter?: ServiceRefFilter;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  onChange: (uid: string | undefined) => void;
};

/**
 * Combobox of active ads (`service-ref` field): searches by title through the public search RPC
 * (one call per group of the filter), shows title + city, stores the ad `uid`. A saved value with
 * no known title (a uid, or a code written by an importer) is resolved to title + city; not found
 * = the value itself, readable.
 */
export function ServiceRefPicker({
  id,
  value,
  filter,
  placeholder,
  disabled,
  readOnly,
  onChange,
}: ServiceRefPickerProps) {
  const listId = useId();
  const uid = typeof value === 'string' && value ? value : '';
  const [picked, setPicked] = useState<ServiceRefOption | null>(null);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<ServiceRefOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [resolved, setResolved] = useState<{ value: string; option: ServiceRefOption | null } | null>(null);
  const groupKey = [filter?.groupSlug ?? '', ...(filter?.groupSlugs ?? [])].join('|');
  const categoryKey = (filter?.categorySlugs ?? []).join('|');

  useEffect(() => {
    if (!uid || (picked && picked.uid === uid) || resolved?.value === uid) return;
    let alive = true;
    resolveServiceRefValue(uid).then((option) => {
      if (alive) setResolved({ value: uid, option });
    });
    return () => {
      alive = false;
    };
  }, [uid, picked, resolved]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setOptions([]);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setFailed(false);
      try {
        const [groupSlug, ...groupSlugs] = groupKey.split('|');
        const bodies = buildServiceRefSearchBodies({ groupSlug, groupSlugs }, q);
        const batches = await Promise.all(bodies.map((b) => searchServiceRefRows(b)));
        if (ctrl.signal.aborted) return;
        const seen = new Set<string>();
        const rows = batches.flat().filter((r) => {
          const id = String(r.uid ?? '');
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        const categorySlugs = categoryKey ? categoryKey.split('|') : undefined;
        setOptions(pickServiceRefOptions(rows, { categorySlugs }));
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setOptions([]);
        setFailed(true);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, groupKey, categoryKey]);

  if (uid) {
    const known =
      picked && picked.uid === uid ? picked : resolved?.value === uid ? resolved.option : null;
    const pending = !known && resolved?.value !== uid;
    return (
      <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
        <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          {known ? (
            <>
              <p className="truncate font-medium">{known.title}</p>
              {known.city && <p className="truncate text-xs text-muted-foreground">{known.city}</p>}
            </>
          ) : (
            <p className="flex items-center gap-2 truncate text-muted-foreground">
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              {humanizeServiceRefValue(uid)}
            </p>
          )}
        </div>
        {!disabled && !readOnly && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            aria-label="Remover vínculo"
            onClick={() => {
              setPicked(null);
              setQuery('');
              onChange(undefined);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  const open = query.trim() !== '';
  return (
    <div className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder || 'Busque pelo nome do anúncio'}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled}
        readOnly={readOnly}
      />
      {open && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
        >
          {loading && options.length === 0 ? (
            <p className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Buscando…
            </p>
          ) : options.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              {failed ? 'Não foi possível buscar agora.' : 'Nenhum anúncio encontrado.'}
            </p>
          ) : (
            options.map((o) => (
              <button
                key={o.uid}
                type="button"
                role="option"
                aria-selected={false}
                className={cn(
                  'flex w-full flex-col items-start rounded-sm px-2 py-1.5 text-left text-sm',
                  'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:outline-none'
                )}
                onClick={() => {
                  setPicked(o);
                  setQuery('');
                  onChange(o.uid);
                }}
              >
                <span className="w-full truncate font-medium">{o.title}</span>
                {o.city && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" aria-hidden />
                    {o.city}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
