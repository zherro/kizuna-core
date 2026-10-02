'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Fragment, useMemo, useState } from 'react';
import {
  Briefcase,
  ClipboardCheck,
  MapPin,
  Pencil,
  Plus,
  Search,
  Package,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button, buttonVariants } from './ui/button';
import { Input } from './ui/input';
import { EmptyStateCard } from './ui-better-soft/lists/empty-state-card';
import { GatedCreateLink } from './gated-create-link';
import { useTable } from '../hooks';
import type { ResourceConfig } from '../../types/resource';
import { postgrestResources } from '@/lib/server/resources';
import { cn } from '../../lib/utils';
import { TONE_BADGE, type ThemeTone } from '../../lib/ui-tone';

/**
 * `block.props` crosses a Server Component → Client Component boundary
 * (`RenderScreen` → `ListBlock`, see `render-screen.tsx`) — React can only
 * serialize plain data across it, never a function or a component reference
 * (icon, formatter). `screens/*.ts` (server-loaded config modules) embed
 * both indirectly instead: every icon below is a string key resolved
 * against `ICON_MAP` (this file only, never sent through props), and every
 * per-field formatter is a `FieldFormat` — data describing *which*
 * built-in formatting rule to apply, not a function that applies it.
 *
 * Card markup is a 1:1 port of the pre-migration `ListBlock`
 * (`grid grid-cols-[minmax(0,1fr)_auto]`, soft-filled status pill, muted
 * `·`-separated meta row, bold right-aligned stat + uppercase caption,
 * solid-brand action button) — match its classes exactly rather than
 * approximating.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  Briefcase,
  ClipboardCheck,
  MapPin,
  Pencil,
  Sparkles,
  Zap,
};

const ACTION_ICON_MAP: Record<'edit' | 'review', string> = {
  edit: 'Pencil',
  review: 'ClipboardCheck',
};

// Formatters de domínio — o mapa + `registerNamedFormatter` vivem num módulo
// neutro (ver list-block-formatters.ts) para o consumidor poder registrar de
// código que também carrega no servidor. Re-export aqui por compat.
export {
  NAMED_FORMATTERS,
  registerNamedFormatter,
  type NamedFormatter,
} from './list-block-formatters';
import { NAMED_FORMATTERS } from './list-block-formatters';

export type FieldFormat =
  | { type: 'text' }
  | { type: 'fallback'; fallback: string }
  /** For an embedded relation object (e.g. `{ id, name }`) — reads `.name`. */
  | { type: 'relationName'; fallback: string }
  | {
      type: 'enum';
      labels: Record<string, string>;
      fallback?: string;
      tones?: Record<string, ThemeTone>;
    }
  /** `falseLabel` omitted = renders nothing (and no badge) when the value is falsy — for a flag like "Urgência" that should only ever show when on. */
  | { type: 'boolean'; trueLabel: string; falseLabel?: string }
  /** Dispatches to `NAMED_FORMATTERS[name]` — for real domain logic (e.g. price) that can't be expressed as plain data. */
  | { type: 'named'; name: string };

export type FieldDisplayConfig = {
  label: string;
  /** Key into `ICON_MAP`. */
  icon?: string;
  format: FieldFormat;
};

