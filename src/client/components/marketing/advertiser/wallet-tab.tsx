'use client';
import { useEffect, useRef, useState } from 'react';
import { Loader2, Wallet } from 'lucide-react';
import { formatBRL, parseBRLToCents } from '../../../../shared/marketing/cost';
import { cn } from '../../../../lib/utils';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { EmptyStateCard } from '../../ui-better-soft/lists/empty-state-card';
import { fetchPage } from './data';
import type { Balance, IntentRow, LedgerRow, StatementRow } from './types';
import { statementLabel } from '../../../../shared/marketing/display';
import { useMarketingDisplay } from '../display-context';
import { PixBox, PurchaseStatusLine, usePurchaseStatus, type CheckoutResponse } from './pix-checkout';
import { useLoad } from './use-load';
import { Field, formatDay, LoadError, Loading, Notice, Pager, SectionTitle, Stat } from './ui';

export const MIN_TOPUP_CENTS = 1000;
const PRESETS = [2000, 5000, 10000, 20000];

const INTENT_LABEL: Record<string, string> = {
  pending: 'Aguardando pagamento',
  paid: 'Pago',
  failed: 'Não aprovado',
  expired: 'Expirado',
};

export type CheckoutResult = CheckoutResponse;

/** Valor digitado → centavos válidos para recarga, ou a mensagem do que corrigir. */
export function checkTopup(
  text: string,
  money: (cents: number) => string = formatBRL,
): { ok: true; cents: number } | { ok: false; reason: string } {
  const cents = parseBRLToCents(text);
  if (!Number.isFinite(cents)) return { ok: false, reason: 'Digite um valor, por exemplo 50,00.' };
  if (cents < MIN_TOPUP_CENTS) return { ok: false, reason: `A recarga mínima é ${money(MIN_TOPUP_CENTS)}.` };
  if (cents > 100_000_000) return { ok: false, reason: 'Valor acima do limite por recarga.' };
  return { ok: true, cents };
}

