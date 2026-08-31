'use client';

import { ArrowDown, ArrowUp, FolderKanban, Pencil, Plus } from 'lucide-react';
import { Button } from '@kizuna/core/client/components/ui/button';
import { Badge } from '@kizuna/core/client/components/ui/badge';
import { TaxonomyIcon } from './taxonomy-icon';
import type { TaxonomyCategory, TaxonomyGroup } from './taxonomy-types';

type TaxonomyGroupManagerProps = {
  groups: TaxonomyGroup[];
  categories: TaxonomyCategory[];
  loading: boolean;
  reorderingId: string | null;
  onNew: () => void;
  onEdit: (group: TaxonomyGroup) => void;
  onMove: (group: TaxonomyGroup, direction: 'up' | 'down') => void;
};

export function TaxonomyGroupManager({
  groups,
  categories,
  loading,
  reorderingId,
  onNew,
  onEdit,
  onMove,
}: Readonly<TaxonomyGroupManagerProps>) {
  const sortedGroups = [...groups].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'pt-BR')
  );

  function categoryCountFor(groupId: string | number) {
    return categories.filter((category) => String(category.categoryGroupId) === String(groupId))
      .length;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Grupos representam o contexto de vida do usuario e ficam acima das categorias. Use as
          setas para definir a ordem de exibicao.
        </p>
        <Button onClick={onNew}>
          <Plus className="h-4 w-4" />
          Novo grupo
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando os grupos...</p>
      ) : sortedGroups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
          <FolderKanban className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhum grupo cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedGroups.map((group, index) => {
            const groupId = String(group.id);
            const isReordering = reorderingId === groupId;

            return (
              <div
                key={groupId}
                className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3"
              >
                <div className="flex flex-col">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={index === 0 || isReordering}
                    onClick={() => onMove(group, 'up')}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={index === sortedGroups.length - 1 || isReordering}
                    onClick={() => onMove(group, 'down')}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/30">
                  <TaxonomyIcon icon={group.icon} className="h-4 w-4 text-foreground" />
                </div>

                <div className="flex-1">
                  <p className="font-semibold text-foreground">
                    {group.name}
                    {!group.active ? (
                      <Badge variant="secondary" className="ml-2 align-middle">
                        Inativo
                      </Badge>
                    ) : null}
                  </p>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {group.slug} · {categoryCountFor(group.id)} categoria(s)
                  </p>
                  {group.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
                  ) : null}
                  {group.tags ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {group.tags
                        .split(',')
                        .map((tag) => tag.trim())
                        .filter(Boolean)
                        .map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                    </div>
                  ) : null}
                </div>

                <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(group)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Editar
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