export type ListBlockConfig = {
  resource: string;
  pageSize?: number;
  title?: string;
  action: {
    label: string;
    hrefBase: string;
    icon?: 'edit' | 'review';
  };
  statusFilter?: {
    defaultValue?: string;
  };
  /**
   * When truthy, both `createAction` and `emptyState`'s create CTA are gated: clicking checks
   * onboarding completion (via the existing `fn_is_onboarding_completed` RPC, over the generic
   * `/api/postgrest/rpc` route — DB-side, scoped to the logged-in user via the JWT; the value
   * here only decides whether to run the check at all, it isn't sent to the RPC) before
   * navigating, redirecting to `/painel/onboarding` instead if it's not done. Resolve from
   * `ScreenContext` via `"$session.xxx"` in the screen config — see `context.ts`. Omitted
   * entirely on screens that don't need the gate (e.g. admin listings), so the create button
   * behaves as a plain link.
   */
  createGateUserId?: string;
  /**
   * Níveis de conta: ação (ex.: `'service.create'`) checada em `GET /api/account/level?action=`
   * no clique do "Novo". Negado → `/painel/onboarding?acao=<acao>`. Tem precedência sobre o
   * check de onboarding; se o projeto não tiver a rota (404), cai no check antigo. Só UX — a
   * página de criação barra de novo no servidor (`canDoServer`).
   */
  createGateAction?: string;
  /**
   * Always-on filters (raw PostgREST column name → value, e.g. `{ tenant_id: '...' }`), merged
   * with `statusFilter`'s current value and sent on every request — not user-adjustable, unlike
   * `statusFilter`. The one way to scope a listing (e.g. `/painel/meus-servicos` to the caller's
   * own tenant) without leaking every tenant's rows; resolve the value from `ScreenContext` via
   * `"$session.xxx"` in the screen config rather than hardcoding it — see `context.ts`.
   */
  fixedFilters?: Record<string, string>;
  createAction?: { href: string; label: string };
  /**
   * `message`/`description` cobrem "nada cadastrado ainda"; sem eles o texto é montado com
   * `singularName` no masculino. Telas que precisam de gênero/termo próprio passam a frase pronta
   * (ver `shared/vocabulary`, `"$vocab.noneRegistered"`).
   */
  emptyState?: {
    message?: string;
    description?: string;
    ctaHref?: string;
    ctaLabel?: string;
  };
  displayConfig?: {
    /** Key into `ICON_MAP`. */
    icon?: string;
    singularName?: string;
    /** Título do estado "busca/filtro sem resultado". Padrão: `Nenhum {singularName} encontrado`. */
    notFoundMessage?: string;
    fields?: Record<string, FieldDisplayConfig>;
    /** Rendered as small soft-filled pills in the meta row (status/sponsored/urgent...). */
    badgeFields?: string[];
    /** Rendered as plain `·`-separated text in the same meta row, after the badges. */
    visibleFields?: string[];
    /** The one field shown as a bold right-aligned stat (e.g. price), its `label` used as the small uppercase caption under it. */
    statField?: string;
  };
};

function formatFieldValue(
  format: FieldFormat,
  value: unknown,
  item: Record<string, unknown>
): ReactNode {
  switch (format.type) {
    case 'text':
      return value == null ? '' : String(value);
    case 'fallback':
      return value ? String(value) : format.fallback;
    case 'relationName': {
      const relation = value as { name?: unknown } | null | undefined;
      return relation?.name ? String(relation.name) : format.fallback;
    }
    case 'enum': {
      const key = value == null ? '' : String(value);
      return format.labels[key] ?? format.fallback ?? key;
    }
    case 'boolean':
      return value ? format.trueLabel : (format.falseLabel ?? '');
    case 'named':
      return NAMED_FORMATTERS[format.name]?.(value, item) ?? String(value ?? '');
    default:
      return String(value ?? '');
  }
}

function fieldTone(format: FieldFormat, value: unknown): ThemeTone {
  if (format.type !== 'enum') return 'muted';
  const key = value == null ? '' : String(value);
  return format.tones?.[key] ?? 'muted';
}

const CARD_CLASS =
  'rounded-[var(--ui-radius-card-compact,0.75rem)] border-[length:var(--ui-border-w-card,1px)] border-border shadow-[shadow:var(--ui-shadow-card,0_1px_3px_0_#0000001a,_0_1px_2px_-1px_#0000001a)] bg-card p-4';

// Mesma geometria do card real (título + badges + meta / preço à direita / botão) para a lista não
// "pular" quando os dados chegam. Larguras fixas (sem random) para não trocar entre renders.
const SKELETON_TITLE_WIDTHS = ['w-2/5', 'w-1/2', 'w-1/3'];

// Primeira carga: ainda não se sabe se vem lista ou estado vazio, então nada de cabeçalho, busca
// ou linhas de card — só uma superfície neutra que serve aos dois desfechos.
function InitialSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando...</span>
      <div className={cn(CARD_CLASS, 'space-y-3 py-6')} aria-hidden="true">
        <div className="h-4 w-1/3 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}