function TopUp({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState('50,00');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const { money, words, unit } = useMarketingDisplay();
  const check = checkTopup(text, money);
  // Provedor com PIX na página: acompanha até pagar e então atualiza saldo/extrato.
  const status = usePurchaseStatus(result?.pix ? result.intentId : null);
  const finished = !!status && status.outcome !== 'waiting';
  const doneFor = useRef<string | null>(null);
  useEffect(() => {
    if (finished && result && doneFor.current !== result.intentId) {
      doneFor.current = result.intentId;
      onDone();
    }
  }, [finished, result, onDone]);

  async function submit() {
    if (!check.ok) {
      setError(check.reason);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/marketing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents: check.cents }),
        credentials: 'same-origin',
      });
      const body = (await res.json().catch(() => null)) as (CheckoutResult & { message?: string }) | null;
      if (!res.ok || !body) throw new Error(body?.message ?? 'Não foi possível abrir o pagamento. Tente de novo.');
      if (body.url) {
        window.location.assign(body.url);
        return;
      }
      setResult(body);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível abrir o pagamento.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[var(--ui-radius-card,1rem)] border bg-card p-4" aria-labelledby="topup-title">
      <h2 id="topup-title" className="text-base font-semibold">
        {words.addBalance}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{words.topupLead}</p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Valores sugeridos">
        {PRESETS.map((c) => (
          <Button key={c} type="button" size="sm" variant="outline" onClick={() => setText((c / 100).toFixed(2).replace('.', ','))}>
            {money(c)}
          </Button>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:w-56">
          <Field label={words.amountLabel} hint={`Mínimo ${money(MIN_TOPUP_CENTS)}${words.unitHint ? ` · ${words.unitHint}` : ''}`}>
            <Input inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} aria-invalid={!check.ok} />
          </Field>
        </div>
        <Button type="button" onClick={submit} disabled={busy || !check.ok} className="sm:mb-5">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          Ir para o pagamento
        </Button>
      </div>
      {error ? (
        <div className="mt-3">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}
      {result ? (
        <div className="mt-3">
          <Notice tone="ok">
            <strong className="block">Pedido de {check.ok ? (unit === 'credits' ? `${money(check.cents)} (${formatBRL(check.cents)})` : formatBRL(check.cents)) : ''} criado.</strong>
            {result.instructions ?? words.topupPending}
          </Notice>
          {result.pix && !finished ? (
            <div className="mt-3">
              <PixBox pix={result.pix} />
            </div>
          ) : null}
          {result.pix ? (
            <div className="mt-3">
              <PurchaseStatusLine status={status} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Intents({ refreshKey }: { refreshKey: number }) {
  const { money } = useMarketingDisplay();
  const l = useLoad(() => fetchPage<IntentRow>('payment_intents', { pageSize: 5 }), [refreshKey]);
  if (l.loading && !l.data) return <Loading />;
  if (l.error) return <LoadError message={l.error} onRetry={l.reload} />;
  const rows = l.data?.items ?? [];
  if (rows.length === 0) return null;
  return (
    <section>
      <SectionTitle>Pedidos de recarga</SectionTitle>
      <ul className="divide-y rounded-[var(--ui-radius-card,1rem)] border bg-card">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <span className="font-medium tabular-nums">{money(r.amountCents)}</span>
            <span className="text-muted-foreground">{formatDay(r.createdAt.slice(0, 10))}</span>
            <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-semibold', r.status === 'paid' && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300')}>
              {INTENT_LABEL[r.status] ?? r.status}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

type LedgerItem = {
  id: string;
  kind: string;
  amountCents: number;
  note: string;
  day: string;
  serviceTitle?: string | null;
  slotSlug?: string | null;
  days?: number | null;
};

/** Extrato: `wallet_ledger` (padrão) ou `vw_wallet_statement` (statement='full', com débitos e devoluções). */
function Ledger({ refreshKey }: { refreshKey: number }) {
  const [page, setPage] = useState(1);
  const display = useMarketingDisplay();
  const { money, statement } = display;
  const l = useLoad(
    () =>
      statement === 'full'
        ? fetchPage<StatementRow>('vw_wallet_statement', { page, pageSize: 10 }).then((p) => ({
            ...p,
            items: p.items.map((r): LedgerItem => ({ ...r, day: r.occurredAt.slice(0, 10) })),
          }))
        : fetchPage<LedgerRow>('wallet_ledger', { page, pageSize: 10 }).then((p) => ({
            ...p,
            items: p.items.map((r): LedgerItem => ({ ...r, day: r.createdAt.slice(0, 10) })),
          })),
    [page, refreshKey, statement],
  );
  return (
    <section>
      <SectionTitle>Extrato</SectionTitle>
      {l.loading && !l.data ? <Loading /> : null}
      {l.error ? <LoadError message={l.error} onRetry={l.reload} /> : null}
      {l.data && l.data.items.length === 0 ? (
        <EmptyStateCard icon={Wallet} title="Nenhuma movimentação ainda" description="Seus créditos aparecem aqui assim que o primeiro pagamento for confirmado." />
      ) : null}
      {l.data && l.data.items.length > 0 ? (
        <>
          <ul className="divide-y rounded-[var(--ui-radius-card,1rem)] border bg-card">
            {l.data.items.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{statementLabel(r, display)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDay(r.day)}
                    {r.note ? ` · ${r.note}` : ''}
                  </p>
                </div>
                <span className={cn('shrink-0 font-semibold tabular-nums', r.amountCents < 0 && 'text-destructive')}>
                  {r.amountCents > 0 ? '+' : ''}
                  {money(r.amountCents)}
                </span>
              </li>
            ))}
          </ul>
          <Pager page={l.data.page} totalPages={l.data.totalPages} onPage={setPage} />
        </>
      ) : null}
    </section>
  );
}

export function WalletTab({ balance, reloadBalance }: { balance: Balance; reloadBalance: () => void }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const { money, words } = useMarketingDisplay();
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat strong label={words.balanceAvailable} value={money(balance.balanceCents)} hint="Pode ser usado agora" />
        <Stat label={words.committed} value={money(balance.committedCents)} hint={`Reservado em ${words.spendTargets}`} />
        <Stat label={words.totalCredited} value={money(balance.creditedCents)} />
      </div>
      <TopUp
        onDone={() => {
          setRefreshKey((k) => k + 1);
          reloadBalance();
        }}
      />
      <Intents refreshKey={refreshKey} />
      <Ledger refreshKey={refreshKey} />
    </div>
  );
}
