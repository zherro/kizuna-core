'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, buttonVariants, type ButtonProps } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Grid } from '../ui/grid';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import type { UseTableResult } from '@kizuna/core';
import { cn } from '../../../lib/utils';
import { TONE_BG, TONE_BORDER_L, type ThemeTone } from '../../../lib/ui-tone';

export type ResponsiveTableColumn<TItem> = {
  key: string;
  header: string;
  render: (item: TItem) => ReactNode;
  mobileLabel?: string;
  className?: string;
};

export type ResponsiveTableActions<TItem> = {
  header?: string;
  className?: string;
  items?: ResponsiveTableActionItem<TItem>[];
  render?: (item: TItem) => ReactNode;
  mobileRender?: (item: TItem) => ReactNode;
};

type ResponsiveTableActionIconPreset = 'edit' | 'delete';

export type ResponsiveTableActionItem<TItem> = {
  type: 'link' | 'button';
  label: string;
  loadingLabel?: string;
  href?: string;
  getHref?: (item: TItem) => string;
  onClick?: (item: TItem) => void | Promise<void>;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  intent?: 'default' | 'danger';
  className?: string;
  icon?:
    | ReactNode
    | ResponsiveTableActionIconPreset
    | ((item: TItem) => ReactNode | ResponsiveTableActionIconPreset);
  disabled?: boolean | ((item: TItem) => boolean);
  loading?: boolean | ((item: TItem) => boolean);
};

/** Alias kept for this file's own readability — the tone vocabulary itself (and its colors) live
 * in `src/lib/ui-tone.ts`, shared with `services-list-block.tsx`/`entity-list-card.tsx`. */
export type ResponsiveTableRowTone = ThemeTone;

export type ResponsiveResourceTableConfig<TItem> = {
  title?: string;
  description?: ReactNode;
  searchPlaceholder?: string;
  searchButtonLabel?: string;
  emptyMessage?: ReactNode;
  columns: ResponsiveTableColumn<TItem>[];
  actions?: ResponsiveTableActions<TItem>;
  getRowKey?: (item: TItem, index: number) => string | number;
  className?: string;
  /** Optional per-row semantic tone — tints a left accent strip on both the mobile card and the
   * desktop row. Return `undefined` for a row that doesn't need one (renders a neutral strip). */
  getRowTone?: (item: TItem) => ResponsiveTableRowTone | undefined;
};

type ResponsiveResourceTableProps<TItem> = {
  table: UseTableResult<TItem>;
  config: ResponsiveResourceTableConfig<TItem>;
  onBeforeSearch?: () => void | Promise<void>;
};

function getRowKey<TItem>(
  item: TItem,
  index: number,
  config: ResponsiveResourceTableConfig<TItem>
) {
  if (config.getRowKey) {
    return config.getRowKey(item, index);
  }

  const candidate = item as { id?: string | number };

  if (typeof candidate.id === 'string' || typeof candidate.id === 'number') {
    return candidate.id;
  }

  return index;
}

function toIconNode(icon: ReactNode | ResponsiveTableActionIconPreset | undefined) {
  if (icon === 'edit') return <Pencil className="h-4 w-4" />;
  if (icon === 'delete') return <Trash2 className="h-4 w-4" />;
  return icon;
}

function renderActionItems<TItem>(item: TItem, actions: ResponsiveTableActionItem<TItem>[]) {
  return actions.map((action, index) => {
    const key = `${action.type}-${action.label}-${index}`;
    const isLoading =
      typeof action.loading === 'function' ? action.loading(item) : Boolean(action.loading);
    const disabled =
      typeof action.disabled === 'function' ? action.disabled(item) : Boolean(action.disabled);
    const resolvedIcon = typeof action.icon === 'function' ? action.icon(item) : action.icon;
    const icon = toIconNode(resolvedIcon);
    const label = isLoading && action.loadingLabel ? action.loadingLabel : action.label;
    const variant = action.variant ?? 'outline';
    const size = action.size ?? 'sm';
    const intentClass =
      action.intent === 'danger'
        ? 'border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-900/70 dark:text-red-300 dark:hover:bg-red-950/40'
        : undefined;

    if (action.type === 'link') {
      const href = action.getHref ? action.getHref(item) : action.href;
      if (!href) return null;

      return (
        <Link
          key={key}
          href={href}
          className={cn(buttonVariants({ variant, size }), 'gap-2', intentClass, action.className)}
        >
          {icon}
          {label}
        </Link>
      );
    }

    return (
      <Button
        key={key}
        type="button"
        variant={variant}
        size={size}
        disabled={disabled || isLoading}
        onClick={() => {
          if (!action.onClick) return;
          void action.onClick(item);
        }}
        className={cn('gap-2', intentClass, action.className)}
      >
        {icon}
        {label}
      </Button>
    );
  });
}

