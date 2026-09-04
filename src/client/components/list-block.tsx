'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MouseEvent, ReactNode } from 'react';
import { Fragment, useMemo, useState } from 'react';
import {
  Briefcase,
  ClipboardCheck,
  MapPin,
  Pencil,
  Plus,
  Package,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button, buttonVariants } from './ui/button';
import { Input } from './ui/input';
import { EmptyStateCard } from './ui-better-soft/lists/empty-state-card';
import { useTable } from '../hooks';
import type { ResourceConfig } from '../../types/resource';
import { postgrestResources } from '@/lib/server/resources';
import { formatServicePrice } from '@/components/services/service-type';
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

/** Named formatters that need real domain logic (not expressible as plain data) — keyed by name so `screens/*.ts` can reference one without importing/passing a function. */
const NAMED_FORMATTERS: Record<string, (value: unknown, item: Record<string, unknown>) => string> =
  {
    servicePrice: (value, item) =>
      formatServicePrice(Number(value) || 0, String(item.priceUnit ?? 'quote')),
  };

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
   * Always-on filters (raw PostgREST column name → value, e.g. `{ tenant_id: '...' }`), merged
   * with `statusFilter`'s current value and sent on every request — not user-adjustable, unlike
   * `statusFilter`. The one way to scope a listing (e.g. `/painel/meus-servicos` to the caller's
   * own tenant) without leaking every tenant's rows; resolve the value from `ScreenContext` via
   * `"$session.xxx"` in the screen config rather than hardcoding it — see `context.ts`.
   */
  fixedFilters?: Record<string, string>;
  createAction?: { href: string; label: string };
  emptyState?: { message?: string; ctaHref?: string; ctaLabel?: string };
  displayConfig?: {
    /** Key into `ICON_MAP`. */
    icon?: string;
    singularName?: string;
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

/**
 * Checks onboarding completion by calling the existing generic RPC route
 * (`/api/postgrest/rpc`) with the already-registered `fn_is_onboarding_completed`
 * function (see `postgrestRpcs` in `@/lib/server/resources`) — no new API
 * surface, just the same call a server component would make, done from the
 * client. Fails open (returns `true`) on any error so a broken check never
 * traps the user behind a gate that can't be evaluated.
 */
async function isOnboardingCompleted(): Promise<boolean> {
  try {
    const response = await fetch('/api/postgrest/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schema: 'public',
        functionName: 'fn_is_onboarding_completed',
        params: {},
      }),
    });

    if (!response.ok) return true;

    const data = (await response.json().catch(() => null)) as { payload?: unknown } | null;
    const payload = data?.payload;

    if (typeof payload === 'boolean') return payload;
    if (Array.isArray(payload)) {
      const first = payload[0];
      if (typeof first === 'boolean') return first;
      if (first && typeof first === 'object') {
        return Boolean(Object.values(first as Record<string, unknown>)[0]);
      }
      return true;
    }
    if (payload && typeof payload === 'object') {
      return Boolean(Object.values(payload as Record<string, unknown>)[0]);
    }

    return true;
  } catch {
    return true;
  }
}

/**
 * `href` link that, when `gateUserId` is set, checks onboarding completion on click instead of
 * navigating straight away — plain `Link` when `gateUserId` is undefined (ungated screens pay
 * nothing extra). Incomplete → redirects to the onboarding screen instead of the create flow,
 * never lets the click through. The check runs on demand (not on mount) since it's only needed
 * at the moment of the click.
 */
function GatedCreateLink({
  href,
  gateUserId,
  className,
  children,
}: {
  href: string;
  gateUserId?: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!gateUserId || checking) return;
    event.preventDefault();
    setChecking(true);
    try {
      const completed = await isOnboardingCompleted();
      router.push(completed ? href : '/painel/onboarding?motivo=novo-servico');
    } catch {
      // Check itself failed (network/RPC error) — fail open rather than trap the user behind a
      // gate that can't be evaluated.
      router.push(href);
    } finally {
      setChecking(false);
    }
  }

  return (
    <Link href={href} onClick={handleClick} className={cn(className, checking && 'opacity-70')}>
      {children}
    </Link>
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {config.title ? (
            <h2 className="text-base font-semibold text-foreground">{config.title}</h2>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {loading
              ? 'Carregando...'
              : `${total} registro${total === 1 ? '' : 's'} encontrado${total === 1 ? '' : 's'}.`}
          </p>
        </div>

        {config.createAction ? (
          <GatedCreateLink
            href={config.createAction.href}
            gateUserId={config.createGateUserId}
            className={buttonVariants({ size: 'sm' })}
          >
            <Plus className="h-3.5 w-3.5" />
            {config.createAction.label}
          </GatedCreateLink>
        ) : null}
      </div>

      <form
        onSubmit={(event) => void submitSearch(event)}
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={`Buscar por ${resourceConfig.searchableColumns?.join(' ou ')}`}
          className="flex-1"
        />
        {config.statusFilter ? (
          <div className="w-full sm:w-56">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatusFilter(statusFilter ? '' : 'pending')}
            >
              {statusFilter ? 'Filtrar: Pendentes' : 'Sem filtro'}
            </Button>
          </div>
        ) : null}
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <EmptyStateCard
          icon={Icon}
          title={
            config.emptyState && isUnfiltered
              ? (config.emptyState.message ?? `Nenhum ${singularName} cadastrado ainda.`)
              : `Nenhum ${singularName} encontrado`
          }
          description={
            config.emptyState && isUnfiltered
              ? `Cadastre seu primeiro ${singularName.toLowerCase()} para começar.`
              : 'Ajuste a busca ou filtros.'
          }
          action={
            config.emptyState?.ctaHref && isUnfiltered ? (
              <GatedCreateLink
                href={config.emptyState.ctaHref}
                gateUserId={config.createGateUserId}
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
                className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-brand/30 hover:shadow-sm"
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
                      'h-8 w-full justify-center bg-brand text-xs text-brand-foreground hover:bg-brand/90 sm:w-auto'
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
