'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { buttonVariants } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../../lib/utils';
import { useTable } from '../../hooks';
import { RatingDisplay } from './rating-display';
import type { ReviewModerationTableConfig, ReviewStatus } from './types';

type ModerationRow = Record<string, unknown>;

// i18n(track-e): reviews.moderation.table.*
const STATUS_OPTIONS: Array<{ id: '' | ReviewStatus; label: string }> = [
  { id: '', label: 'Todos os status' },
  { id: 'pending', label: 'Pendentes' },
  { id: 'published', label: 'Publicadas' },
  { id: 'hidden', label: 'Ocultas' },
  { id: 'rejected', label: 'Rejeitadas' },
];

const PERIOD_OPTIONS: Array<{ id: '' | '7' | '30' | '90'; label: string }> = [
  { id: '', label: 'Qualquer data' },
  { id: '7', label: 'Últimos 7 dias' },
  { id: '30', label: 'Últimos 30 dias' },
  { id: '90', label: 'Últimos 90 dias' },
];

const STATUS_TONE: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  published: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  hidden: 'bg-muted text-muted-foreground',
  rejected: 'bg-destructive/15 text-destructive',
};

function str(row: ModerationRow, ...keys: string[]): string {
  for (const key of keys) {
    const v = row[key];
    if (v !== undefined && v !== null && v !== '') return String(v);
  }
  return '';
}

/**
 * Bespoke screen-engine block (`review-moderation`). Lists `reviews` for
 * moderators via `useTable` with status / period / domain / reference_id / search
 * filters. `config` is plain serializable data only (crosses the RSC boundary).
 */
export function ReviewModerationTable({
  config = {},
}: Readonly<{ config?: ReviewModerationTableConfig }>) {
  const hrefBase = config.hrefBase ?? '/painel/administracao/avaliacoes';
  const [status, setStatus] = useState<'' | ReviewStatus>('');
  const [period, setPeriod] = useState<'' | '7' | '30' | '90'>('');
  const [domain, setDomain] = useState(config.domain ?? '');
  const [referenceId, setReferenceId] = useState('');

  const filters = useMemo(() => {
    const merged: Record<string, string> = {};
    if (status) merged.status = status;
    if (domain) merged.domain = domain;
    if (referenceId.trim()) merged.reference_id = referenceId.trim();
    if (period) {
      const since = new Date();
      since.setDate(since.getDate() - Number(period));
      merged['created_at.gte'] = since.toISOString();
    }
    return Object.keys(merged).length ? merged : undefined;
  }, [status, domain, referenceId, period]);

  const table = useTable<ModerationRow>({
    resource: 'reviews',
    pageSize: config.pageSize ?? 20,
    orderBy: 'created_at',
    orderDirection: 'desc',
    filters,
  });

  const { goToPage } = table;
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    void goToPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return (
    <div className="space-y-4">
      {config.title ? (
        <h2 className="text-base font-semibold text-foreground">{config.title}</h2>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as '' | ReviewStatus)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as '' | '7' | '30' | '90')}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="Domínio (ex.: service)"
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        />
        <input
          value={referenceId}
          onChange={(e) => setReferenceId(e.target.value)}
          placeholder="ID de referência"
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        />
      </div>

      <form {...table.searchFormProps}>
        <input
          {...table.searchInputProps}
          placeholder="Buscar por comentário..."
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </form>

      {table.loading ? (
        <div className="space-y-2" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : table.error ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-4 text-sm">
          <span className="text-muted-foreground">{table.error}</span>
          <button
            type="button"
            onClick={() => void table.refresh()}
            className="font-medium text-primary hover:underline"
          >
            Tentar de novo
          </button>
        </div>
      ) : table.items.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhuma avaliação para os filtros atuais.
        </div>
      ) : (
        <ul className="space-y-2">
          {table.items.map((row) => {
            const id = str(row, 'id');
            const rowStatus = str(row, 'status') || 'published';
            const comment = str(row, 'comment');
            return (
              <li
                key={id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3"
              >
                <RatingDisplay value={Number(str(row, 'rating') || 0)} size="sm" />
                <Badge variant="secondary" className={cn('shrink-0', STATUS_TONE[rowStatus] ?? '')}>
                  {rowStatus}
                </Badge>
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {comment || 'Sem comentário'}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {str(row, 'domain') || '—'} · {str(row, 'referenceId', 'reference_id') || '—'}
                </span>
                <Link
                  href={`${hrefBase}/${id}`}
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'sm',
                    className: 'shrink-0',
                  })}
                >
                  Analisar
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {table.totalPages > 1 ? (
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            disabled={!table.canGoPrevious}
            onClick={() => void table.goToPage(table.page - 1)}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Anterior
          </button>
          <span className="text-xs text-muted-foreground">
            Página {table.page} de {table.totalPages}
          </span>
          <button
            type="button"
            disabled={!table.canGoNext}
            onClick={() => void table.goToPage(table.page + 1)}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Próxima
          </button>
        </div>
      ) : null}
    </div>
  );
}
