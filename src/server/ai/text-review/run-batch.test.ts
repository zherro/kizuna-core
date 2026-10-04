import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, any>;

// Banco falso em memória: só o que o run-batch consulta/grava.
const db = { accessToken: 'jwt-do-root' };
const state = {
  categories: [] as Row[],
  services: [] as Row[],
  revisions: [] as Row[],
  runs: [] as Row[],
  calls: [] as Array<{ path: string; method: string; body?: any }>,
};
let nextRunId = 42;

const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status });
const inList = (path: string, key: string): string[] | null => {
  const m = new RegExp(`[?&]${key}=in\\.\\(([^)]*)\\)`).exec(path);
  return m ? m[1].split(',') : null;
};
const eq = (path: string, key: string): string | null => {
  const m = new RegExp(`[?&]${key}=eq\\.([^&]*)`).exec(path);
  return m ? decodeURIComponent(m[1]) : null;
};

async function fakeTable(_db: unknown, path: string, init?: RequestInit) {
  const method = (init?.method ?? 'GET').toUpperCase();
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  state.calls.push({ path, method, body });

  if (path.startsWith('/categories?')) {
    return json(state.categories.filter((c) => String(c.id) === eq(path, 'id')));
  }

  if (path.startsWith('/services?')) {
    const cat = eq(path, 'category_id');
    const gt = Number(/id=gt\.(\d+)/.exec(path)?.[1] ?? 0);
    return json(state.services.filter((s) => String(s.category_id) === cat && s.id > gt));
  }

  if (path.startsWith('/service_text_revisions?')) {
    const runId = eq(path, 'run_id');
    if (runId) {
      return json(state.revisions.filter((r) => String(r.run_id) === runId).map((r) => ({ service_id: r.service_id })));
    }
    const ids = (inList(path, 'service_id') ?? []).map(Number);
    const statusEq = eq(path, 'status');
    const statusIn = inList(path, 'status');
    return json(
      state.revisions.filter(
        (r) =>
          ids.includes(r.service_id) &&
          (statusEq ? r.status === statusEq : statusIn ? statusIn.includes(r.status) : true)
      )
    );
  }

  if (path.startsWith('/ai_review_runs')) {
    if (method === 'POST') {
      const row = { id: nextRunId++, updated_at: new Date().toISOString(), created_at: new Date().toISOString(), ...body };
      state.runs.push(row);
      return json([row], 201);
    }
    const open = (r: Row) => r.status === 'pending' || r.status === 'running';
    if (method === 'PATCH') {
      const id = eq(path, 'id');
      const guard = path.includes('status=in.(pending,running)');
      const stale = /updated_at=lt\.([^&]+)/.exec(path);
      const targets = state.runs.filter((r) => {
        if (id && String(r.id) !== id) return false;
        if (guard && !open(r)) return false;
        if (stale && !(open(r) && r.updated_at < decodeURIComponent(stale[1]))) return false;
        return true;
      });
      targets.forEach((r) => Object.assign(r, body));
      return json(targets);
    }
    // GET
    const id = eq(path, 'id');
    const cat = eq(path, 'category_id');
    let rows = state.runs.filter((r) => (!id || String(r.id) === id) && (!cat || String(r.category_id) === cat));
    if (path.includes('status=in.(pending,running)')) rows = rows.filter(open);
    return json(rows);
  }
  return new Response(null, { status: 404 });
}

vi.mock('../db', () => ({ aiTable: (...a: [unknown, string, RequestInit?]) => fakeTable(...a) }));

const reviewService = vi.fn();
vi.mock('./review-service', () => ({ reviewService: (...a: unknown[]) => reviewService(...a) }));

import {
  cancelReviewRun,
  expireStaleRuns,
  filterCandidates,
  getActiveReviewRun,
  ReviewCategoryDisabledError,
  ReviewRunConflictError,
  selectBatchServices,
  startReviewRun,
  stepReviewRun,
  STALE_RUN_MS,
} from './run-batch';
import { AiUnavailableError } from '../errors';

