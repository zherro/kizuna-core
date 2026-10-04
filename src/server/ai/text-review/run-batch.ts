/**
 * Lote de revisão de descrições por categoria, SEM segundo plano: a tela aciona o processamento
 * em passos curtos (`stepReviewRun`) enquanto a aba está aberta. Tudo roda com o JWT do usuário
 * (root) — nenhum acesso de serviço.
 *
 *  1. `startReviewRun`  valida a categoria (`categories.ai_review`), seleciona os anúncios elegíveis
 *     (respeitando limite e "incluir já revisados") e grava o run com `total` e `service_ids`.
 *  2. `stepReviewRun`   processa o próximo pedaço (até `STEP_MAX_ITEMS` anúncios, concorrência
 *     `BATCH_CONCURRENCY`, limite de tempo) e devolve o progresso. Os pendentes são recomputados a
 *     cada passo (seleção do run menos o que já tem revisão deste run, o que já tem revisão
 *     pendente e o que falhou), então o passo é idempotente e o run é retomável.
 *  3. `cancelReviewRun` cancela; o stale-run (30 min sem passo) encerra como `failed`.
 */

import { AiUnavailableError } from '../errors';
import { aiTable, type AiUserDb } from '../db';
import { reviewService } from './review-service';

export const BATCH_CONCURRENCY = 3;
export const STEP_MAX_ITEMS = 5;
/** Depois deste tempo o passo não inicia novos anúncios (os em andamento terminam). */
export const STEP_TIME_BUDGET_MS = 40_000;
/** Run em pending/running sem passo há mais que isto é tratado como preso e encerrado. */
export const STALE_RUN_MS = 30 * 60 * 1000;
const PAGE_SIZE = 200;
const MAX_LIMIT = 500;
const IN_CHUNK = 200;

export interface StartReviewRunOptions {
  categoryId: number;
  limit: number;
  includeReviewed?: boolean;
  userId?: string | null;
}

export interface ReviewRunProgress {
  runId: number | string;
  categoryId: number | null;
  status: 'pending' | 'running' | 'done' | 'failed' | 'cancelled';
  total: number;
  processed: number;
  failed: number;
  tokensIn: number;
  tokensOut: number;
  error: string | null;
  /** `true` quando o run não aceita mais passos (done, failed ou cancelled). */
  done: boolean;
}

export interface Candidate {
  id: number;
  description?: string | null;
}

export interface ExistingRevision {
  service_id: number;
  status: string;
}

/**
 * Filtra candidatos: descrição não vazia; nunca duplica `pending`; sem `includeReviewed`, exclui
 * também os já `approved`. (`rejected` volta a ser elegível.)
 */
export function filterCandidates(
  services: Candidate[],
  revisions: ExistingRevision[],
  includeReviewed: boolean
): Candidate[] {
  const blocked = new Set<number>();
  for (const r of revisions) {
    if (r.status === 'pending' || (!includeReviewed && r.status === 'approved')) {
      blocked.add(Number(r.service_id));
    }
  }
  return services.filter((s) => String(s.description ?? '').trim() !== '' && !blocked.has(Number(s.id)));
}

/** Já existe um lote em andamento (não preso) para a categoria. */
export class ReviewRunConflictError extends Error {
  constructor(public readonly runId: number | string) {
    super('Já existe uma revisão em andamento para esta categoria.');
    this.name = 'ReviewRunConflictError';
  }
}

export class ReviewCategoryDisabledError extends Error {
  constructor() {
    super('A categoria não está habilitada para revisão por IA.');
    this.name = 'ReviewCategoryDisabledError';
  }
}

export class ReviewRunNotFoundError extends Error {
  constructor() {
    super('Execução não encontrada.');
    this.name = 'ReviewRunNotFoundError';
  }
}

