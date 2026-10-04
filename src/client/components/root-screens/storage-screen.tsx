'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ImageIcon, Loader2, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { PageHeader } from '../ui-better-soft/headers/page-header';
import { EmptyStateCard } from '../ui-better-soft/lists/empty-state-card';
import { cn } from '../../../lib/utils';

type StorageImage = {
  id: string;
  originalName: string;
  purpose: string;
  mimeType: string | null;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  thumbSizeBytes: number | null;
  thumbWidth: number | null;
  thumbHeight: number | null;
  optimizedAt: string | null;
  createdAt: string | null;
};

type ReoptimizeResult = {
  id: string;
  status: 'optimized' | 'skipped' | 'failed';
  beforeBytes: number;
  afterBytes: number;
  message?: string;
};

type Status = 'pending' | 'optimized' | 'all';

type RunState = {
  running: boolean;
  done: number;
  total: number;
  savedBytes: number;
  failures: ReoptimizeResult[];
};

const API = '/api/storage/admin';
const PAGE_SIZE = 30;
/** Igual a `REOPTIMIZE_BATCH_MAX` do servidor (`server/storage-admin.ts`). */
const BATCH = 10;

const STATUS_TABS: Array<{ value: Status; label: string }> = [
  { value: 'pending', label: 'Não otimizadas' },
  { value: 'optimized', label: 'Otimizadas' },
  { value: 'all', label: 'Todas' },
];

const PURPOSES: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todos os usos' },
  { value: 'service_image', label: 'Fotos de anúncio' },
  { value: 'ad_image', label: 'Fotos de anúncio (antigo)' },
  { value: 'avatar', label: 'Avatares' },
  { value: 'banner', label: 'Banners' },
  { value: 'ticket_attachment', label: 'Anexos de chamado' },
  { value: 'demanda_attachment', label: 'Anexos de demanda' },
  { value: 'other', label: 'Outros' },
];

const EMPTY_RUN: RunState = { running: false, done: 0, total: 0, savedBytes: 0, failures: [] };

