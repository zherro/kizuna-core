'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { formatBRL, parseBRLToCents } from '../../../../shared/marketing/cost';
import { useToast } from '../../../hooks/use-toast';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../ui/sheet';
import { send, errMsg } from './admin-api';
import { ledgerAmount, ledgerKind, validateCredit, type CreditMode } from './admin-math';
import { ErrorNote } from './admin-ui';

export type CreditSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Conta (tenant) que recebe o lançamento — nunca o usuário: o saldo é da conta. */
  tenantId: string;
  /** Como a conta aparece para o admin (título de anúncio, nome do membro…). */
  accountLabel: string;
  /** Saldo atual da conta (`vw_wallet_balance`); null se ainda não carregou/ não há lançamentos. */
  balanceCents: number | null;
  onDone?: () => void;
};

/**
 * Lança saldo na carteira de uma conta: INSERT direto em `wallet_ledger` (RLS exige
 * `marketing/manage`; sem função SQL). Duas etapas — preencher e confirmar — porque o livro-razão
 * não tem edição nem exclusão: erro se corrige com outro lançamento (correção/estorno).
 */
export function CreditSheet({ open, onOpenChange, tenantId, accountLabel, balanceCents, onDone }: CreditSheetProps) {
  const { success } = useToast();
  const [mode, setMode] = useState<CreditMode>('credit');
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setMode('credit');
      setAmountText('');
      setNote('');
      setStep('form');
      setError('');
    }
  }, [open, tenantId]);

  const cents = parseBRLToCents(amountText);
  const signed = Number.isFinite(cents) ? ledgerAmount(mode, cents) : 0;
  const before = balanceCents ?? 0;
  const after = before + signed;

  function review() {
    const problem = validateCredit({ mode, cents, balanceCents });
    if (problem) return setError(problem);
    if (mode === 'adjust' && note.trim().length < 3) return setError('Explique a correção na observação.');
    setError('');
    setStep('confirm');
  }

  async function confirm() {
    setSaving(true);
    setError('');
    try {
      await send(
        'POST',
        '/api/resources/wallet_ledger',
        { tenantId, kind: ledgerKind(mode), amountCents: signed, note: note.trim() },
        'Não foi possível lançar o saldo.',
      );
      success(mode === 'credit' ? 'Saldo adicionado.' : 'Correção lançada.');
      onOpenChange(false);
      onDone?.();
    } catch (err) {
      setError(errMsg(err, 'Não foi possível lançar o saldo.'));
      setStep('form');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-md">
        <SheetHeader>
          <SheetTitle>{step === 'confirm' ? 'Confirmar lançamento' : 'Adicionar saldo'}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 p-4">
          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
            <p className="font-medium">{accountLabel}</p>
            <p className="text-xs text-muted-foreground">
              Saldo atual: {balanceCents == null ? 'sem lançamentos' : formatBRL(balanceCents)}
            </p>
          </div>

          {step === 'form' ? (
            <>
              <fieldset className="flex gap-2" aria-label="Tipo de lançamento">
                {(
                  [
                    ['credit', 'Adicionar saldo'],
                    ['adjust', 'Corrigir (descontar)'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={mode === value}
                    onClick={() => setMode(value)}
                    className={`flex-1 rounded-[var(--ui-radius-pill,0.375rem)] border px-3 py-2 text-sm transition ${
                      mode === value ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-accent'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </fieldset>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Valor em reais
                <Input
                  aria-label="Valor em reais"
                  inputMode="decimal"
                  placeholder="50,00"
                  value={amountText}
                  onChange={(e) => setAmountText(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                {mode === 'adjust' ? 'Motivo da correção' : 'Observação (opcional)'}
                <Input
                  aria-label="Observação"
                  maxLength={300}
                  placeholder={mode === 'adjust' ? 'Ex.: crédito lançado em duplicidade' : 'Ex.: pagamento por Pix em 12/11'}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <ErrorNote text={error} />
              <div className="flex gap-2">
                <Button onClick={review}>Revisar lançamento</Button>
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
              </div>
            </>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">{mode === 'credit' ? 'Crédito' : 'Desconto'}</dt>
                  <dd className="text-lg font-semibold tabular-nums">{formatBRL(Math.abs(signed))}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Saldo depois</dt>
                  <dd className={`text-lg font-semibold tabular-nums ${after < 0 ? 'text-red-700 dark:text-red-400' : ''}`}>
                    {formatBRL(after)}
                  </dd>
                </div>
              </dl>
              {note.trim() ? <p className="text-sm text-muted-foreground">“{note.trim()}”</p> : null}
              {after < 0 ? (
                <p role="alert" className="text-sm text-red-700 dark:text-red-400">
                  O saldo ficará negativo. Os impulsionamentos já reservados não são cancelados.
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                O lançamento não pode ser editado nem apagado depois. Para desfazer, faça uma correção.
              </p>
              <ErrorNote text={error} />
              <div className="flex gap-2">
                <Button onClick={() => void confirm()} disabled={saving} aria-label="Confirmar lançamento">
                  {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />}
                  Confirmar
                </Button>
                <Button variant="ghost" onClick={() => setStep('form')} disabled={saving}>
                  Voltar
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
