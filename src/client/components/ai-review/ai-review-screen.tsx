'use client';

import * as React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { QuillEditor } from '../ui/quill-editor';
import {
  apiJson,
  htmlToText,
  listResource,
  SELECT_CLASS,
  type CategoryOption,
  type RunInfo,
} from './api';

type Status = 'pending' | 'approved' | 'rejected';

interface Revision {
  id: number;
  serviceId: number;
  originalText: string;
  revisedText: string;
  status: Status;
  tokensIn: number | null;
  tokensOut: number | null;
  service: { title: string; uid?: string | null } | null;
}

const STATUS_LABEL: Record<Status, string> = {
  pending: 'Pendentes',
  approved: 'Aprovadas',
  rejected: 'Rejeitadas',
};

const PAGE_SIZE = 20;

const RUN_STATUS_LABEL: Record<string, string> = {
  pending: 'pendente',
  running: 'em andamento',
  done: 'concluída',
  failed: 'com falha',
  cancelled: 'cancelada',
};

/** Resposta de `POST /api/ai/review/runs/[id]/step` (e de `runs/active`). */
interface RunProgress {
  runId: number | string;
  categoryId: number | null;
  status: string;
  total: number;
  processed: number;
  failed: number;
  tokensIn: number;
  tokensOut: number;
  error: string | null;
  done: boolean;
}

function fromProgress(p: RunProgress): RunInfo {
  return {
    id: p.runId,
    categoryId: p.categoryId,
    status: p.status,
    total: p.total,
    processed: p.processed,
    failed: p.failed,
    tokensIn: p.tokensIn,
    tokensOut: p.tokensOut,
    error: p.error,
  };
}

function RevisionCard({
  rev,
  selected,
  onSelect,
  onDone,
}: Readonly<{
  rev: Revision;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onDone: (id: number, message?: string) => void;
}>) {
  const [text, setText] = React.useState(rev.revisedText);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const pending = rev.status === 'pending';

  async function act(kind: 'apply' | 'reject') {
    setBusy(true);
    setError('');
    try {
      await apiJson(`/api/ai/review/revisions/${rev.id}/${kind}`, {
        method: 'POST',
        body: JSON.stringify(kind === 'apply' ? { text } : {}),
      });
      onDone(rev.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha na operação.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="space-y-3 rounded-[var(--ui-radius-card,1rem)] border border-border bg-card p-4">
      <header className="flex flex-wrap items-center gap-3">
        {pending ? (
          <input
            type="checkbox"
            aria-label="Selecionar revisão"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
          />
        ) : null}
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          #{rev.serviceId} · {rev.service?.title || 'Anúncio'}
        </h3>
        <Badge variant={pending ? 'secondary' : 'outline'}>{STATUS_LABEL[rev.status]}</Badge>
        {rev.tokensIn != null ? (
          <span className="text-xs text-muted-foreground">
            {rev.tokensIn}/{rev.tokensOut ?? 0} tokens
          </span>
        ) : null}
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase text-muted-foreground">Original</p>
          <div className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground">
            {htmlToText(rev.originalText)}
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            {pending ? 'Revisado (editável)' : 'Revisado'}
          </p>
          {pending ? (
            <QuillEditor value={text} onChange={setText} placeholder="Texto revisado" />
          ) : (
            <div className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground">
              {htmlToText(rev.revisedText)}
            </div>
          )}
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {pending ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => act('reject')}>
            Rejeitar
          </Button>
          <Button size="sm" disabled={busy || !text.trim()} onClick={() => act('apply')}>
            Aplicar
          </Button>
        </div>
      ) : null}
    </article>
  );
}