function formatBytes(bytes: number | null | undefined) {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDims(width: number | null, height: number | null) {
  return width && height ? `${width}×${height}` : '—';
}

async function postBatch(ids: string[]): Promise<ReoptimizeResult[]> {
  const response = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  const data = (await response.json().catch(() => null)) as {
    results?: ReoptimizeResult[];
    message?: string;
  } | null;
  if (!response.ok) throw new Error(data?.message ?? 'Falha ao otimizar.');
  return data?.results ?? [];
}

/**
 * Root screen (`/painel/root/storage`): imagens de `public.files` com filtro de status (não
 * otimizadas = `optimized_at` nulo) e uso (`purpose`); marca imagens e reotimiza as marcadas, ou
 * todas as pendentes em lotes, mostrando o progresso e o espaço economizado. Reotimizar regrava no
 * mesmo registro (mesmo `id`) e gera a miniatura — ver `server/storage-admin.ts`. Genérico (só
 * tabela do plugin storage), registrado como slug `storage` em `root-screens/registry.ts`; o gate
 * `is_root` fica no resolver (página) e no handler da API.
 */
export function StorageScreen() {
  const [status, setStatus] = useState<Status>('pending');
  const [purpose, setPurpose] = useState('');
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<StorageImage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [run, setRun] = useState<RunState>(EMPTY_RUN);
  const [lastRun, setLastRun] = useState<RunState | null>(null);
  const cancelRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        status,
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (purpose) params.set('purpose', purpose);
      const response = await fetch(`${API}?${params.toString()}`, { cache: 'no-store' });
      const data = (await response.json().catch(() => null)) as {
        items?: StorageImage[];
        total?: number;
        message?: string;
      } | null;
      if (!response.ok) throw new Error(data?.message ?? 'Não foi possível carregar as imagens.');
      setItems(data?.items ?? []);
      setTotal(data?.total ?? 0);
    } catch (err) {
      setItems([]);
      setTotal(0);
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as imagens.');
    } finally {
      setLoading(false);
    }
  }, [status, purpose, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function changeFilter(next: { status?: Status; purpose?: string }) {
    if (next.status !== undefined) setStatus(next.status);
    if (next.purpose !== undefined) setPurpose(next.purpose);
    setPage(0);
    setSelected(new Set());
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allOnPageSelected = items.length > 0 && items.every((item) => selected.has(item.id));

  function togglePage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) items.forEach((item) => next.delete(item.id));
      else items.forEach((item) => next.add(item.id));
      return next;
    });
  }

  /** Roda os lotes; `nextBatch` devolve os próximos ids (vazio = acabou). */
  async function runBatches(totalExpected: number, nextBatch: (state: RunState) => Promise<string[]>) {
    cancelRef.current = false;
    let state: RunState = { ...EMPTY_RUN, running: true, total: totalExpected };
    setRun(state);
    setError('');
    try {
      while (!cancelRef.current) {
        const ids = await nextBatch(state);
        if (ids.length === 0) break;
        const results = await postBatch(ids);
        const saved = results.reduce(
          (sum, r) => sum + (r.status === 'optimized' ? Math.max(0, r.beforeBytes - r.afterBytes) : 0),
          0
        );
        state = {
          ...state,
          done: state.done + results.length,
          savedBytes: state.savedBytes + saved,
          failures: [...state.failures, ...results.filter((r) => r.status !== 'optimized')],
        };
        setRun(state);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao otimizar.');
    } finally {
      const finished = { ...state, running: false };
      setRun(EMPTY_RUN);
      setLastRun(finished);
      setSelected(new Set());
      await load();
    }
  }

  function optimizeSelected() {
    const queue = [...selected];
    void runBatches(queue.length, async () => queue.splice(0, BATCH));
  }

  function optimizeAllPending() {
    // Pendentes que falharem continuam pendentes: pula-as com o offset pra não repetir.
    void runBatches(status === 'pending' ? total : 0, async (state) => {
      const params = new URLSearchParams({
        status: 'pending',
        limit: String(BATCH),
        offset: String(state.failures.length),
      });
      if (purpose) params.set('purpose', purpose);
      const response = await fetch(`${API}?${params.toString()}`, { cache: 'no-store' });
      const data = (await response.json().catch(() => null)) as { items?: StorageImage[]; total?: number } | null;
      if (!response.ok) throw new Error('Não foi possível listar as pendentes.');
      if (state.total === 0 && data?.total) setRun((prev) => ({ ...prev, total: data.total ?? 0 }));
      return (data?.items ?? []).map((item) => item.id);
    });
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="Root"
        title="Storage e imagens"
        description="Imagens salvas no banco. Otimizar regrava no mesmo arquivo: versão grande em WebP (até 1600px nas fotos de anúncio) e miniatura de até 640px para cards e listas."
      />

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            size="sm"
            variant={status === tab.value ? 'default' : 'outline'}
            onClick={() => changeFilter({ status: tab.value })}
            disabled={run.running}
          >
            {tab.label}
          </Button>
        ))}
        <select
          value={purpose}
          onChange={(event) => changeFilter({ purpose: event.target.value })}
          disabled={run.running}
          className="h-8 rounded-[var(--ui-radius-pill,0.375rem)] border border-input bg-background px-3 text-sm"
          aria-label="Filtrar por uso"
        >
          {PURPOSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="ml-auto text-sm text-muted-foreground">
          {loading ? 'Carregando…' : `${total} ${total === 1 ? 'imagem' : 'imagens'}`}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-[var(--ui-radius-card,1rem)] border border-border bg-card p-3">
        <Button size="sm" variant="outline" onClick={togglePage} disabled={run.running || items.length === 0}>
          {allOnPageSelected ? 'Desmarcar página' : 'Marcar página'}
        </Button>
        {selected.size > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} disabled={run.running}>
            Limpar ({selected.size})
          </Button>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" onClick={optimizeSelected} disabled={run.running || selected.size === 0}>
            <Sparkles className="mr-1.5 h-4 w-4" /> Otimizar marcadas ({selected.size})
          </Button>
          <Button size="sm" variant="outline" onClick={optimizeAllPending} disabled={run.running}>
            Otimizar todas as não otimizadas
          </Button>
        </div>
      </div>

      {run.running && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>
            Otimizando {run.done}
            {run.total > 0 ? ` de ${run.total}` : ''}… economizados {formatBytes(run.savedBytes)}
          </span>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => (cancelRef.current = true)}>
            Parar depois deste lote
          </Button>
        </div>
      )}

      {!run.running && lastRun && lastRun.done > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p>
              {lastRun.done - lastRun.failures.length} de {lastRun.done} otimizadas · economizados{' '}
              {formatBytes(lastRun.savedBytes)}.
            </p>
            {lastRun.failures.length > 0 && (
              <ul className="mt-1 list-disc pl-4 text-amber-700 dark:text-amber-300">
                {lastRun.failures.slice(0, 10).map((failure) => (
                  <li key={failure.id}>
                    {failure.id.slice(0, 8)}: {failure.message ?? 'não otimizada'}
                  </li>
                ))}
                {lastRun.failures.length > 10 && <li>e mais {lastRun.failures.length - 10}…</li>}
              </ul>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {!loading && items.length === 0 && !error ? (
        <EmptyStateCard
          icon={ImageIcon}
          title={status === 'pending' ? 'Nenhuma imagem pendente' : 'Nenhuma imagem'}
          description={
            status === 'pending'
              ? 'Todas as imagens deste filtro já passaram pelo otimizador.'
              : 'Nenhuma imagem encontrada com este filtro.'
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((item) => {
            const isSelected = selected.has(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  disabled={run.running}
                  aria-pressed={isSelected}
                  className={cn(
                    'group flex w-full flex-col overflow-hidden rounded-[var(--ui-radius-card-compact,0.75rem)] border bg-card text-left transition',
                    isSelected ? 'border-primary ring-2 ring-primary' : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="relative aspect-square w-full bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/public/storage/files/${item.id}/content?size=thumb`}
                      alt={item.originalName}
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      tabIndex={-1}
                      className="absolute left-2 top-2 h-4 w-4 accent-[hsl(var(--primary))]"
                      aria-hidden="true"
                    />
                    <span
                      className={cn(
                        'absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        item.optimizedAt
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-500 text-white'
                      )}
                    >
                      {item.optimizedAt ? 'Otimizada' : 'Pendente'}
                    </span>
                  </div>
                  <div className="space-y-0.5 p-2 text-xs">
                    <div className="truncate font-semibold" title={item.originalName}>
                      {item.originalName || item.id}
                    </div>
                    <div className="text-muted-foreground">
                      {formatDims(item.width, item.height)} · {formatBytes(item.sizeBytes)}
                    </div>
                    <div className="text-muted-foreground">
                      {item.thumbWidth
                        ? `Miniatura ${formatDims(item.thumbWidth, item.thumbHeight)} · ${formatBytes(item.thumbSizeBytes)}`
                        : 'Sem miniatura'}
                    </div>
                    <div className="truncate text-muted-foreground">
                      {item.purpose} · {item.mimeType?.replace('image/', '') ?? '?'}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || loading || run.running}
          >
            Anterior
          </Button>
          <span className="text-muted-foreground">
            Página {page + 1} de {pageCount}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={page >= pageCount - 1 || loading || run.running}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
