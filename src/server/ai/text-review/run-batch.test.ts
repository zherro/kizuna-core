import { beforeEach, describe, expect, it, vi } from 'vitest';

const serviceTable = vi.fn();
vi.mock('../../service-db', () => ({
  hasServiceAccess: () => true,
  serviceTable: (...a: unknown[]) => serviceTable(...a),
}));
const reviewService = vi.fn();
vi.mock('./review-service', () => ({ reviewService: (...a: unknown[]) => reviewService(...a) }));

import {
  expireStaleRuns,
  filterCandidates,
  ReviewRunConflictError,
  runReviewBatch,
  selectBatchServices,
  STALE_RUN_MS,
} from './run-batch';
import { AiUnavailableError } from '../errors';

const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status });

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
  beforeEach(() => {
    serviceTable.mockReset();
  });
  it('respeita o limite e consulta só active/pending da categoria', async () => {
    serviceTable.mockImplementation(async (path: string) => {
      if (path.startsWith('/services?')) {
        return json([1, 2, 3, 4].map((id) => ({ id, description: 'x' })));
      }
      return json([{ service_id: 1, status: 'approved' }]);
    });
    const ids = await selectBatchServices({ categoryId: 9, limit: 2 });
    expect(ids).toEqual([2, 3]);
    expect(serviceTable.mock.calls[0][0]).toContain('category_id=eq.9');
    expect(serviceTable.mock.calls[0][0]).toContain('status=in.(active,pending)');
  });
});

describe('runReviewBatch', () => {
  beforeEach(() => {
    serviceTable.mockReset();
    reviewService.mockReset();
    serviceTable.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/ai_review_runs' && init?.method === 'POST') return json([{ id: 42 }], 201);
      if (path.startsWith('/services?')) {
        return json([1, 2, 3, 4].map((id) => ({ id, description: 'x' })));
      }
      if (path.startsWith('/service_text_revisions')) return json([]);
      return new Response(null, { status: 204 });
    });
  });

  it('processa tudo, falha por item não aborta, fecha como done', async () => {
    reviewService.mockImplementation(async (id: number) => {
      if (id === 2) throw new Error('validação');
      return { tokensIn: 10, tokensOut: 5 };
    });
    const r = await runReviewBatch({ categoryId: 1, limit: 10, userId: 'u' });
    expect(r).toMatchObject({
      runId: 42,
      status: 'done',
      total: 4,
      processed: 4,
      failed: 1,
      tokensIn: 30,
      tokensOut: 15,
    });
    const patches = serviceTable.mock.calls
      .filter((c) => c[1]?.method === 'PATCH')
      .map((c) => JSON.parse(c[1].body));
    expect(patches.at(-1).status).toBe('done');
    expect(patches.filter((p) => 'processed' in p).length).toBe(4);
  });

  it('erro blocked aborta o lote como failed', async () => {
    reviewService.mockRejectedValue(new AiUnavailableError('sem chave', { reason: 'blocked' }));
    const r = await runReviewBatch({ categoryId: 1, limit: 10 });
    expect(r.status).toBe('failed');
    expect(reviewService.mock.calls.length).toBeLessThanOrEqual(3);
  });

  it('limita a concorrência a 3', async () => {
    let running = 0;
    let peak = 0;
    serviceTable.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/ai_review_runs' && init?.method === 'POST') return json([{ id: 42 }], 201);
      if (path.startsWith('/services?')) {
        return json(Array.from({ length: 10 }, (_, i) => ({ id: i + 1, description: 'x' })));
      }
      if (path.startsWith('/service_text_revisions')) return json([]);
      return new Response(null, { status: 204 });
    });
    reviewService.mockImplementation(async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      return { tokensIn: 0, tokensOut: 0 };
    });
    await runReviewBatch({ categoryId: 1, limit: 10 });
    expect(peak).toBe(3);
  });
});

describe('runReviewBatch: cancelamento, run preso e conflito', () => {
  const baseMock = (extra?: (path: string, init?: RequestInit) => Response | undefined) =>
    serviceTable.mockImplementation(async (path: string, init?: RequestInit) => {
      const custom = extra?.(path, init);
      if (custom) return custom;
      if (path === '/ai_review_runs' && init?.method === 'POST') return json([{ id: 42 }], 201);
      if (path.startsWith('/services?')) {
        return json(Array.from({ length: 10 }, (_, i) => ({ id: i + 1, description: 'x' })));
      }
      if (path.startsWith('/service_text_revisions')) return json([]);
      return new Response(null, { status: 204 });
    });

  beforeEach(() => {
    serviceTable.mockReset();
    reviewService.mockReset();
    reviewService.mockResolvedValue({ tokensIn: 1, tokensOut: 1 });
  });

  it('cancelado pelo gestor: para cedo, devolve cancelled e não sobrescreve o status', async () => {
    baseMock((path) => {
      if (path.startsWith('/ai_review_runs?id=eq.42&select=status')) return json([{ status: 'cancelled' }]);
      return undefined;
    });
    const r = await runReviewBatch({ categoryId: 1, limit: 10 });
    expect(r.status).toBe('cancelled');
    expect(r.processed).toBeLessThan(10);
    const patches = serviceTable.mock.calls
      .filter((c) => c[1]?.method === 'PATCH' && String(c[0]).startsWith('/ai_review_runs?id=eq.42'))
      .map((c) => JSON.parse(c[1].body));
    expect(patches.some((p) => p.status === 'done' || p.status === 'failed')).toBe(false);
  });

  it('o encerramento só atualiza run ainda aberto (não pisa em cancelled)', async () => {
    baseMock();
    await runReviewBatch({ categoryId: 1, limit: 2 });
    const finalPatch = serviceTable.mock.calls.filter(
      (c) => c[1]?.method === 'PATCH' && JSON.parse(c[1].body).status === 'done'
    );
    expect(finalPatch).toHaveLength(1);
    expect(finalPatch[0][0]).toContain('status=in.(pending,running)');
  });

  it('expireStaleRuns encerra pending/running com mais de 30 min como failed', async () => {
    serviceTable.mockResolvedValue(json([{ id: 1 }, { id: 2 }]));
    const now = Date.parse('2026-01-01T12:00:00Z');
    const n = await expireStaleRuns(now);
    expect(n).toBe(2);
    const [path, init] = serviceTable.mock.calls[0];
    expect(path).toContain('status=in.(pending,running)');
    expect(decodeURIComponent(path)).toContain(`created_at=lt.${new Date(now - STALE_RUN_MS).toISOString()}`);
    expect(JSON.parse(init.body)).toMatchObject({ status: 'failed' });
  });

  it('runReviewBatch limpa runs presos antes de iniciar', async () => {
    baseMock();
    await runReviewBatch({ categoryId: 1, limit: 1 });
    const first = serviceTable.mock.calls[0];
    expect(first[0]).toContain('created_at=lt.');
  });

  it('recusa novo lote se já há um em andamento na categoria', async () => {
    baseMock((path) => {
      if (path.startsWith('/ai_review_runs?category_id=eq.1&status=in.(pending,running)')) {
        return json([{ id: 7 }]);
      }
      return undefined;
    });
    await expect(runReviewBatch({ categoryId: 1, limit: 5 })).rejects.toBeInstanceOf(ReviewRunConflictError);
    expect(reviewService).not.toHaveBeenCalled();
    expect(serviceTable.mock.calls.some((c) => c[0] === '/ai_review_runs' && c[1]?.method === 'POST')).toBe(false);
  });
});