/** Tela de revisão em lote de descrições por IA (fluxo: disparar → acompanhar → revisar lado a lado). */
export function AiReviewScreen() {
  const [categories, setCategories] = React.useState<CategoryOption[]>([]);
  const [categoryId, setCategoryId] = React.useState('');
  const [limit, setLimit] = React.useState('20');
  const [includeReviewed, setIncludeReviewed] = React.useState(false);
  const [run, setRun] = React.useState<RunInfo | null>(null);
  const [starting, setStarting] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [message, setMessage] = React.useState('');

  const [status, setStatus] = React.useState<Status>('pending');
  const [page, setPage] = React.useState(1);
  const [items, setItems] = React.useState<Revision[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());

  React.useEffect(() => {
    listResource<CategoryOption>('categories', { pageSize: 100, 'filter.ai_review': 'true' })
      .then((r) => setCategories(r.items.filter((c) => c.aiReview)))
      .catch(() => setMessage('Não foi possível carregar as categorias.'));
  }, []);

  const loadRevisions = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await listResource<Revision>('service_text_revisions', {
        page,
        pageSize: PAGE_SIZE,
        'filter.status': status,
        'filter.field': 'description',
      });
      setItems(r.items);
      setTotal(r.total);
      setSelected(new Set());
    } catch {
      setMessage('Não foi possível carregar as revisões.');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  React.useEffect(() => {
    void loadRevisions();
  }, [loadRevisions]);

  const loadRevisionsRef = React.useRef(loadRevisions);
  React.useEffect(() => {
    loadRevisionsRef.current = loadRevisions;
  }, [loadRevisions]);

  // Retoma um run em andamento ao reabrir a tela.
  React.useEffect(() => {
    apiJson<{ run: RunProgress | null }>('/api/ai/review/runs/active')
      .then((r) => {
        if (r.run) setRun(fromProgress(r.run));
      })
      .catch(() => undefined);
  }, []);

  // O processamento acontece em passos acionados por esta tela: enquanto a aba estiver aberta e o
  // run ativo (e não pausado), chama o próximo passo em loop. Cada passo é idempotente no servidor.
  const runId = run?.id;
  const running = run?.status === 'running' || run?.status === 'pending';
  React.useEffect(() => {
    if (!runId || !running || paused) return;
    let stop = false;
    (async () => {
      let errors = 0;
      while (!stop) {
        try {
          const next = await apiJson<RunProgress>(`/api/ai/review/runs/${runId}/step`, { method: 'POST' });
          errors = 0;
          if (stop) return;
          setRun(fromProgress(next));
          if (next.done) {
            setStatus('pending');
            setPage(1);
          }
          void loadRevisionsRef.current();
          if (next.done) return;
        } catch (e) {
          errors += 1;
          if (errors >= 3) {
            if (!stop) {
              setPaused(true);
              setMessage(
                (e instanceof Error ? e.message : 'Falha no processamento') +
                  ' O lote foi pausado; use Continuar para tentar de novo.'
              );
            }
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 2000 * errors));
        }
      }
    })();
    return () => {
      stop = true;
    };
  }, [runId, running, paused]);

  async function start() {
    setStarting(true);
    setMessage('');
    try {
      setPaused(false);
      const r = await apiJson<{ runId: number; status: string; total: number }>('/api/ai/review/run', {
        method: 'POST',
        body: JSON.stringify({
          categoryId: Number(categoryId),
          limit: Number(limit),
          includeReviewed,
        }),
      });
      setRun({
        id: r.runId,
        categoryId: Number(categoryId),
        status: r.status,
        total: r.total,
        processed: 0,
        failed: 0,
        tokensIn: 0,
        tokensOut: 0,
        error: null,
      });
      if (r.status !== 'running') {
        setMessage('Nenhum anúncio elegível para revisar nesta categoria.');
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Falha ao iniciar a revisão.');
    } finally {
      setStarting(false);
    }
  }

  async function cancel() {
    if (!run) return;
    setPaused(true); // para o loop antes de cancelar
    try {
      await apiJson(`/api/ai/review/runs/${run.id}/cancel`, { method: 'POST' });
      setRun(fromProgress(await apiJson<RunProgress>(`/api/ai/review/runs/${run.id}`)));
      setPaused(false);
      void loadRevisions();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Falha ao cancelar.');
    }
  }

  async function applySelected() {
    setMessage('');
    try {
      const r = await apiJson<{ applied: number; failed: number }>('/api/ai/review/apply-bulk', {
        method: 'POST',
        body: JSON.stringify({ ids: [...selected] }),
      });
      setMessage(`${r.applied} aplicada(s)${r.failed ? `, ${r.failed} com falha` : ''}.`);
      await loadRevisions();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Falha ao aplicar.');
    }
  }

  const pct = run && run.total > 0 ? Math.round((run.processed / run.total) * 100) : 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canStart = Boolean(categoryId) && Number(limit) >= 1 && !starting && !running;
  const pendingIds = items.filter((i) => i.status === 'pending').map((i) => i.id);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
      <section className="space-y-4 rounded-[var(--ui-radius-card,1rem)] border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Nova revisão por IA</h2>
        <div className="grid gap-4 md:grid-cols-[2fr_1fr_auto] md:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="rev-cat">Categoria</Label>
            <select
              id="rev-cat"
              className={SELECT_CLASS}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Selecione…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {categories.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhuma categoria habilitada. Ative a revisão por IA na edição da categoria.
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rev-limit">Quantidade</Label>
            <Input
              id="rev-limit"
              type="number"
              min={1}
              max={500}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </div>
          <Button disabled={!canStart} onClick={start}>
            {starting ? 'Iniciando…' : 'Revisar'}
          </Button>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={includeReviewed}
            onChange={(e) => setIncludeReviewed(e.target.checked)}
          />
          Incluir já revisados
        </label>

        {run ? (
          <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-foreground">
                {running ? (paused ? 'Pausado' : 'Revisando…') : `Execução ${RUN_STATUS_LABEL[run.status] ?? run.status}`}{' '}
                {run.processed}/{run.total}
                {run.failed ? ` · ${run.failed} falha(s)` : ''}
              </span>
              <span className="text-xs text-muted-foreground">
                {run.tokensIn + run.tokensOut} tokens
              </span>
              {running ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPaused((p) => !p)}>
                    {paused ? 'Continuar' : 'Pausar'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={cancel}>
                    Cancelar
                  </Button>
                </div>
              ) : null}
            </div>
            <Progress value={pct} />
            {running ? (
              <p className="text-xs text-muted-foreground">
                O processamento acontece enquanto esta aba estiver aberta. Se fechar, reabra a tela
                para retomar de onde parou.
              </p>
            ) : null}
            {run.error ? <p className="text-xs text-destructive">{run.error}</p> : null}
          </div>
        ) : null}
        {message ? (
          <p role="status" className="text-sm text-muted-foreground">
            {message}
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={status === s ? 'default' : 'ghost'}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
              >
                {STATUS_LABEL[s]}
              </Button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">{total} no total</span>
          {status === 'pending' && pendingIds.length > 0 ? (
            <div className="ml-auto flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSelected(selected.size === pendingIds.length ? new Set() : new Set(pendingIds))
                }
              >
                {selected.size === pendingIds.length ? 'Limpar seleção' : 'Selecionar todas'}
              </Button>
              <Button size="sm" disabled={selected.size === 0} onClick={applySelected}>
                Aplicar selecionadas ({selected.size})
              </Button>
            </div>
          ) : null}
        </div>

        {loading ? <p className="text-sm text-muted-foreground">Carregando…</p> : null}
        {!loading && items.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma revisão {STATUS_LABEL[status].toLowerCase()}.
          </p>
        ) : null}

        {items.map((rev) => (
          <RevisionCard
            key={rev.id}
            rev={rev}
            selected={selected.has(rev.id)}
            onSelect={(checked) =>
              setSelected((prev) => {
                const next = new Set(prev);
                if (checked) next.add(rev.id);
                else next.delete(rev.id);
                return next;
              })
            }
            onDone={() => void loadRevisions()}
          />
        ))}

        {pages > 1 ? (
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              Próxima
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
