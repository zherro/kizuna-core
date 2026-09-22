'use client';

import { Pencil } from 'lucide-react';

/**
 * Resumo do que foi escolhido no passo de categoria: área (grupo), categoria e especialidades
 * (tags). Usado no próprio passo de categoria e nos outros passos (ex.: título, quando a ordem
 * põe a categoria antes). Cada `onEdit*` ausente esconde o respectivo "editar".
 */
export function CategorySummary({
  groupName,
  categoryName,
  tagNames = [],
  onEditCategory,
  onEditTags,
  editCategoryLabel,
  editTagsLabel,
}: {
  groupName?: string;
  categoryName?: string;
  tagNames?: string[];
  onEditCategory?: () => void;
  onEditTags?: () => void;
  editCategoryLabel: string;
  editTagsLabel: string;
}) {
  const body = (
    <>
      <span className="min-w-0">
        <span className="block text-primary">{groupName}</span>
        {categoryName ? (
          <span className="mt-0.5 block truncate text-sm font-semibold text-foreground">
            {categoryName}
          </span>
        ) : null}
      </span>
      {onEditCategory ? (
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
          <Pencil className="h-3.5 w-3.5" />
          {editCategoryLabel}
        </span>
      ) : null}
    </>
  );

  return (
    <div className="space-y-3 rounded-xl bg-muted/50 px-4 py-3">
      {onEditCategory ? (
        <button
          type="button"
          onClick={onEditCategory}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          {body}
        </button>
      ) : (
        <div className="flex w-full items-center justify-between gap-3">{body}</div>
      )}

      {tagNames.length > 0 ? (
        <div className="flex items-start justify-between gap-3 border-t border-border pt-3">
          <div className="flex flex-wrap gap-1.5">
            {tagNames.map((name) => (
              <span key={name} className="rounded-full bg-background px-2.5 py-1 text-xs">
                {name}
              </span>
            ))}
          </div>
          {onEditTags ? (
            <button
              type="button"
              onClick={onEditTags}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary"
            >
              <Pencil className="h-3.5 w-3.5" />
              {editTagsLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