/** reviewService falso: grava a revisão pendente do run no banco falso. */
function okReview(tokens = { tokensIn: 10, tokensOut: 5 }) {
  reviewService.mockImplementation(async (_db: unknown, id: number, opts: { runId: number }) => {
    state.revisions.push({ service_id: id, status: 'pending', run_id: opts.runId });
    return { serviceId: id, skipped: false, ...tokens };
  });
}

beforeEach(() => {
  state.categories = [{ id: 1, ai_review: true }, { id: 2, ai_review: false }];
  state.services = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, category_id: 1, description: 'x' }));
  state.revisions = [];
  state.runs = [];
  state.calls = [];
  nextRunId = 42;
  reviewService.mockReset();
});

describe('filterCandidates', () => {
  const services = [
    { id: 1, description: 'a' },
    { id: 2, description: '   ' },
    { id: 3, description: 'c' },
    { id: 4, description: 'd' },
    { id: 5, description: 'e' },
  ];
  const revs = [
    { service_id: 3, status: 'pending' },
    { service_id: 4, status: 'approved' },
  ];
  it('sem includeReviewed exclui pending, approved e descrição vazia', () => {
    expect(filterCandidates(services, revs, false).map((s) => s.id)).toEqual([1, 5]);
  });
  it('com includeReviewed inclui approved mas nunca duplica pending', () => {
    expect(filterCandidates(services, revs, true).map((s) => s.id)).toEqual([1, 4, 5]);
  });
});

describe('selectBatchServices', () => {
  it('respeita o limite e consulta só active/pending da categoria', async () => {
    state.services = [1, 2, 3, 4].map((id) => ({ id, category_id: 9, description: 'x' }));
    state.revisions = [{ service_id: 1, status: 'approved', run_id: 1 }];
    const ids = await selectBatchServices(db, { categoryId: 9, limit: 2 });
    expect(ids).toEqual([2, 3]);
    expect(state.calls[0].path).toContain('category_id=eq.9');
    expect(state.calls[0].path).toContain('status=in.(active,pending)');
  });
});

describe('startReviewRun', () => {
  it('cria o run com total e service_ids respeitando o limite', async () => {
    const r = await startReviewRun(db, { categoryId: 1, limit: 7, userId: 'u' });
    expect(r).toEqual({ runId: 42, status: 'running', total: 7 });
    expect(state.runs[0]).toMatchObject({
      category_id: 1,
      requested_limit: 7,
      include_reviewed: false,
      status: 'running',
      total: 7,
      service_ids: [1, 2, 3, 4, 5, 6, 7],
    });
    expect(reviewService).not.toHaveBeenCalled();
  });

  it('"incluir já revisados" traz os approved de volta', async () => {
    state.revisions = [{ service_id: 1, status: 'approved', run_id: 1 }];
    const a = await startReviewRun(db, { categoryId: 1, limit: 3 });
    expect(state.runs[0].service_ids).toEqual([2, 3, 4]);
    expect(a.total).toBe(3);
    state.runs = [];
    await startReviewRun(db, { categoryId: 1, limit: 3, includeReviewed: true });
    expect(state.runs[0].service_ids).toEqual([1, 2, 3]);
  });

  it('categoria sem ai_review é recusada', async () => {
    await expect(startReviewRun(db, { categoryId: 2, limit: 5 })).rejects.toBeInstanceOf(
      ReviewCategoryDisabledError
    );
    expect(state.runs).toHaveLength(0);
  });

  it('sem anúncios elegíveis o run já nasce done', async () => {
    state.services = [];
    const r = await startReviewRun(db, { categoryId: 1, limit: 5 });
    expect(r).toMatchObject({ status: 'done', total: 0 });
    expect(state.runs[0].status).toBe('done');
  });

  it('recusa novo lote se já há um em andamento na categoria', async () => {
    state.runs = [{ id: 7, category_id: 1, status: 'running', updated_at: new Date().toISOString() }];
    await expect(startReviewRun(db, { categoryId: 1, limit: 5 })).rejects.toBeInstanceOf(ReviewRunConflictError);
    expect(state.runs).toHaveLength(1);
  });

  it('limpa runs presos antes de checar conflito', async () => {
    const old = new Date(Date.now() - STALE_RUN_MS - 60_000).toISOString();
    state.runs = [{ id: 7, category_id: 1, status: 'running', updated_at: old }];
    const r = await startReviewRun(db, { categoryId: 1, limit: 2 });
    expect(r.runId).toBe(42);
    expect(state.runs.find((x) => x.id === 7)?.status).toBe('failed');
  });
});

