'use client';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import type { MarketingWords } from '../../../../shared/marketing/display';
import { useMarketingDisplay } from '../display-context';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Field, Notice } from './ui';

/**
 * Pagamento direto pelo provedor (PIX do AbacatePay, ou o `dev` local): abre a cobrança, mostra o
 * QR + copia e cola e acompanha o status por poll curto até pagar/expirar. Sem libs novas.
 * Quem libera saldo/boost/campanha é sempre o servidor (webhook ou consulta ao provedor).
 */

export type PixData = { brCode: string; qrCodeImage?: string; expiresAt?: string };
export type CheckoutResponse = {
  intentId: string;
  status: string;
  url?: string;
  instructions?: string;
  pix?: PixData;
  amountCents?: number;
};
export type PurchaseOutcome =
  | 'waiting'
  | 'closed'
  | 'credited'
  | 'boost_active'
  | 'campaign_review'
  | 'campaign_approved'
  | 'campaign_rejected'
  | 'kept_in_balance';
export type PurchaseStatus = { status: string; outcome: PurchaseOutcome; message?: string };

export type DirectPurpose =
  | { kind: 'boost'; serviceUid: string; dailyCents: number; startsOn: string; days: number }
  | { kind: 'campaign'; creativeId: string; slotSlug: string; dailyCents: number; startsOn: string; days: number };

/** Mínimo de um pagamento (igual ao `payment_intents_amount_chk`). */
export const MIN_PAYMENT_CENTS = 1000;

/** O provedor configurado permite compra direta? (`manual` não: depende do admin). Uma leitura. */
export function usePaymentInfo(): { directPurchase: boolean; loaded: boolean } {
  const [info, setInfo] = useState({ directPurchase: false, loaded: false });
  useEffect(() => {
    let alive = true;
    fetch('/api/marketing/checkout', { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { directPurchase?: boolean } | null) => alive && setInfo({ directPurchase: !!b?.directPurchase, loaded: true }))
      .catch(() => alive && setInfo({ directPurchase: false, loaded: true }));
    return () => {
      alive = false;
    };
  }, []);
  return info;
}

export async function startCheckout(body: { amountCents: number } | { purpose: DirectPurpose }): Promise<CheckoutResponse> {
  const res = await fetch('/api/marketing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'same-origin',
  });
  const data = (await res.json().catch(() => null)) as (CheckoutResponse & { message?: string }) | null;
  if (!res.ok || !data) throw new Error(data?.message ?? 'Não foi possível abrir o pagamento. Tente de novo.');
  return data;
}

const POLL_MS = 4000;
const CHECK_EVERY = 3; // a cada 3 leituras (~12 s) pergunta ao provedor, além do webhook
const MAX_POLL_MS = 30 * 60_000;

