'use client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { addDays, dbToday, earliestStop, formatBRL, refundIfStopped, situation, type Period } from '../../../../shared/marketing/cost';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { patchItem } from './data';
import type { PeriodDraft, PeriodEval } from './period-form';
import { Field, formatDay, Notice } from './ui';

/** Diária + datas + resumo de custo/saldo. Controlado: quem usa guarda o rascunho. */
export function PeriodFields({
  draft,
  onChange,
  evaluation,
  balanceCents,
}: {
  draft: PeriodDraft;
  onChange: (d: PeriodDraft) => void;
  evaluation: PeriodEval;
  balanceCents: number;
}) {
  const today = dbToday();
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Diária (R$)" hint="De R$ 5,00 a R$ 10.000,00 por dia">
          <Input inputMode="decimal" value={draft.dailyText} onChange={(e) => onChange({ ...draft, dailyText: e.target.value })} />
        </Field>
        <Field label="Começa em" hint="Data do servidor (UTC)">
          <Input type="date" min={today} value={draft.startsOn} onChange={(e) => onChange({ ...draft, startsOn: e.target.value })} />
        </Field>
        <Field label="Termina em" hint={`Até ${formatDay(addDays(draft.startsOn || today, 89))} (90 dias)`}>
          <Input type="date" min={draft.startsOn || today} value={draft.endsOn} onChange={(e) => onChange({ ...draft, endsOn: e.target.value })} />
        </Field>
      </div>
      <dl className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Custo do período</dt>
          <dd className="font-semibold tabular-nums">{formatBRL(evaluation.totalCents)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Saldo agora</dt>
          <dd className="font-semibold tabular-nums">{formatBRL(balanceCents)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Saldo depois</dt>
          <dd className={evaluation.balanceAfterCents < 0 ? 'font-semibold tabular-nums text-destructive' : 'font-semibold tabular-nums'}>
            {formatBRL(evaluation.balanceAfterCents)}
          </dd>
        </div>
      </dl>
      {!evaluation.check.ok ? <Notice tone="warn">{evaluation.check.reason}</Notice> : null}
    </div>
  );
}

/** Parar com confirmação: mostra quanto volta ao saldo. Não existe "retomar" (o banco não permite). */
export function StopButton({
  resource,
  id,
  dailyCents,
  period,
  onStopped,
}: {
  resource: 'boosts' | 'ad_campaigns';
  id: string;
  dailyCents: number;
  period: Period;
  onStopped: () => void;
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sit = situation(period);
  if (sit !== 'live' && sit !== 'scheduled') return null;
  const stop = earliestStop(period);
  // Último dia de veiculação: se já é o último dia, não há o que devolver.
  const refund = refundIfStopped(dailyCents, period);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await patchItem(resource, id, { stoppedOn: stop });
      onStopped();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível parar.');
    } finally {
      setBusy(false);
    }
  }

  if (!asking) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setAsking(true)}>
        Parar
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 text-sm" role="group" aria-label="Confirmar parada">
      <p>
        {sit === 'scheduled' ? 'Cancelar antes de começar' : `Parar a partir de ${formatDay(stop)}`}.{' '}
        {refund > 0 ? (
          <>
            Volta <strong>{formatBRL(refund)}</strong> ao saldo. Não dá para retomar depois.
          </>
        ) : (
          'Não há dias a devolver. Não dá para retomar depois.'
        )}
      </p>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={confirm} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          Confirmar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setAsking(false)} disabled={busy}>
          Manter
        </Button>
      </div>
    </div>
  );
}
