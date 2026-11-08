'use client';

import { useState } from 'react';
import { Loader2, Square } from 'lucide-react';
import { formatBRL } from '../../../../shared/marketing/cost';
import { useToast } from '../../../hooks/use-toast';
import { Button } from '../../ui/button';
import { send, errMsg } from './admin-api';
import { canStop, refundOf, stopDate } from './admin-math';

type Spendable = { dailyCents: number; startsOn: string; endsOn: string; stoppedOn: string | null };

/**
 * Para um impulsionamento (`boosts`) ou campanha de banner (`ad_campaigns`): PATCH só de
 * `stoppedOn`, que o banco aceita a partir de amanhã (hoje já está pago). Os dias não usados
 * voltam ao saldo na hora. Confirmação em dois cliques, mostrando quanto volta.
 */
export function StopButton({
  resource,
  id,
  row,
  noun,
  onDone,
}: {
  resource: 'boosts' | 'ad_campaigns';
  id: string;
  row: Spendable;
  noun: string;
  onDone: () => void;
}) {
  const { success, error } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!canStop(row)) return null;

  async function stop() {
    setSaving(true);
    try {
      await send('PATCH', `/api/resources/${resource}/${id}`, { stoppedOn: stopDate(row) }, `Não foi possível parar o ${noun}.`);
      success(`${noun[0].toUpperCase()}${noun.slice(1)} parado.`);
      setConfirming(false);
      onDone();
    } catch (err) {
      error(errMsg(err, `Não foi possível parar o ${noun}.`));
    } finally {
      setSaving(false);
    }
  }

  if (!confirming) {
    return (
      <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
        <Square className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Parar
      </Button>
    );
  }

  const refund = refundOf(row);
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Confirmar parada do ${noun}`}>
      <span className="text-xs text-muted-foreground">
        Para de valer em {stopDate(row).split('-').reverse().join('/')}
        {refund > 0 ? ` e devolve ${formatBRL(refund)} ao saldo.` : '.'}
      </span>
      <Button size="sm" onClick={() => void stop()} disabled={saving} aria-label={`Confirmar parar ${noun}`}>
        {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
        Confirmar
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={saving}>
        Voltar
      </Button>
    </div>
  );
}
