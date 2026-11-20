import { addDays, dbToday, MAX_DAILY_CENTS, MAX_PERIOD_DAYS, MIN_DAILY_CENTS } from '../../../shared/marketing/cost';
import type { ServiceDb } from '../../service-db';

/**
 * Compra direta (plugins/marketing/0002): o pagamento carrega o que o usuário quer comprar. Roda
 * sempre no servidor, como service_role (BYPASSRLS) — por isso confere aqui as MESMAS regras que
 * as policies de INSERT de `boosts`/`ad_campaigns` impõem ao usuário (dono, anúncio publicado,
 * espaço habilitado, período, sem sobrepor boost).
 */
export type Purpose =
  | { kind: 'boost'; serviceUid: string; dailyCents: number; startsOn: string; days: number }
  | { kind: 'campaign'; creativeId: string; slotSlug: string; dailyCents: number; startsOn: string; days: number };

export type PurposeOwner = { tenantId: string; userId: string };
export type PurposePlan = { startsOn: string; endsOn: string; costCents: number };
export type PlanResult =
  | ({ ok: true } & PurposePlan)
  | { ok: false; reason: string; /** erro de infraestrutura: tentar de novo */ transient?: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9_-]{1,60}$/;

const int = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) ? v : null);

/** Valida só a FORMA (vinda do navegador ou do banco). Regras de dono/estado: `planPurpose`. */
export function parsePurpose(raw: unknown): Purpose | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const dailyCents = int(r.dailyCents);
  const days = int(r.days);
  const startsOn = typeof r.startsOn === 'string' && DATE.test(r.startsOn) ? r.startsOn : null;
  if (dailyCents === null || dailyCents < MIN_DAILY_CENTS || dailyCents > MAX_DAILY_CENTS) return null;
  if (days === null || days < 1 || days > MAX_PERIOD_DAYS || !startsOn || Number.isNaN(Date.parse(startsOn))) return null;
  if (r.kind === 'boost' && typeof r.serviceUid === 'string' && UUID.test(r.serviceUid)) {
    return { kind: 'boost', serviceUid: r.serviceUid.toLowerCase(), dailyCents, startsOn, days };
  }
  if (
    r.kind === 'campaign' &&
    typeof r.creativeId === 'string' &&
    UUID.test(r.creativeId) &&
    typeof r.slotSlug === 'string' &&
    SLUG.test(r.slotSlug)
  ) {
    return { kind: 'campaign', creativeId: r.creativeId.toLowerCase(), slotSlug: r.slotSlug, dailyCents, startsOn, days };
  }
  return null;
}

export const purposeCost = (p: Purpose) => p.dailyCents * p.days;

async function rows<T>(db: ServiceDb, path: string): Promise<T[] | null> {
  const res = await db.table(path);
  if (!res.ok) return null;
  return (await res.json()) as T[];
}

const transient = (): PlanResult => ({ ok: false, reason: 'Falha ao consultar o banco.', transient: true });

/**
 * Confere se a compra pode ser feita AGORA e calcula o período final. O início nunca fica no
 * passado (pagamento confirmado depois da data escolhida desloca o período, mantendo os dias e o
 * valor) e um boost não sobrepõe outro do mesmo anúncio (começa depois do que estiver valendo).
 */