function msg(e: unknown): string {
  return (e instanceof Error ? e.message : String(e)).slice(0, 300);
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

export async function selectBatchServices(
  db: AiUserDb,
  opts: { categoryId: number; limit: number; includeReviewed?: boolean }
): Promise<number[]> {
  const limit = Math.max(0, Math.min(Math.floor(opts.limit) || 0, MAX_LIMIT));
  const picked: number[] = [];
  let lastId = 0;

  while (picked.length < limit) {
    const res = await aiTable(
      db,
      `/services?category_id=eq.${opts.categoryId}&status=in.(active,pending)` +
        `&description=not.is.null&id=gt.${lastId}&select=id,description&order=id.asc&limit=${PAGE_SIZE}`
    );
    if (!res.ok) throw new Error(`Falha ao listar serviços (${res.status}).`);
    const page = (await res.json()) as Candidate[];
    if (page.length === 0) break;
    lastId = Number(page[page.length - 1].id);

    const ids = page.map((s) => s.id).join(',');
    const revRes = await aiTable(
      db,
      `/service_text_revisions?field=eq.description&status=in.(pending,approved)` +
        `&service_id=in.(${ids})&select=service_id,status`
    );
    if (!revRes.ok) throw new Error(`Falha ao listar revisões (${revRes.status}).`);
    const revisions = (await revRes.json()) as ExistingRevision[];

    for (const c of filterCandidates(page, revisions, Boolean(opts.includeReviewed))) {
      picked.push(Number(c.id));
      if (picked.length >= limit) break;
    }
    if (page.length < PAGE_SIZE) break;
  }
  return picked;
}

type RunRow = {
  id: number | string;
  category_id: number | null;
  status: ReviewRunProgress['status'];
  total: number;
  processed: number;
  failed: number;
  tokens_in: number;
  tokens_out: number;
  error: string | null;
  service_ids: unknown;
  failed_ids: unknown;
  updated_at: string | null;
  created_at: string | null;
};

const RUN_SELECT =
  'id,category_id,status,total,processed,failed,tokens_in,tokens_out,error,service_ids,failed_ids,created_at,updated_at';

const isOpen = (status: string) => status === 'pending' || status === 'running';

function toNumberList(value: unknown): number[] {
  return Array.isArray(value) ? value.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
}

export function toProgress(row: RunRow): ReviewRunProgress {
  return {
    runId: row.id,
    categoryId: row.category_id != null ? Number(row.category_id) : null,
    status: row.status,
    total: Number(row.total ?? 0),
    processed: Number(row.processed ?? 0),
    failed: Number(row.failed ?? 0),
    tokensIn: Number(row.tokens_in ?? 0),
    tokensOut: Number(row.tokens_out ?? 0),
    error: row.error ?? null,
    done: !isOpen(row.status),
  };
}

/** Encerra como `failed` os runs pending/running sem passo há mais de `STALE_RUN_MS`. */
export async function expireStaleRuns(db: AiUserDb, now: number = Date.now()): Promise<number> {
  try {
    const before = new Date(now - STALE_RUN_MS).toISOString();
    const res = await aiTable(
      db,
      `/ai_review_runs?status=in.(pending,running)&updated_at=lt.${encodeURIComponent(before)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({
          status: 'failed',
          error: 'Execução interrompida (sem resposta há mais de 30 minutos).',
          finished_at: new Date(now).toISOString(),
        }),
      }
    );
    if (!res.ok) return 0;
    return ((await res.json().catch(() => [])) as unknown[]).length;
  } catch {
    return 0;
  }
}

async function findActiveRun(db: AiUserDb, categoryId: number): Promise<number | string | null> {
  const res = await aiTable(
    db,
    `/ai_review_runs?category_id=eq.${categoryId}&status=in.(pending,running)&select=id&limit=1`
  );
  if (!res.ok) return null;
  const rows = (await res.json().catch(() => [])) as Array<{ id: number | string }>;
  return rows[0]?.id ?? null;
}

async function loadRun(db: AiUserDb, runId: number | string): Promise<RunRow | null> {
  const res = await aiTable(db, `/ai_review_runs?id=eq.${runId}&select=${RUN_SELECT}&limit=1`);
  if (!res.ok) throw new Error(`Falha ao ler a execução (${res.status}).`);
  const rows = (await res.json().catch(() => [])) as RunRow[];
  return rows[0] ?? null;
}

/** Último run em andamento (para retomar ao reabrir a tela), ou `null`. */
export async function getActiveReviewRun(db: AiUserDb): Promise<ReviewRunProgress | null> {
  await expireStaleRuns(db);
  const res = await aiTable(
    db,
    `/ai_review_runs?status=in.(pending,running)&select=${RUN_SELECT}&order=created_at.desc&limit=1`
  );
  if (!res.ok) throw new Error(`Falha ao ler a execução (${res.status}).`);
  const rows = (await res.json().catch(() => [])) as RunRow[];
  return rows[0] ? toProgress(rows[0]) : null;
}

/** Progresso de um run (encerra o run preso antes de responder). */
export async function getReviewRun(db: AiUserDb, runId: number | string): Promise<ReviewRunProgress> {
  await expireStaleRuns(db);
  const row = await loadRun(db, runId);
  if (!row) throw new ReviewRunNotFoundError();
  return toProgress(row);
}

/**
 * PATCH do run. Com `onlyIfOpen`, não sobrescreve um run já cancelado/encerrado por outro caminho.
 * Devolve a linha atualizada, ou `null` se nada foi alterado.
 */
async function patchRun(
  db: AiUserDb,
  runId: number | string,
  patch: Record<string, unknown>,
  onlyIfOpen = true
): Promise<RunRow | null> {
  const guard = onlyIfOpen ? '&status=in.(pending,running)' : '';
  const res = await aiTable(db, `/ai_review_runs?id=eq.${runId}${guard}&select=${RUN_SELECT}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Falha ao atualizar a execução (${res.status}).`);
  const rows = (await res.json().catch(() => [])) as RunRow[];
  return rows[0] ?? null;
}

async function isCancelled(db: AiUserDb, runId: number | string): Promise<boolean> {
  try {
    const res = await aiTable(db, `/ai_review_runs?id=eq.${runId}&select=status`);
    if (!res.ok) return false;
    const rows = (await res.json()) as Array<{ status?: string }>;
    return rows[0]?.status === 'cancelled';
  } catch {
    return false;
  }
}

/** Cria o run: valida a categoria, seleciona os anúncios e grava `total` + `service_ids`. */
export async function startReviewRun(
  db: AiUserDb,
  opts: StartReviewRunOptions
): Promise<{ runId: number | string; status: 'running' | 'done'; total: number }> {
  const includeReviewed = Boolean(opts.includeReviewed);
  const requested = Math.max(1, Math.min(Math.floor(opts.limit) || 1, MAX_LIMIT));

  const catRes = await aiTable(db, `/categories?id=eq.${opts.categoryId}&select=id,ai_review&limit=1`);
  const cats = catRes.ok ? ((await catRes.json().catch(() => [])) as Array<{ ai_review?: boolean }>) : [];
  if (cats[0]?.ai_review !== true) throw new ReviewCategoryDisabledError();

  await expireStaleRuns(db);
  const active = await findActiveRun(db, opts.categoryId);
  if (active != null) throw new ReviewRunConflictError(active);

  const ids = await selectBatchServices(db, {
    categoryId: opts.categoryId,
    limit: requested,
    includeReviewed,
  });
  const status = ids.length > 0 ? 'running' : 'done';

  const created = await aiTable(db, '/ai_review_runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      category_id: opts.categoryId,
      requested_limit: requested,
      include_reviewed: includeReviewed,
      status,
      total: ids.length,
      processed: 0,
      failed: 0,
      tokens_in: 0,
      tokens_out: 0,
      service_ids: ids,
      failed_ids: [],
      ...(opts.userId ? { created_by: opts.userId } : {}),
      ...(status === 'done' ? { finished_at: new Date().toISOString() } : {}),
    }),
  });
  if (!created.ok) throw new Error(`Falha ao criar o run de revisão (${created.status}).`);
  const rows = (await created.json().catch(() => [])) as Array<{ id: number | string }>;
  if (!rows[0]) throw new Error('Falha ao criar o run de revisão.');
  return { runId: rows[0].id, status, total: ids.length };
}

/** Anúncios do run ainda por processar (ordem da seleção). */
export async function computePendingIds(db: AiUserDb, run: RunRow): Promise<number[]> {
  const selected = toNumberList(run.service_ids);
  if (selected.length === 0) return [];
  const failed = new Set(toNumberList(run.failed_ids));
  const handled = new Set<number>(failed);

  // Já têm revisão criada por este run (qualquer status).
  const own = await aiTable(
    db,
    `/service_text_revisions?run_id=eq.${run.id}&field=eq.description&select=service_id&limit=1000`
  );
  if (!own.ok) throw new Error(`Falha ao listar revisões do run (${own.status}).`);
  for (const r of (await own.json()) as Array<{ service_id: number }>) handled.add(Number(r.service_id));

  // Já têm revisão pendente (de outro lote): o reviewService pularia, então contam como feitos.
  const left = selected.filter((id) => !handled.has(id));
  for (const part of chunk(left, IN_CHUNK)) {
    const res = await aiTable(
      db,
      `/service_text_revisions?field=eq.description&status=eq.pending&service_id=in.(${part.join(',')})` +
        `&select=service_id`
    );
    if (!res.ok) throw new Error(`Falha ao listar revisões pendentes (${res.status}).`);
    for (const r of (await res.json()) as Array<{ service_id: number }>) handled.add(Number(r.service_id));
  }
  return selected.filter((id) => !handled.has(id));
}

export interface StepOptions {
  userId?: string | null;
  maxItems?: number;
  concurrency?: number;
  budgetMs?: number;
  now?: () => number;
}

/**
 * Processa o próximo pedaço do run. Idempotente: pode ser chamado de novo a qualquer momento
 * (após queda de aba/rede) e continua de onde parou. Run encerrado devolve só o progresso.
 */
export async function stepReviewRun(
  db: AiUserDb,
  runId: number | string,
  opts: StepOptions = {}
): Promise<ReviewRunProgress> {
  const now = opts.now ?? Date.now;
  const maxItems = Math.max(1, opts.maxItems ?? STEP_MAX_ITEMS);
  const concurrency = Math.max(1, opts.concurrency ?? BATCH_CONCURRENCY);
  const budgetMs = opts.budgetMs ?? STEP_TIME_BUDGET_MS;

  await expireStaleRuns(db, now());
  const run = await loadRun(db, runId);
  if (!run) throw new ReviewRunNotFoundError();
  if (!isOpen(run.status)) return toProgress(run);

  const pending = await computePendingIds(db, run);
  const finishedAt = new Date(now()).toISOString();

  const finish = async (
    status: 'done' | 'failed',
    error: string | null,
    extra: Record<string, unknown> = {}
  ) => {
    const row = await patchRun(db, runId, { status, error, finished_at: finishedAt, ...extra });
    return toProgress(row ?? (await loadRun(db, runId)) ?? run);
  };

  if (pending.length === 0) {
    const failedCount = toNumberList(run.failed_ids).length;
    return finish(
      failedCount > 0 && failedCount === run.total ? 'failed' : 'done',
      failedCount > 0 ? `${failedCount} falha(s)${run.error ? `; ${run.error}` : ''}` : null,
      { processed: run.total, failed: failedCount }
    );
  }

  const startedAt = now();
  const queue = pending.slice(0, maxItems);
  const failedIds = new Set(toNumberList(run.failed_ids));
  let attempted = 0;
  let tokensIn = 0;
  let tokensOut = 0;
  let lastError: string | null = null;
  let blocked = false;
  let cancelled = false;

  const worker = async () => {
    while (!blocked && !cancelled) {
      if (now() - startedAt > budgetMs) return;
      const id = queue.shift();
      if (id === undefined) return;
      attempted += 1;
      try {
        const r = await reviewService(db, id, { runId, userId: opts.userId ?? undefined });
        tokensIn += r.tokensIn;
        tokensOut += r.tokensOut;
      } catch (e) {
        failedIds.add(id);
        lastError = msg(e);
        // Sem chave / contexto desligado / provider bloqueado: todos os próximos falhariam igual.
        if (e instanceof AiUnavailableError && e.reason === 'blocked') blocked = true;
      }
      if (!blocked && (await isCancelled(db, runId))) cancelled = true;
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));

  const remaining = pending.length - attempted;
  const counters = {
    processed: Math.max(0, run.total - remaining),
    failed: failedIds.size,
    failed_ids: [...failedIds],
    tokens_in: Number(run.tokens_in ?? 0) + tokensIn,
    tokens_out: Number(run.tokens_out ?? 0) + tokensOut,
    updated_at: new Date(now()).toISOString(),
  };

  if (cancelled) {
    // O status já é 'cancelled': só grava contadores e o fim.
    const row = await patchRun(db, runId, { ...counters, finished_at: finishedAt }, false);
    return toProgress(row ?? { ...run, status: 'cancelled' });
  }
  if (blocked) return finish('failed', lastError, counters);
  if (remaining === 0) {
    const all = failedIds.size >= run.total && run.total > 0;
    return finish(
      all ? 'failed' : 'done',
      failedIds.size > 0 ? `${failedIds.size} falha(s); última: ${lastError ?? run.error ?? '—'}` : null,
      counters
    );
  }

  const row = await patchRun(db, runId, { ...counters, error: lastError ?? run.error ?? null });
  // `null`: o run foi cancelado/encerrado por outro caminho durante o passo; devolve o estado real.
  return toProgress(row ?? (await loadRun(db, runId)) ?? run);
}

/** Cancela um run em andamento. `false` se não estava em andamento. */
export async function cancelReviewRun(db: AiUserDb, runId: number | string): Promise<boolean> {
  const row = await patchRun(db, runId, {
    status: 'cancelled',
    finished_at: new Date().toISOString(),
  });
  return row != null;
}
