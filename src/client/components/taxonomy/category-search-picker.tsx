'use client';

import { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { ColorChip } from '../ui-better-soft/color-chip';
import { TaxonomyIcon } from './taxonomy-icon';

export type CategorySearchItem = {
  id: string | number;
  name: string;
  description?: string | null;
  icon?: string | null;
  /** Texto extra pesquisável (grupo, tags, subcategorias…) — a busca acha por qualquer nível,
   * não só pelo nome. Quem chama monta; o picker não conhece o domínio. */
  searchText?: string;
};

export type CategorySearchLabels = {
  prompt?: string;
  placeholder?: string;
  empty?: string;
  loading?: string;
  loadMore?: string;
};

const DEFAULT_LABELS: Required<CategorySearchLabels> = {
  prompt: 'Qual categoria de serviço você precisa?',
  placeholder: 'Buscar, ex.: pintura, mudança, site...',
  empty: 'Nenhuma categoria encontrada.',
  loading: 'Carregando categorias…',
  loadMore: 'Carregar mais categorias',
};

// Sem acento, minúsculo — "elétrica" e "eletrica" (ou "casamento" com espaço extra) casam igual.
export function normalizeCategorySearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/**
 * Seletor de categoria com busca + grade + "carregar mais". Componente default de categoria do
 * wizard de serviços e do "criar demanda" do foco-total. Só mostra a lista e devolve o id
 * escolhido via `onSelect` — não guarda seleção (quem chama decide o que fazer depois).
 */
export function CategorySearchPicker({
  items,
  onSelect,
  loading = false,
  pageSize = 6,
  showSearch = true,
  labels,
}: {
  items: CategorySearchItem[];
  onSelect: (id: string) => void;
  loading?: boolean;
  /** Mostrado de início — o resto some atrás do "Carregar mais" pra não empilhar scroll. */
  pageSize?: number;
  /** `false` esconde a busca e mostra todas as categorias (sem "Carregar mais") — quando quem
   * chama já filtra a lista (ex.: wizard, que filtra pelo grupo escolhido). */
  showSearch?: boolean;
  labels?: CategorySearchLabels;
}) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(showSearch ? pageSize : Infinity);

  const sorted = useMemo(
    () =>
      items
        .map((item) => ({
          item,
          index: normalizeCategorySearch(
            [item.name, item.description ?? '', item.searchText ?? ''].join(' ')
          ),
        }))
        .sort((a, b) => a.item.name.localeCompare(b.item.name, 'pt-BR')),
    [items]
  );

  const needle = normalizeCategorySearch(search);
  const filtered = needle ? sorted.filter((entry) => entry.index.includes(needle)) : sorted;
  const visible = showSearch ? filtered.slice(0, visibleCount) : filtered;

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-3 duration-300 space-y-3">
      {l.prompt ? <p className="text-sm text-muted-foreground">{l.prompt}</p> : null}
      {showSearch ? (
      <input
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setVisibleCount(pageSize);
        }}
        placeholder={l.placeholder}
        className="w-full rounded-2xl bg-background px-4 py-3 text-sm outline-none shadow-[var(--shadow-soft-1)] focus:shadow-[var(--shadow-soft-2)]"
      />
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        {visible.map(({ item }) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(String(item.id))}
            className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/50 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <ColorChip color="var(--color-primary)">
              <TaxonomyIcon icon={item.icon ?? ''} className="h-5 w-5" />
            </ColorChip>
            <p className="text-sm font-medium text-foreground">{item.name}</p>
          </button>
        ))}
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">{loading ? l.loading : l.empty}</p>
        ) : null}
      </div>
      {showSearch && visibleCount < filtered.length ? (
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => setVisibleCount((n) => n + pageSize)}
        >
          {l.loadMore}
        </Button>
      ) : null}
    </div>
  );
}
