/**
 * Lote de revisão de descrições por categoria: cria `ai_review_runs`, seleciona os anúncios
 * elegíveis, processa com concorrência limitada e mantém os contadores do run atualizados.
 */

import { serviceTable } from '../../service-db';
import { AiUnavailableError } from '../errors';
import { reviewService } from './review-service';

export const BATCH_CONCURRENCY = 3;
/** Run em pending/running há mais que isto é tratado como preso (processo reiniciado) e encerrado. */
export const STALE_RUN_MS = 30 * 60 * 1000;
const PAGE_SIZE = 200;
const MAX_LIMIT = 500;

export interface RunReviewBatchOptions {
  categoryId: number;
  limit: number;
  includeReviewed?: boolean;
  userId?: string | null;
  /** `true`: resolve logo após criar o run e selecionar; o processamento segue em segundo plano. */
  background?: boolean;
}

export interface RunReviewBatchResult {
  runId: number | string;
  status: 'running' | 'done' | 'failed' | 'cancelled';
  total: number;
  processed: number;
  failed: number;
  tokensIn: number;
  tokensOut: number;
  error: string | null;
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

export async function selectBatchServices(opts: {
  categoryId: number;
  limit: number;
  includeReviewed?: boolean;
}): Promise<number[]> {
  const limit = Math.max(0, Math.min(Math.floor(opts.limit) || 0, MAX_LIMIT));
  const picked: number[] = [];
  let lastId = 0;

  while (picked.length < limit) {
    const res = await serviceTable(
      `/services?category_id=eq.${opts.categoryId}&status=in.(active,pending)` +
        `&description=not.is.null&id=gt.${lastId}&select=id,description&order=id.asc&limit=${PAGE_SIZE}`
    );
    if (!res.ok) throw new Error(`Falha ao listar serviços (${res.status}).`);
    const page = (await res.json()) as Candidate[];
    if (page.length === 0) break;
    lastId = Number(page[page.length - 1].id);

    const ids = page.map((s) => s.id).join(',');
    const revRes = await serviceTable(
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

/** Já existe um lote em andamento (não preso) para a categoria. */
export class ReviewRunConflictError extends Error {
  constructor(public readonly runId: number | string) {
    super('Já existe uma revisão em andamento para esta categoria.');
    this.name = 'ReviewRunConflictError';
  }
}

/** Encerra como `failed` os runs pending/running antigos (o processo que os tocava não existe mais). */
export async function expireStaleRuns(now: number = Date.now()): Promise<number> {
  try {
    const before = new Date(now - STALE_RUN_MS).toISOString();
    const res = await serviceTable(
      `/ai_review_runs?status=in.(pending,running)&created_at=lt.${encodeURIComponent(before)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({
          status: 'failed',
          error: 'Execução interrompida (processo reiniciado ou sem resposta).',
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

async function findActiveRun(categoryId: number): Promise<number | string | null> {
  const res = await serviceTable(
    `/ai_review_runs?category_id=eq.${categoryId}&status=in.(pending,running)&select=id&limit=1`
  );
  if (!res.ok) return null;
  const rows = (await res.json().catch(() => [])) as Array<{ id: number | string }>;
  return rows[0]?.id ?? null;
}

async function patchRun(
  runId: number | string,
  patch: Record<string, unknown>,
  onlyIfOpen = false
) {
  try {
    // `onlyIfOpen`: não sobrescreve um run já cancelado (ou encerrado) por outro caminho.
    const guard = onlyIfOpen ? '&status=in.(pending,running)' : '';
    await serviceTable(`/ai_review_runs?id=eq.${runId}${guard}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
  } catch {
    // contador é best-effort; não derruba o lote
  }
}

async function isCancelled(runId: number | string): Promise<boolean> {
  try {
    const res = await serviceTable(`/ai_review_runs?id=eq.${runId}&select=status`);
    if (!res.ok) return false;
    const rows = (await res.json()) as Array<{ status?: string }>;
    return rows[0]?.status === 'cancelled';
  } catch {
    return false;
  }
}

function msg(e: unknown): string {
  return (e instanceof Error ? e.message : String(e)).slice(0, 300);
}

export async function runReviewBatch(opts: RunReviewBatchOptions): Promise<RunReviewBatchResult> {
  const includeReviewed = Boolean(opts.includeReviewed);
  const requested = Math.max(1, Math.min(Math.floor(opts.limit) || 1, MAX_LIMIT));

  await expireStaleRuns();
  const active = await findActiveRun(opts.categoryId);
  if (active != null) throw new ReviewRunConflictError(active);

  const created = await serviceTable('/ai_review_runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      category_id: opts.categoryId,
      requested_limit: requested,
      include_reviewed: includeReviewed,
      status: 'running',
      total: 0,
      processed: 0,
      failed: 0,
      tokens_in: 0,
      tokens_out: 0,
      created_by: opts.userId ?? null,
    }),
  });
  if (!created.ok) throw new Error(`Falha ao criar o run de revisão (${created.status}).`);
  const runId = ((await created.json()) as Array<{ id: number | string }>)[0].id;

  const state: RunReviewBatchResult = {
    runId,
    status: 'running',
    total: 0,
    processed: 0,
    failed: 0,
    tokensIn: 0,
    tokensOut: 0,
    error: null,
  };

  const finish = async (status: 'done' | 'failed', error: string | null) => {
    state.status = status;
    state.error = error;
    await patchRun(runId, { status, error, finished_at: new Date().toISOString() }, true);
  };

  let ids: number[];
  try {
    ids = await selectBatchServices({ categoryId: opts.categoryId, limit: requested, includeReviewed });
  } catch (e) {
    await finish('failed', msg(e));
    return state;
  }
  state.total = ids.length;
  await patchRun(runId, { total: ids.length });

  const work = async () => {
    const queue = [...ids];
    let lastError: string | null = null;
    let aborted = false;
    let cancelled = false;

    const worker = async () => {
      while (!aborted) {
        const id = queue.shift();
        if (id === undefined) return;
        try {
          const r = await reviewService(id, { runId, userId: opts.userId ?? undefined });
          state.tokensIn += r.tokensIn;
          state.tokensOut += r.tokensOut;
        } catch (e) {
          state.failed += 1;
          lastError = msg(e);
          // Sem chave / contexto desligado / provider bloqueado: todos os próximos falhariam igual.
          if (e instanceof AiUnavailableError && e.reason === 'blocked') aborted = true;
        }
        state.processed += 1;
        await patchRun(runId, {
          processed: state.processed,
          failed: state.failed,
          tokens_in: state.tokensIn,
          tokens_out: state.tokensOut,
        });
        if (!aborted && (await isCancelled(runId))) {
          cancelled = true;
          aborted = true;
        }
      }
    };

    await Promise.all(Array.from({ length: BATCH_CONCURRENCY }, worker));

    if (cancelled) {
      state.status = 'cancelled';
      state.error = 'Cancelado pelo gestor.';
      await patchRun(runId, { finished_at: new Date().toISOString() }); // status segue 'cancelled'
    } else if (aborted) await finish('failed', lastError);
    else if (ids.length > 0 && state.failed === ids.length) await finish('failed', lastError);
    else await finish('done', state.failed > 0 ? `${state.failed} falha(s); última: ${lastError}` : null);
    return state;
  };

  if (opts.background) {
    void work().catch((e) => finish('failed', msg(e)));
    return state;
  }
  try {
    return await work();
  } catch (e) {
    await finish('failed', msg(e));
    return state;
  }
}