describe('stepReviewRun', () => {
  it('processa até 5 anúncios por passo e devolve o progresso; retoma até concluir', async () => {
    okReview();
    await startReviewRun(db, { categoryId: 1, limit: 12 });

    const p1 = await stepReviewRun(db, 42);
    expect(p1).toMatchObject({ status: 'running', total: 12, processed: 5, failed: 0, done: false });
    expect(reviewService).toHaveBeenCalledTimes(5);

    const p2 = await stepReviewRun(db, 42);
    expect(p2).toMatchObject({ processed: 10, done: false });

    const p3 = await stepReviewRun(db, 42);
    expect(p3).toMatchObject({ status: 'done', processed: 12, failed: 0, done: true, tokensIn: 120, tokensOut: 60 });
    expect(reviewService).toHaveBeenCalledTimes(12);

    // passo após o fim não reprocessa nada
    const p4 = await stepReviewRun(db, 42);
    expect(p4.done).toBe(true);
    expect(reviewService).toHaveBeenCalledTimes(12);
  });

  it('é idempotente: não reprocessa anúncios que já têm revisão deste run', async () => {
    okReview();
    await startReviewRun(db, { categoryId: 1, limit: 6 });
    state.revisions.push({ service_id: 1, status: 'approved', run_id: 42 }, { service_id: 2, status: 'rejected', run_id: 42 });
    await stepReviewRun(db, 42);
    const called = reviewService.mock.calls.map((c) => c[1]);
    expect(called).toEqual([3, 4, 5, 6]);
  });

  it('anúncio com revisão pendente de outro lote conta como feito e não é reprocessado', async () => {
    okReview();
    await startReviewRun(db, { categoryId: 1, limit: 3 });
    state.revisions.push({ service_id: 2, status: 'pending', run_id: 7 });
    const p = await stepReviewRun(db, 42);
    expect(reviewService.mock.calls.map((c) => c[1])).toEqual([1, 3]);
    expect(p).toMatchObject({ status: 'done', processed: 3, done: true });
  });

  it('falha por item não aborta, não é repetida e fecha como done com aviso', async () => {
    okReview();
    reviewService.mockImplementation(async (_db: unknown, id: number, opts: { runId: number }) => {
      if (id === 2) throw new Error('validação');
      state.revisions.push({ service_id: id, status: 'pending', run_id: opts.runId });
      return { tokensIn: 1, tokensOut: 1 };
    });
    await startReviewRun(db, { categoryId: 1, limit: 4 });
    const p = await stepReviewRun(db, 42);
    expect(p).toMatchObject({ status: 'done', processed: 4, failed: 1, done: true });
    expect(p.error).toMatch(/1 falha/);
    expect(state.runs[0].failed_ids).toEqual([2]);
    await stepReviewRun(db, 42);
    expect(reviewService).toHaveBeenCalledTimes(4);
  });

  it('todas falharam → failed', async () => {
    reviewService.mockRejectedValue(new Error('x'));
    await startReviewRun(db, { categoryId: 1, limit: 2 });
    const p = await stepReviewRun(db, 42);
    expect(p).toMatchObject({ status: 'failed', failed: 2, done: true });
  });

  it('erro blocked (sem chave) aborta o run como failed', async () => {
    reviewService.mockRejectedValue(new AiUnavailableError('sem chave', { reason: 'blocked' }));
    await startReviewRun(db, { categoryId: 1, limit: 10 });
    const p = await stepReviewRun(db, 42);
    expect(p.status).toBe('failed');
    expect(p.done).toBe(true);
    expect(reviewService.mock.calls.length).toBeLessThanOrEqual(3);
    expect(p.error).toContain('sem chave');
  });

  it('limita a concorrência a 3', async () => {
    let running = 0;
    let peak = 0;
    reviewService.mockImplementation(async (_db: unknown, id: number, opts: { runId: number }) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      state.revisions.push({ service_id: id, status: 'pending', run_id: opts.runId });
      return { tokensIn: 0, tokensOut: 0 };
    });
    await startReviewRun(db, { categoryId: 1, limit: 10 });
    await stepReviewRun(db, 42);
    expect(peak).toBe(3);
  });

  it('respeita o limite de tempo: não inicia novos anúncios depois do orçamento', async () => {
    okReview();
    await startReviewRun(db, { categoryId: 1, limit: 10 });
    let t = 0;
    const p = await stepReviewRun(db, 42, { concurrency: 1, budgetMs: 100, now: () => (t += 60) });
    expect(reviewService.mock.calls.length).toBeLessThan(5);
    expect(p.done).toBe(false);
    expect(p.processed).toBe(reviewService.mock.calls.length);
  });

  it('cancelado pelo gestor durante o passo: para e não sobrescreve o status', async () => {
    okReview();
    await startReviewRun(db, { categoryId: 1, limit: 10 });
    reviewService.mockImplementation(async (_db: unknown, id: number, opts: { runId: number }) => {
      state.revisions.push({ service_id: id, status: 'pending', run_id: opts.runId });
      state.runs[0].status = 'cancelled';
      return { tokensIn: 0, tokensOut: 0 };
    });
    const p = await stepReviewRun(db, 42, { concurrency: 1 });
    expect(p.status).toBe('cancelled');
    expect(p.done).toBe(true);
    expect(reviewService).toHaveBeenCalledTimes(1);
    expect(state.runs[0].status).toBe('cancelled');
  });

  it('run preso (sem passo há mais de 30 min) é encerrado como failed em vez de processar', async () => {
    okReview();
    await startReviewRun(db, { categoryId: 1, limit: 3 });
    state.runs[0].updated_at = new Date(Date.now() - STALE_RUN_MS - 1000).toISOString();
    const p = await stepReviewRun(db, 42);
    expect(p).toMatchObject({ status: 'failed', done: true });
    expect(reviewService).not.toHaveBeenCalled();
  });

  it('run inexistente', async () => {
    await expect(stepReviewRun(db, 999)).rejects.toThrow(/não encontrada/);
  });

  it('passa o JWT do usuário (db) ao reviewService', async () => {
    okReview();
    await startReviewRun(db, { categoryId: 1, limit: 1 });
    await stepReviewRun(db, 42, { userId: 'u1' });
    expect(reviewService.mock.calls[0][0]).toBe(db);
    expect(reviewService.mock.calls[0][2]).toMatchObject({ runId: 42, userId: 'u1' });
  });
});

