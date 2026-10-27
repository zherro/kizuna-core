'use client';

import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useFilterTaxonomy } from '../search/filters/use-filter-taxonomy';
import { groupsWithCategories } from '../search/filters/filter-taxonomy';
import { FilterIcon } from '../search/filters/filter-parts';

export type SwipeTopicPickerProps = {
  /** Temas já escolhidos antes (slugs); vazio/ausente = nenhum marcado. */
  initial?: string[] | null;
  /** Chamado com os slugs marcados (sempre ao menos um). */
  onConfirm: (slugs: string[]) => void;
  /** Se informado, mostra "Voltar" para sair sem mudar a escolha. */
  onCancel?: () => void;
};

const LINK =
  'rounded-md px-2 py-1 text-sm font-medium text-primary outline-none hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring';

/** Questionário "Escolha o que descobrir hoje!": o usuário marca os temas (grupos) do deck. */
export function SwipeTopicPicker({ initial, onConfirm, onCancel }: SwipeTopicPickerProps) {
  const { taxonomy, loading, error, retry } = useFilterTaxonomy({ onlyWithListings: true });
  const groups = useMemo(() => groupsWithCategories(taxonomy), [taxonomy]);
  const [picked, setPicked] = useState<string[]>(initial ?? []);

  const toggle = (slug: string) =>
    setPicked((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]));
  const allSelected = groups.length > 0 && groups.every((g) => picked.includes(g.slug));
  const failed = !loading && groups.length === 0 && Boolean(error);

  return (
    <section
      aria-labelledby="swipe-topics-title"
      className="mx-auto flex h-full min-h-0 w-full max-w-xl flex-col"
    >
      <header className="px-4 pb-3 pt-6">
        <h1 id="swipe-topics-title" className="text-2xl font-bold leading-tight text-foreground">
          Escolha o que descobrir hoje!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Marque quantos quiser</p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div role="status" aria-label="Carregando temas" className="flex flex-wrap gap-2">
            {[88, 120, 100, 132, 96, 112, 104, 124].map((w, i) => (
              <div
                key={i}
                data-testid="topic-skeleton"
                style={{ width: w }}
                className="h-11 animate-pulse rounded-full bg-muted motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : failed ? (
          <div role="alert" className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-sm text-foreground">Não deu para carregar os temas.</p>
            <button
              type="button"
              onClick={retry}
              className="mt-3 min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Tentar de novo
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                className={LINK}
                onClick={() => setPicked(allSelected ? [] : groups.map((g) => g.slug))}
              >
                {allSelected ? 'Limpar' : 'Selecionar todos'}
              </button>
            </div>
            <ul className="flex flex-wrap gap-2" aria-label="Temas">
              {groups.map((g) => {
                const on = picked.includes(g.slug);
                return (
                  <li key={g.slug}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(g.slug)}
                      className={cn(
                        'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
                        on
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-foreground hover:bg-muted'
                      )}
                    >
                      {on ? (
                        <Check aria-hidden="true" className="size-4 shrink-0" />
                      ) : (
                        <FilterIcon name={g.icon} className="size-4 shrink-0" />
                      )}
                      <span>{g.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <footer className="flex items-center gap-2 border-t border-border bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-12 rounded-full border border-border px-5 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            Voltar
          </button>
        )}
        <button
          type="button"
          disabled={picked.length === 0}
          onClick={() => onConfirm(picked)}
          className="min-h-12 flex-1 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          Começar
        </button>
      </footer>
    </section>
  );
}