export async function planPurpose(
  db: ServiceDb,
  owner: PurposeOwner,
  p: Purpose,
  today: string = dbToday(),
): Promise<PlanResult> {
  let startsOn = p.startsOn < today ? today : p.startsOn;

  if (p.kind === 'boost') {
    const svc = await rows<{ created_by: string; active: boolean; status: string }>(
      db,
      `/services?uid=eq.${p.serviceUid}&select=created_by,active,status&limit=1`,
    );
    if (!svc) return transient();
    const s = svc[0];
    if (!s || s.created_by !== owner.userId) return { ok: false, reason: 'Anúncio não encontrado.' };
    if (!s.active || s.status !== 'active') return { ok: false, reason: 'O anúncio precisa estar publicado para ser impulsionado.' };
    const live = await rows<{ ends_on: string }>(
      db,
      `/boosts?service_uid=eq.${p.serviceUid}&stopped_on=is.null&ends_on=gte.${startsOn}&select=ends_on&order=ends_on.desc&limit=1`,
    );
    if (!live) return transient();
    if (live[0]) startsOn = addDays(live[0].ends_on, 1);
  } else {
    const cr = await rows<{ tenant_id: string | null; slots: string[] | null }>(
      db,
      `/ad_creatives?id=eq.${p.creativeId}&select=tenant_id,slots&limit=1`,
    );
    if (!cr) return transient();
    const c = cr[0];
    if (!c || c.tenant_id !== owner.tenantId) return { ok: false, reason: 'Banner não encontrado.' };
    if (!(c.slots ?? []).includes(p.slotSlug)) return { ok: false, reason: 'O banner não foi enviado para esse espaço.' };
    const rv = await rows<{ status: string }>(db, `/ad_creative_reviews?creative_id=eq.${p.creativeId}&select=status&limit=1`);
    if (!rv) return transient();
    if (rv[0]?.status === 'rejected') return { ok: false, reason: 'Esse banner foi reprovado. Envie outro.' };
    const slot = await rows<{ enabled: boolean }>(db, `/ad_slots?slug=eq.${encodeURIComponent(p.slotSlug)}&select=enabled&limit=1`);
    if (!slot) return transient();
    if (!slot[0]?.enabled) return { ok: false, reason: 'Esse espaço não está aberto para contratação.' };
  }

  return { ok: true, startsOn, endsOn: addDays(startsOn, p.days - 1), costCents: purposeCost(p) };
}

export type FulfillResult =
  | { ok: true; ref: string }
  | { ok: false; reason: string; transient?: boolean };

/**
 * Cria o boost (já ativo no período) ou a campanha (só vai ao ar com o banner aprovado — a view
 * `vw_ad_campaigns_live` exige `approved`). Idempotente pelo índice único `payment_intent_id`.
 * Chamado DEPOIS do crédito: a reserva sai do saldo que acabou de entrar.
 */
export async function fulfillPurpose(
  db: ServiceDb,
  intent: { id: string; tenantId: string; createdBy: string },
  p: Purpose,
  today: string = dbToday(),
): Promise<FulfillResult> {
  const table = p.kind === 'boost' ? 'boosts' : 'ad_campaigns';
  const prefix = p.kind === 'boost' ? 'boost' : 'campaign';

  // Já criado numa entrega anterior (caiu antes de marcar a intent)?
  const existing = await rows<{ id: number | string }>(db, `/${table}?payment_intent_id=eq.${intent.id}&select=id&limit=1`);
  if (!existing) return { ok: false, reason: 'Falha ao consultar o banco.', transient: true };
  if (existing[0]) return { ok: true, ref: `${prefix}:${existing[0].id}` };

  const plan = await planPurpose(db, { tenantId: intent.tenantId, userId: intent.createdBy }, p, today);
  if (!plan.ok) return plan;

  const bal = await rows<{ balance_cents: number | string }>(
    db,
    `/vw_wallet_balance?tenant_id=eq.${intent.tenantId}&select=balance_cents&limit=1`,
  );
  if (!bal) return { ok: false, reason: 'Falha ao consultar o saldo.', transient: true };
  if (Number(bal[0]?.balance_cents ?? 0) < plan.costCents) {
    return { ok: false, reason: 'Saldo insuficiente para reservar o período.' };
  }

  const common = {
    tenant_id: intent.tenantId,
    created_by: intent.createdBy,
    daily_cents: p.dailyCents,
    starts_on: plan.startsOn,
    ends_on: plan.endsOn,
    payment_intent_id: intent.id,
  };
  const body =
    p.kind === 'boost'
      ? { ...common, service_uid: p.serviceUid }
      : { ...common, creative_id: p.creativeId, slot_slug: p.slotSlug };
  const res = await db.table(`/${table}?select=id`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
  if (res.ok) {
    const [row] = (await res.json()) as Array<{ id: number | string }>;
    return { ok: true, ref: `${prefix}:${row.id}` };
  }
  if (res.status === 409) {
    const err = (await res.json().catch(() => null)) as { code?: string } | null;
    if (err?.code === '23505') {
      // corrida com outra entrega do mesmo webhook: a outra criou
      const again = await rows<{ id: number | string }>(db, `/${table}?payment_intent_id=eq.${intent.id}&select=id&limit=1`);
      if (again?.[0]) return { ok: true, ref: `${prefix}:${again[0].id}` };
      return { ok: false, reason: 'Falha ao criar.', transient: true };
    }
  }
  if (res.status >= 500) return { ok: false, reason: 'Falha ao criar.', transient: true };
  return { ok: false, reason: 'Não foi possível criar com os dados do pedido.' };
}