describe('cancelReviewRun / getActiveReviewRun / expireStaleRuns', () => {
  it('cancela run em andamento e recusa quando já encerrado', async () => {
    await startReviewRun(db, { categoryId: 1, limit: 3 });
    expect(await cancelReviewRun(db, 42)).toBe(true);
    expect(state.runs[0].status).toBe('cancelled');
    expect(await cancelReviewRun(db, 42)).toBe(false);
  });

  it('getActiveReviewRun devolve o run em andamento (para retomar) ou null', async () => {
    expect(await getActiveReviewRun(db)).toBeNull();
    await startReviewRun(db, { categoryId: 1, limit: 3 });
    expect(await getActiveReviewRun(db)).toMatchObject({ runId: 42, status: 'running', total: 3, categoryId: 1 });
  });

  it('expireStaleRuns usa updated_at e encerra como failed', async () => {
    const now = Date.parse('2026-01-01T12:00:00Z');
    state.runs = [
      { id: 1, status: 'running', updated_at: new Date(now - STALE_RUN_MS - 1).toISOString() },
      { id: 2, status: 'pending', updated_at: new Date(now - STALE_RUN_MS - 5000).toISOString() },
      { id: 3, status: 'running', updated_at: new Date(now - 1000).toISOString() },
    ];
    expect(await expireStaleRuns(db, now)).toBe(2);
    expect(state.runs.map((r) => r.status)).toEqual(['failed', 'failed', 'running']);
    expect(decodeURIComponent(state.calls[0].path)).toContain(
      `updated_at=lt.${new Date(now - STALE_RUN_MS).toISOString()}`
    );
  });
});
