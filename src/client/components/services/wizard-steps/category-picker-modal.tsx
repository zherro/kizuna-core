'use client';

import { useEffect } from 'react';
import { Check, ChevronLeft } from 'lucide-react';
import { TaxonomyIcon } from '../../taxonomy/taxonomy-icon';
import { cn } from '../../../../lib/utils';
import type { ServiceCategory, ServiceGroup } from '../service-type';

/**
 * Modal do passo 2: escolhida a área (grupo), aqui o usuário escolhe a categoria numa lista com
 * scroll. Selecionar fecha o modal — as especialidades ficam na tela do passo, não aqui. Abre
 * automático quando já há grupo sem categoria; reabre pelo botão "Editar" do resumo.
 */
export function CategoryPickerModal({
  open,
  onOpenChange,
  group,
  categories,
  categoriesLoading,
  categoryId,
  onSelectCategory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: ServiceGroup | undefined;
  categories: ServiceCategory[];
  categoriesLoading: boolean;
  categoryId: string;
  onSelectCategory: (id: string) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  const filtered = categories
    .filter((category) => String(category.categoryGroupId) === String(group?.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-background p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Categoria em ${group?.name ?? ''}`}
        className="flex h-[min(36rem,90dvh)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl"
      >
        <header className="flex items-center gap-3 border-b border-border px-3 py-2.5">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">Qual a sua categoria?</p>
            <p className="truncate text-xs text-muted-foreground">{group?.name}</p>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {categoriesLoading && filtered.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">Carregando categorias…</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              Nenhuma categoria ativa nesta área.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((category) => {
                const active = String(category.id) === String(categoryId);
                return (
                  <li key={category.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectCategory(String(category.id));
                        onOpenChange(false);
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                        active ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                      )}
                    >
                      <TaxonomyIcon icon={category.icon} className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{category.name}</span>
                        {category.description ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {category.description}
                          </span>
                        ) : null}
                      </span>
                      {active ? <Check className="h-4 w-4 shrink-0" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