// Busca/troca de página: já se sabe que é lista, então imita as linhas de card.
function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando...</span>
      <ul className="grid gap-2.5">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className={CARD_CLASS} aria-hidden="true">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-3">
              <div className="min-w-0 space-y-2.5">
                <div
                  className={cn(
                    'h-4 animate-pulse rounded-full bg-muted',
                    SKELETON_TITLE_WIDTHS[i % SKELETON_TITLE_WIDTHS.length]
                  )}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <div className="h-4 w-16 animate-pulse rounded-full bg-muted" />
                  <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
                  <div className="h-3 w-20 animate-pulse rounded-full bg-muted" />
                </div>
              </div>
              <div className="space-y-1.5 sm:flex sm:flex-col sm:items-end">
                <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
                <div className="h-2.5 w-14 animate-pulse rounded-full bg-muted" />
              </div>
            </div>
            <div className="mt-3 flex sm:justify-end">
              <div className="h-8 w-full animate-pulse rounded-[var(--ui-radius-pill,0.375rem)] bg-muted sm:w-20" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ListBlock({ config }: { config: ListBlockConfig }) {
  const resourceConfig = (postgrestResources as Record<string, ResourceConfig | undefined>)[
    config.resource
  ];
  if (!resourceConfig) {
    return <div className="text-red-600">Resource "{config.resource}" not configured</div>;
  }

  const displayConfig = config.displayConfig;
  const Icon = (displayConfig?.icon && ICON_MAP[displayConfig.icon]) || Package;
  const singularName = displayConfig?.singularName || 'Item';
  const fields = displayConfig?.fields || {};
  const badgeFields = displayConfig?.badgeFields || [];
  const visibleFields = displayConfig?.visibleFields || [];
  const statField = displayConfig?.statField ? fields[displayConfig.statField] : undefined;
  const statFieldName = displayConfig?.statField;
  const ActionIcon = config.action.icon && ICON_MAP[ACTION_ICON_MAP[config.action.icon]];

  const [statusFilter, setStatusFilter] = useState(config.statusFilter?.defaultValue ?? '');
  const fixedFilters = config.fixedFilters;
  const filters = useMemo(() => {
    const merged: Record<string, string> = {};
    for (const [field, value] of Object.entries(fixedFilters ?? {})) {
      if (value) merged[field] = value;
    }
    if (statusFilter) merged.status = statusFilter;
    return Object.keys(merged).length > 0 ? merged : undefined;
  }, [statusFilter, fixedFilters]);

  const { items, loading, search, setSearch, page, total, totalPages, goToPage, submitSearch } =
    useTable({
      resource: config.resource,
      pageSize: config.pageSize ?? 10,
      orderBy: resourceConfig.defaultOrder ?? 'created_at',
      orderDirection: 'desc',
      filters,
    });

  const isUnfiltered = !statusFilter && !search;
  // Nada cadastrado ainda (sem busca/filtro): a tela vira só o estado vazio — contagem "0 registros"
  // e barra de busca não ajudam em nada aqui e só poluem, principalmente no mobile.
  const isPristineEmpty = !loading && total === 0 && isUnfiltered;
  // Primeira carga (nada na tela ainda, sem busca/filtro): o resultado — lista ou vazio — é desconhecido.
  const isInitialLoad = loading && items.length === 0 && isUnfiltered;

  return (
    <div className="space-y-4">
      {isPristineEmpty || isInitialLoad ? null : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              {config.title ? (
                <h2 className="text-base font-semibold text-foreground">{config.title}</h2>
              ) : null}
              {loading ? (
                <div
                  className="mt-1 h-3.5 w-20 animate-pulse rounded-full bg-muted"
                  aria-hidden="true"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {`${total} ${total === 1 ? 'registro' : 'registros'}`}
                </p>
              )}
            </div>

            {config.createAction ? (
              <GatedCreateLink
                href={config.createAction.href}
                gateUserId={config.createGateUserId}
                gateAction={config.createGateAction}
                className={cn(buttonVariants({ size: 'sm' }), 'shrink-0')}
              >
                <Plus className="h-3.5 w-3.5" />
                {config.createAction.label}
              </GatedCreateLink>
            ) : null}
          </div>

          <form
            onSubmit={(event) => void submitSearch(event)}
            className="flex items-center gap-2"
            role="search"
          >
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Buscar ${singularName.toLowerCase()}...`}
                aria-label={`Buscar ${singularName.toLowerCase()}`}
                className="pl-9"
              />
            </div>
            {config.statusFilter ? (
              <Button
                type="button"
                variant={statusFilter ? 'default' : 'outline'}
                aria-pressed={Boolean(statusFilter)}
                onClick={() => setStatusFilter(statusFilter ? '' : 'pending')}
                className="shrink-0"
              >
                Pendentes
              </Button>
            ) : null}
            <Button
              type="submit"
              variant="outline"
              className="shrink-0 px-3"
              aria-label="Buscar"
            >
              <Search className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Buscar</span>
            </Button>
          </form>
        </>
      )}

      {loading ? (
        isInitialLoad ? (
          <InitialSkeleton />
        ) : (
          <ListSkeleton rows={Math.min(items.length || 3, 3)} />
        )
      ) : items.length === 0 ? (
        <EmptyStateCard
          icon={Icon}
          title={
            config.emptyState && isUnfiltered
              ? (config.emptyState.message ?? `Nenhum ${singularName} cadastrado ainda.`)
              : (displayConfig?.notFoundMessage ?? `Nenhum ${singularName} encontrado`)
          }
          description={
            config.emptyState && isUnfiltered
              ? (config.emptyState.description ??
                `Cadastre seu primeiro ${singularName.toLowerCase()} para começar.`)
              : 'Ajuste a busca ou filtros.'
          }
          action={
            config.emptyState?.ctaHref && isUnfiltered ? (
              <GatedCreateLink
                href={config.emptyState.ctaHref}
                gateUserId={config.createGateUserId}
                gateAction={config.createGateAction}
                className={buttonVariants()}
              >
                <Plus className="h-4 w-4" />
                {config.emptyState.ctaLabel ?? `Criar ${singularName.toLowerCase()}`}
              </GatedCreateLink>
            ) : undefined
          }
        />
      ) : (
        <>
          <ul className="grid gap-2.5">
            {(items as Record<string, unknown>[]).map((item) => (
              <li
                key={String(item.id)}
                className="group rounded-[var(--ui-radius-card-compact,0.75rem)] border-[length:var(--ui-border-w-card,1px)] border-border shadow-[shadow:var(--ui-shadow-card,0_1px_3px_0_#0000001a,_0_1px_2px_-1px_#0000001a)] bg-card p-4 transition-shadow duration-300 hover:border-brand/30 hover:shadow-[shadow:var(--ui-shadow-card-flat,0_1px_3px_0_#0000001a,_0_1px_2px_-1px_#0000001a)]"
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-semibold leading-tight">
                      {String(item.title || item.name || 'Sem título')}
                    </h3>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      {badgeFields.map((fieldName) => {
                        const field = fields[fieldName];
                        if (!field) return null;
                        const value = item[fieldName];
                        const label = formatFieldValue(field.format, value, item);
                        if (!label) return null;
                        const tone = fieldTone(field.format, value);
                        return (
                          <span
                            key={fieldName}
                            className={cn(
                              'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                              TONE_BADGE[tone]
                            )}
                          >
                            {label}
                          </span>
                        );
                      })}

                      {visibleFields.map((fieldName, idx) => {
                        const field = fields[fieldName];
                        if (!field) return null;
                        const value = item[fieldName];
                        const formatted = formatFieldValue(field.format, value, item);
                        const FieldIcon = field.icon ? ICON_MAP[field.icon] : undefined;
                        return (
                          <Fragment key={fieldName}>
                            {idx > 0 && <span className="text-border">·</span>}
                            <span className="inline-flex min-w-0 items-center gap-1">
                              {FieldIcon ? (
                                <FieldIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
                              ) : null}
                              <span className="truncate">{formatted}</span>
                            </span>
                          </Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {statField && statFieldName ? (
                    <div className="min-w-0 text-left sm:text-right">
                      <div className="text-base font-bold tabular-nums text-foreground">
                        {formatFieldValue(statField.format, item[statFieldName], item)}
                      </div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {statField.label}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <Link
                    href={`${config.action.hrefBase}/${item.id}`}
                    className={cn(
                      buttonVariants({ size: 'sm' }),
                      'h-8 w-full justify-center bg-brand text-xs text-brand-foreground shadow-md shadow-brand/25 transition-[background-color,box-shadow] duration-300 hover:bg-brand/90 hover:shadow-lg hover:shadow-brand/30 sm:w-auto'
                    )}
                  >
                    {ActionIcon ? <ActionIcon className="h-3.5 w-3.5" /> : null}
                    {config.action.label}
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              Página {page} de {totalPages || 1}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void goToPage(page - 1)}
                disabled={page <= 1 || loading}
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void goToPage(page + 1)}
                disabled={totalPages === 0 || page >= totalPages || loading}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
