// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AiReviewScreen } from './ai-review-screen';

const json = (v: unknown, status = 200) =>
  new Response(JSON.stringify(v), { status, headers: { 'Content-Type': 'application/json' } });

const progress = (over: Record<string, unknown>) => ({
  runId: 5,
  categoryId: 1,
  status: 'running',
  total: 7,
  processed: 0,
  failed: 0,
  tokensIn: 0,
  tokensOut: 0,
  error: null,
  done: false,
  ...over,
});

let calls: Array<{ url: string; method: string }>;
let stepResponses: Array<Record<string, unknown>>;
let activeRun: Record<string, unknown> | null;

beforeEach(() => {
  calls = [];
  stepResponses = [];
  activeRun = progress({});
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      calls.push({ url: String(url), method });
      if (String(url).includes('/api/ai/review/runs/active')) return json({ run: activeRun });
      if (String(url).includes('/step')) {
        const next = stepResponses.shift();
        return next ? json(next) : json({ message: 'sem resposta' }, 500);
      }
      if (String(url).includes('/cancel')) return json({ ok: true });
      if (/\/api\/ai\/review\/runs\/\d+$/.test(String(url))) return json(progress({ status: 'cancelled', done: true }));
      return json({ items: [], total: 0 });
    })
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const stepCalls = () => calls.filter((c) => c.url.includes('/step') && c.method === 'POST');

describe('AiReviewScreen: lote em passos acionados pela tela', () => {
  it('retoma o run ativo ao abrir e chama o passo em loop até concluir', async () => {
    stepResponses = [
      progress({ processed: 5 }),
      progress({ processed: 7, status: 'done', done: true }),
    ];
    render(<AiReviewScreen />);

    await waitFor(() => expect(stepCalls()).toHaveLength(2));
    await waitFor(() => expect(screen.getByText(/Execução concluída/)).toBeTruthy());
    expect(screen.getByText(/7\/7/)).toBeTruthy();
    // concluído: não pede mais passos
    await new Promise((r) => setTimeout(r, 50));
    expect(stepCalls()).toHaveLength(2);
    expect(screen.queryByText('Pausar')).toBeNull();
  });

  it('sem run ativo não chama o passo', async () => {
    activeRun = null;
    render(<AiReviewScreen />);
    await waitFor(() => expect(calls.some((c) => c.url.includes('/runs/active'))).toBe(true));
    await new Promise((r) => setTimeout(r, 50));
    expect(stepCalls()).toHaveLength(0);
  });

  it('Pausar interrompe o loop e Continuar retoma', async () => {
    let release: (v: Response) => void = () => undefined;
    (fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(async (url: string, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      calls.push({ url: String(url), method });
      if (String(url).includes('/runs/active')) return json({ run: activeRun });
      if (String(url).includes('/step')) {
        if (stepCalls().length === 1) return new Promise<Response>((resolve) => (release = resolve));
        return json(progress({ processed: 7, status: 'done', done: true }));
      }
      return json({ items: [], total: 0 });
    });
    render(<AiReviewScreen />);
    await waitFor(() => expect(stepCalls()).toHaveLength(1));
    fireEvent.click(await screen.findByText('Pausar'));
    release(json(progress({ processed: 3 })));
    await screen.findByText('Continuar');
    await new Promise((r) => setTimeout(r, 50));
    expect(stepCalls()).toHaveLength(1); // pausado: nenhum passo novo

    fireEvent.click(screen.getByText('Continuar'));
    await waitFor(() => expect(stepCalls()).toHaveLength(2));
    await waitFor(() => expect(screen.getByText(/Execução concluída/)).toBeTruthy());
  });

  it('Cancelar chama a rota de cancelamento e encerra o loop', async () => {
    stepResponses = [];
    (fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(async (url: string, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      calls.push({ url: String(url), method });
      if (String(url).includes('/runs/active')) return json({ run: activeRun });
      if (String(url).includes('/step')) return new Promise<Response>(() => undefined); // passo em andamento
      if (String(url).includes('/cancel')) return json({ ok: true });
      if (/\/api\/ai\/review\/runs\/\d+$/.test(String(url))) return json(progress({ status: 'cancelled', done: true }));
      return json({ items: [], total: 0 });
    });
    render(<AiReviewScreen />);
    await waitFor(() => expect(stepCalls()).toHaveLength(1));
    fireEvent.click(await screen.findByText('Cancelar'));
    await waitFor(() => expect(calls.some((c) => c.url.includes('/cancel') && c.method === 'POST')).toBe(true));
    await waitFor(() => expect(screen.getByText(/Execução cancelada/)).toBeTruthy());
  });
});
