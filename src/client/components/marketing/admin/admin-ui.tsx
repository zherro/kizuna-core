'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { InlineAlert } from '../../ui-better-soft/inline-alert';
import type { Situation } from '../../../../shared/marketing/cost';
import { SITUATION_LABEL, shortId } from './admin-math';
import { errMsg } from './admin-api';

export const CARD = 'rounded-[var(--ui-radius-card,1rem)] border border-border bg-card';
export const SELECT_CLASS =
  'h-9 rounded-[var(--ui-radius-pill,0.375rem)] border border-input bg-background px-3 text-sm';

export function Loading({ text }: { text: string }) {
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {text}
    </p>
  );
}

export function ErrorNote({ text }: { text: string }) {
  return text ? <InlineAlert type="error" text={text} /> : null;
}

/** Número em destaque com rótulo. `tone` só pinta o valor (saldo positivo/negativo). */
export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: 'good' | 'bad' }) {
  const color = tone === 'good' ? 'text-emerald-700 dark:text-emerald-400' : tone === 'bad' ? 'text-red-700 dark:text-red-400' : 'text-foreground';
  return (
    <div className={`${CARD} flex min-w-0 flex-col gap-0.5 p-4`}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`truncate text-xl font-semibold tabular-nums ${color}`}>{value}</dd>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Par rótulo/valor pequeno para as linhas das listas. */
export function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}

/** Nome da conta: título de um anúncio dela (o admin não lê o perfil) + final do id. */
export function AccountName({ label, tenantId }: { label: string | null; tenantId: string }) {
  return (
    <span className="min-w-0">
      <span className="block truncate text-sm font-semibold">{label || 'Conta sem anúncio visível'}</span>
      <span className="block truncate text-xs text-muted-foreground" title={tenantId}>
        conta {shortId(tenantId)}
      </span>
    </span>
  );
}

const SITUATION_VARIANT: Record<Situation, 'default' | 'secondary' | 'outline'> = {
  live: 'default',
  scheduled: 'secondary',
  stopped: 'outline',
  ended: 'outline',
};

export function SituationBadge({ value }: { value: Situation }) {
  return <Badge variant={SITUATION_VARIANT[value]}>{SITUATION_LABEL[value]}</Badge>;
}

/** Carrega ao montar (e em `reload`), sempre sem cache. */
export function useLoader<T>(load: () => Promise<T>, fallbackError: string, deps: ReadonlyArray<unknown> = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  loadRef.current = load;

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await loadRef.current());
    } catch (err) {
      setError(errMsg(err, fallbackError));
    } finally {
      setLoading(false);
    }
  }, [fallbackError]);

  useEffect(() => {
    void reload();
    // `deps` (ex.: o período escolhido) refaz a leitura; `load` vem sempre da última renderização.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload, ...deps]);

  return { data, error, loading, reload };
}