/** Poll do status: para ao sair de "waiting", após 30 min ou ao desmontar; pausa com a aba oculta. */
export function usePurchaseStatus(intentId: string | null): PurchaseStatus | null {
  const [status, setStatus] = useState<PurchaseStatus | null>(null);
  const started = useRef(0);
  useEffect(() => {
    if (!intentId) return;
    setStatus(null);
    started.current = Date.now();
    let n = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let alive = true;
    const tick = async () => {
      if (!alive) return;
      if (typeof document !== 'undefined' && document.hidden) {
        timer = setTimeout(tick, POLL_MS);
        return;
      }
      n++;
      try {
        const check = n % CHECK_EVERY === 0 ? '&check=1' : '';
        const res = await fetch(`/api/marketing/checkout/status?id=${encodeURIComponent(intentId)}${check}`, {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const body = (await res.json().catch(() => null)) as PurchaseStatus | null;
        if (alive && res.ok && body) {
          setStatus(body);
          if (body.outcome !== 'waiting') return;
        }
      } catch {
        // rede instável no celular: tenta de novo no próximo ciclo
      }
      if (alive && Date.now() - started.current < MAX_POLL_MS) timer = setTimeout(tick, POLL_MS);
    };
    timer = setTimeout(tick, 1500);
    const onVisible = () => {
      if (!document.hidden && timer) {
        clearTimeout(timer);
        timer = setTimeout(tick, 200);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intentId]);
  return status;
}

export function PixBox({ pix }: { pix: PixData }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(pix.brCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  const expires = pix.expiresAt ? new Date(pix.expiresAt) : null;
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
      {pix.qrCodeImage?.startsWith('data:image/') ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URI do QR Code
        <img src={pix.qrCodeImage} alt="QR Code do PIX" width={176} height={176} className="rounded-md border bg-white p-2" />
      ) : null}
      <div className="flex w-full min-w-0 flex-col gap-2">
        <Field label="PIX copia e cola">
          <Input readOnly value={pix.brCode} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
        </Field>
        <Button type="button" variant="outline" size="sm" onClick={copy} className="self-start">
          {copied ? 'Copiado!' : 'Copiar código'}
        </Button>
        {expires && !Number.isNaN(expires.getTime()) ? (
          <p className="text-xs text-muted-foreground">
            Válido até {expires.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.
          </p>
        ) : null}
      </div>
    </div>
  );
}

const outcomeText = (w: Pick<MarketingWords, 'inYourBalance' | 'toYourBalance'>): Record<PurchaseOutcome, string> => ({
  waiting: 'Aguardando o pagamento… esta tela atualiza sozinha.',
  closed: 'Este PIX expirou ou não foi aprovado. Nada foi cobrado; gere outro se quiser.',
  credited: `Pago! O valor já está ${w.inYourBalance}.`,
  boost_active: 'Pago! O impulsionamento está ativo no período escolhido.',
  campaign_review: 'Pago! O banner está aguardando a aprovação da equipe e só vai ao ar depois de aprovado.',
  campaign_approved: 'Pago e aprovado! O banner está no ar no período escolhido.',
  campaign_rejected: `O banner foi reprovado. O valor voltou ${w.toYourBalance}.`,
  kept_in_balance: `Pago, mas não deu para ativar. O valor ficou ${w.inYourBalance}.`,
});

/** Linha de status do pagamento (aria-live para leitor de tela). */
export function PurchaseStatusLine({ status }: { status: PurchaseStatus | null }) {
  const { words } = useMarketingDisplay();
  const outcome = status?.outcome ?? 'waiting';
  const tone = outcome === 'waiting' ? 'info' : outcome === 'closed' || outcome === 'campaign_rejected' ? 'warn' : 'ok';
  const Icon = outcome === 'waiting' ? Loader2 : outcome === 'closed' ? XCircle : outcome === 'campaign_review' ? Clock : CheckCircle2;
  return (
    <div aria-live="polite">
      <Notice tone={tone}>
        <span className="flex items-start gap-2">
          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${outcome === 'waiting' ? 'animate-spin' : ''}`} aria-hidden />
          <span>
            {outcomeText(words)[outcome]}
            {outcome === 'kept_in_balance' && status?.message ? <span className="block text-xs">{status.message}</span> : null}
          </span>
        </span>
      </Notice>
    </div>
  );
}

/**
 * Botão "Pagar com PIX" + painel do pagamento. `getPurpose` roda no clique (ex.: enviar o banner
 * antes); `onSettled` avisa quando o pagamento termina (para recarregar listas e saldo).
 */
export function PixPurchase({
  totalCents,
  disabled,
  getPurpose,
  onSettled,
  label = 'Pagar com PIX',
}: {
  totalCents: number;
  disabled?: boolean;
  getPurpose: () => Promise<DirectPurpose>;
  onSettled: () => void;
  label?: string;
}) {
  const { payMoney } = useMarketingDisplay();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null);
  const status = usePurchaseStatus(checkout?.intentId ?? null);
  const settledFor = useRef<string | null>(null);
  const tooLow = totalCents > 0 && totalCents < MIN_PAYMENT_CENTS;

  useEffect(() => {
    if (checkout && status && status.outcome !== 'waiting' && settledFor.current !== checkout.intentId) {
      settledFor.current = checkout.intentId;
      onSettled();
    }
  }, [checkout, status, onSettled]);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const purpose = await getPurpose();
      const res = await startCheckout({ purpose });
      if (res.url && !res.pix) {
        window.location.assign(res.url);
        return;
      }
      setCheckout(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível abrir o pagamento.');
    } finally {
      setBusy(false);
    }
  }

  if (checkout) {
    const waiting = !status || status.outcome === 'waiting';
    return (
      <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
        <p className="text-sm font-medium">PIX de {payMoney(checkout.amountCents ?? totalCents)}</p>
        {waiting && checkout.pix ? <PixBox pix={checkout.pix} /> : null}
        {waiting && checkout.instructions ? <p className="text-xs text-muted-foreground">{checkout.instructions}</p> : null}
        <PurchaseStatusLine status={status} />
        {!waiting ? (
          <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => setCheckout(null)}>
            {status?.outcome === 'closed' ? 'Gerar outro PIX' : 'Fazer outra compra'}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <Notice tone="error">{error}</Notice> : null}
      {tooLow ? <Notice tone="warn">O pagamento por PIX começa em {payMoney(MIN_PAYMENT_CENTS)}. Aumente a diária ou os dias.</Notice> : null}
      <div>
        <Button type="button" onClick={pay} disabled={disabled || busy || tooLow || totalCents <= 0}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          {label} · {payMoney(totalCents)}
        </Button>
      </div>
    </div>
  );
}