export function ResponsiveResourceTable<TItem>({
  table,
  config,
  onBeforeSearch,
}: ResponsiveResourceTableProps<TItem>) {
  const searchButtonLabel = config.searchButtonLabel ?? 'Buscar';
  const emptyMessage = config.emptyMessage ?? 'Nenhum registro encontrado.';

  return (
    <Card className={cn(config.className, !config.title && !config.description && 'pt-4')}>
      {(config.title || config.description) && (
        <CardHeader>
          {config.title ? <CardTitle>{config.title}</CardTitle> : null}
          {config.description ? <CardDescription>{config.description}</CardDescription> : null}
        </CardHeader>
      )}

      <CardContent>
        <form
          className="mb-4"
          onSubmit={(event) => {
            void (async () => {
              await onBeforeSearch?.();
              await table.submitSearch(event);
            })();
          }}
        >
          <Grid container gap={3} className="items-end">
            <Grid xs={12} md={9}>
              <Input
                {...table.searchInputProps}
                placeholder={config.searchPlaceholder ?? 'Buscar'}
                className="w-full"
              />
            </Grid>
            <Grid xs={12} md={3}>
              <div className="flex w-full flex-wrap gap-2 md:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full md:w-auto"
                  disabled={!table.search.trim() && table.page === 1}
                  onClick={() => {
                    table.setSearch('');
                    void table.load(1, '');
                  }}
                >
                  Limpar
                </Button>

                <Button type="submit" variant="outline" className="w-full md:w-auto">
                  {searchButtonLabel}
                </Button>
              </div>
            </Grid>
          </Grid>
        </form>

        {table.error ? (
          <p className="mb-4 text-sm text-red-600 dark:text-red-300">{table.error}</p>
        ) : null}

        {table.total > 0 || table.loading ? (
          <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>{table.loading ? 'Carregando...' : ''}</span>
            <span>
              Página {table.page}
              {table.totalPages > 0 ? ` de ${table.totalPages}` : ''}
            </span>
          </div>
        ) : null}

        {/* Mobile: a tight label/value stack per row, no nested per-field boxes — reclaims
            vertical space vs the old "badge label + bordered box" per field. */}
        <div className="grid grid-cols-1 gap-2.5 md:hidden">
          {!table.loading && table.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : null}

          {table.items.map((item, index) => {
            const tone = config.getRowTone?.(item);

            return (
              <div
                key={getRowKey(item, index, config)}
                className={cn(
                  'rounded-xl border border-l-4 border-border bg-background p-3.5 shadow-sm',
                  tone ? TONE_BORDER_L[tone] : 'border-l-border'
                )}
              >
                <div className="space-y-2.5">
                  {config.columns.map((column) => (
                    <div key={column.key}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {column.mobileLabel ?? column.header}
                      </p>
                      <div className="mt-0.5 text-sm text-foreground">{column.render(item)}</div>
                    </div>
                  ))}
                </div>

                {config.actions ? (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
                    {config.actions.items?.length
                      ? renderActionItems(item, config.actions.items)
                      : (config.actions.mobileRender?.(item) ??
                        config.actions.render?.(item) ??
                        null)}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-border md:block">
          <Table className="rounded-none border-0">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {config.getRowTone ? <TableHead className="w-1 p-0" /> : null}
                {config.columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(
                      'text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
                      column.className
                    )}
                  >
                    {column.header}
                  </TableHead>
                ))}
                {config.actions ? (
                  <TableHead
                    className={cn(
                      'text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
                      config.actions.className
                    )}
                  >
                    {config.actions.header ?? 'Ações'}
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {!table.loading && table.items.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={
                      config.columns.length + (config.actions ? 1 : 0) + (config.getRowTone ? 1 : 0)
                    }
                    className="py-8 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : null}

              {table.items.map((item, index) => {
                const tone = config.getRowTone?.(item);

                return (
                  <TableRow key={getRowKey(item, index, config)}>
                    {config.getRowTone ? (
                      <TableCell
                        className={cn('w-1 p-0', tone ? TONE_BG[tone] : 'bg-transparent')}
                      />
                    ) : null}
                    {config.columns.map((column) => (
                      <TableCell key={column.key} className={cn('align-top', column.className)}>
                        {column.render(item)}
                      </TableCell>
                    ))}
                    {config.actions ? (
                      <TableCell className={cn('align-top', config.actions.className)}>
                        {config.actions.items?.length ? (
                          <div className="flex gap-2">
                            {renderActionItems(item, config.actions.items)}
                          </div>
                        ) : (
                          (config.actions.render?.(item) ?? null)
                        )}
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {table.total > 0 ? (
          <Grid container gap={3} className="mt-4 border-t pt-4">
            <Grid xs={12} md={6} className="flex items-center">
              <p className="text-sm text-muted-foreground">
                Mostrando {table.items.length} de {table.total} registro
                {table.total === 1 ? '' : 's'}.
              </p>
            </Grid>

            <Grid xs={12} md={6} className="flex justify-start md:justify-end">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!table.canGoPrevious || table.loading}
                  onClick={() => void table.goToPage(table.page - 1)}
                >
                  Anterior
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={!table.canGoNext || table.loading}
                  onClick={() => void table.goToPage(table.page + 1)}
                >
                  Próxima
                </Button>
              </div>
            </Grid>
          </Grid>
        ) : null}
      </CardContent>
    </Card>
  );
}
