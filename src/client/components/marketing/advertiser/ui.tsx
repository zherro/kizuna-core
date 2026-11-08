'use client';
import type { ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import type { Situation } from '../../../../shared/marketing/cost';
import { Button } from '../../ui/button';

export const selectClass =
  'flex h-10 w-full rounded-[var(--ui-radius-field,0.375rem)] border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

export function formatDay(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

export function formatInt(n: number): string {
  return n.toLocaleString('pt-BR');
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm font-medium">
      {label}
      {children}
      {hint ? <span className="text-xs font-normal text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error' | 'warn' | 'ok'; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
        tone === 'error' && 'border-destructive/40 bg-destructive/10 text-destructive',
        tone === 'warn' && 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300',
        tone === 'ok' && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
        tone === 'info' && 'border-border bg-muted/50 text-foreground',
      )}
    >
      {tone === 'error' || tone === 'warn' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : null}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {label}
    </div>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <Notice tone="error">{message}</Notice>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Tentar de novo
        </Button>
      ) : null}
    </div>
  );
}

export function Stat({ label, value, hint, strong }: { label: string; value: ReactNode; hint?: string; strong?: boolean }) {
  return (
    <div className="min-w-0 rounded-[var(--ui-radius-card,1rem)] border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-1 break-words font-semibold tabular-nums', strong ? 'text-3xl' : 'text-xl')}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-base font-semibold">{children}</h2>
      {aside}
    </div>
  );
}

const SITUATION_LABEL: Record<Situation, string> = {
  scheduled: 'Agendado',
  live: 'No ar',
  stopped: 'Parado',
  ended: 'Encerrado',
};
const SITUATION_CLASS: Record<Situation, string> = {
  scheduled: 'border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-300',
  live: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  stopped: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300',
  ended: 'border-border bg-muted text-muted-foreground',
};

export function SituationBadge({ situation }: { situation: Situation }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', SITUATION_CLASS[situation])}>
      {SITUATION_LABEL[situation]}
    </span>
  );
}

export function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Paginação" className="mt-3 flex items-center justify-between gap-2 text-sm">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Anterior
      </Button>
      <span className="text-muted-foreground">
        Página {page} de {totalPages}
      </span>
      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Próxima
      </Button>
    </nav>
  );
}

/** Barras diárias em SVG, escala própria (máximo explícito). Sem biblioteca. */
export function DailyBars({ label, series }: { label: string; series: { day: string; value: number }[] }) {
  const peak = Math.max(0, ...series.map((s) => s.value));
  const total = series.reduce((s, p) => s + p.value, 0);
  const W = 640;
  const H = 96;
  const n = Math.max(1, series.length);
  const gap = n > 40 ? 0.5 : 2;
  const bw = Math.max(1, (W - gap * (n - 1)) / n);
  return (
    <figure>
      <figcaption className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          total {formatInt(total)} · pico {formatInt(peak)}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${label} por dia; total ${total}`} className="h-24 w-full">
        <line x1={0} x2={W} y1={H - 1} y2={H - 1} className="stroke-border" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {series.map((p, i) => {
          const h = peak > 0 ? Math.max(p.value > 0 ? 2 : 0, (p.value / peak) * (H - 6)) : 0;
          return <rect key={p.day} x={i * (bw + gap)} y={H - 1 - h} width={bw} height={h} rx={1} className="fill-primary/80" />;
        })}
      </svg>
      {series.length > 0 ? (
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span>{formatDay(series[0].day)}</span>
          <span>{formatDay(series[series.length - 1].day)}</span>
        </div>
      ) : null}
    </figure>
  );
}
