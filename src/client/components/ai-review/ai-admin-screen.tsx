'use client';

import * as React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  apiJson,
  htmlToText,
  listResource,
  readConfigKey,
  saveConfigKey,
  SELECT_CLASS,
  type CategoryOption,
  type RunInfo,
} from './api';

const PROVIDERS = [
  { value: 'gemini', label: 'Gemini (Google)' },
  { value: 'claude', label: 'Claude (Anthropic)' },
];

const CARD = 'space-y-4 rounded-[var(--ui-radius-card,1rem)] border border-border bg-card p-5';

interface Status {
  configured: Record<string, boolean>;
  secretKeyConfigured: boolean;
  provider: string;
  model: string;
  contexts: Record<string, boolean>;
  availableContexts: string[];
}

interface Credential {
  id: number;
  provider: string;
  label: string | null;
  keyLast4: string | null;
  active: boolean;
}

function Feedback({ text, error }: Readonly<{ text: string; error?: boolean }>) {
  if (!text) return null;
  return (
    <p role={error ? 'alert' : 'status'} className={error ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>
      {text}
    </p>
  );
}

function ProvidersTab() {
  const [status, setStatus] = React.useState<Status | null>(null);
  const [creds, setCreds] = React.useState<Credential[]>([]);
  const [provider, setProvider] = React.useState('gemini');
  const [model, setModel] = React.useState('');
  const [contexts, setContexts] = React.useState<Record<string, boolean>>({});
  const [newProvider, setNewProvider] = React.useState('gemini');
  const [label, setLabel] = React.useState('');
  const [keyValue, setKeyValue] = React.useState('');
  const [msg, setMsg] = React.useState('');
  const [isError, setIsError] = React.useState(false);

  const say = (text: string, error = false) => {
    setMsg(text);
    setIsError(error);
  };

  const load = React.useCallback(async () => {
    try {
      const s = await apiJson<Status>('/api/ai/status');
      const [p, m, c] = await Promise.all([
        readConfigKey<string>('ai_assistant.provider'),
        readConfigKey<string>('ai_assistant.model'),
        readConfigKey<Record<string, boolean>>('ai_assistant.contexts'),
      ]);
      setStatus(s);
      setProvider(typeof p === 'string' ? p : s.provider);
      setModel(typeof m === 'string' ? m : s.model);
      setContexts(c ?? s.contexts ?? {});
      setCreds((await apiJson<{ items: Credential[] }>('/api/ai/credentials')).items);
    } catch (e) {
      say(e instanceof Error ? e.message : 'Falha ao carregar.', true);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function saveConfig() {
    try {
      await saveConfigKey('ai_assistant.provider', provider);
      await saveConfigKey('ai_assistant.model', model.trim());
      await saveConfigKey('ai_assistant.contexts', contexts);
      say('Configuração salva.');
    } catch (e) {
      say(e instanceof Error ? e.message : 'Falha ao salvar.', true);
    }
  }

  async function saveKey() {
    try {
      await apiJson('/api/ai/credentials', {
        method: 'POST',
        body: JSON.stringify({ provider: newProvider, label: label.trim(), key: keyValue }),
      });
      setKeyValue('');
      setLabel('');
      say('Chave salva (cifrada).');
      await load();
    } catch (e) {
      say(e instanceof Error ? e.message : 'Falha ao salvar a chave.', true);
    }
  }

  async function deactivate(id: number) {
    try {
      await apiJson(`/api/ai/credentials?id=${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      say(e instanceof Error ? e.message : 'Falha ao desativar.', true);
    }
  }

  return (
    <div className="space-y-6">
      <section className={CARD}>
        <h2 className="text-base font-semibold text-foreground">Provedor e modelo padrão</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ia-provider">Provedor</Label>
            <select
              id="ia-provider"
              className={SELECT_CLASS}
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ia-model">Modelo</Label>
            <Input
              id="ia-model"
              value={model}
              placeholder="gemini-3.6-flash / claude-haiku-4-5-20251001"
              onChange={(e) => setModel(e.target.value)}
            />
          </div>
        </div>
        {status && status.availableContexts.length > 0 ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">Contextos ativos</legend>
            {status.availableContexts.map((ctx) => (
              <label key={ctx} className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={contexts[ctx] !== false}
                  onChange={(e) => setContexts((prev) => ({ ...prev, [ctx]: e.target.checked }))}
                />
                {ctx}
              </label>
            ))}
          </fieldset>
        ) : null}
        <Button onClick={saveConfig}>Salvar</Button>
      </section>

      <section className={CARD}>
        <h2 className="text-base font-semibold text-foreground">Chaves de API</h2>
        {status && !status.secretKeyConfigured ? (
          <p role="alert" className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
            AI_SECRET_KEY não está definida no servidor: não é possível gravar chaves cifradas.
          </p>
        ) : null}
        <ul className="divide-y divide-border">
          {PROVIDERS.map((p) => (
            <li key={p.value} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="text-foreground">{p.label}</span>
              <Badge variant={status?.configured[p.value] ? 'default' : 'outline'}>
                {status?.configured[p.value] ? 'Configurado' : 'Sem chave'}
              </Badge>
            </li>
          ))}
        </ul>

        {creds.length > 0 ? (
          <ul className="divide-y divide-border rounded-md border border-border">
            {creds.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                <span className="font-medium text-foreground">{c.provider}</span>
                <span className="text-muted-foreground">{c.label}</span>
                <span className="font-mono text-xs text-muted-foreground">…{c.keyLast4}</span>
                <Badge variant={c.active ? 'default' : 'outline'}>{c.active ? 'Ativa' : 'Inativa'}</Badge>
                {c.active ? (
                  <Button variant="outline" size="sm" className="ml-auto" onClick={() => deactivate(c.id)}>
                    Desativar
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto] md:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="ia-new-provider">Provedor</Label>
            <select
              id="ia-new-provider"
              className={SELECT_CLASS}
              value={newProvider}
              onChange={(e) => setNewProvider(e.target.value)}
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ia-label">Rótulo</Label>
            <Input id="ia-label" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ia-key">Nova chave</Label>
            <Input
              id="ia-key"
              type="password"
              autoComplete="off"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
            />
          </div>
          <Button disabled={keyValue.trim().length < 8} onClick={saveKey}>
            Salvar chave
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          A chave é cifrada no servidor e nunca é exibida de novo; só os 4 últimos caracteres.
          Salvar uma nova chave desativa a anterior do mesmo provedor.
        </p>
        <Feedback text={msg} error={isError} />
      </section>
    </div>
  );
}

interface Prompt {
  id: number;
  key: string;
  name: string;
  description: string;
  systemPrompt: string;
  userTemplate: string;
  provider: string | null;
  model: string | null;
  temperature: number | null;
  version: number;
  categoryId: number | null;
  active: boolean;
}

interface TestResult {
  original: string;
  revised: string;
  provider: string;
  model: string | null;
  tokensIn: number;
  tokensOut: number;
}

function PromptEditor({
  prompt,
  categories,
  onSaved,
}: Readonly<{ prompt: Prompt; categories: CategoryOption[]; onSaved: () => void }>) {
  const [form, setForm] = React.useState(prompt);
  const [serviceId, setServiceId] = React.useState('');
  const [result, setResult] = React.useState<TestResult | null>(null);
  const [msg, setMsg] = React.useState('');
  const [isError, setIsError] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const set = <K extends keyof Prompt>(k: K, v: Prompt[K]) => setForm((f) => ({ ...f, [k]: v }));
  const say = (t: string, e = false) => {
    setMsg(t);
    setIsError(e);
  };

  async function save() {
    setBusy(true);
    try {
      await apiJson(`/api/resources/ai_prompts/${prompt.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          systemPrompt: form.systemPrompt,
          userTemplate: form.userTemplate,
          provider: form.provider ?? '',
          model: form.model ?? '',
          temperature: form.temperature,
          categoryId: form.categoryId,
          active: form.active,
        }),
      });
      say('Prompt salvo.');
      onSaved();
    } catch (e) {
      say(e instanceof Error ? e.message : 'Falha ao salvar.', true);
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setResult(null);
    say('');
    try {
      const r = await apiJson<TestResult>('/api/ai/prompts/test', {
        method: 'POST',
        body: JSON.stringify({
          promptKey: form.key,
          serviceId: Number(serviceId),
          overrides: {
            systemPrompt: form.systemPrompt,
            userTemplate: form.userTemplate,
            provider: form.provider,
            model: form.model,
            temperature: form.temperature,
          },
        }),
      });
      setResult(r);
    } catch (e) {
      say(e instanceof Error ? e.message : 'Falha no teste.', true);
    } finally {
      setBusy(false);
    }
  }

  const area =
    'min-h-40 w-full rounded-[var(--ui-radius-field,0.375rem)] border border-input bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <section className={CARD}>
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-semibold text-foreground">
          {form.name} <span className="font-mono text-xs text-muted-foreground">({form.key})</span>
        </h3>
        <Badge variant="outline">versão {prompt.version}</Badge>
        {prompt.categoryId ? <Badge variant="secondary">categoria #{prompt.categoryId}</Badge> : <Badge>global</Badge>}
      </div>
      <div className="space-y-1.5">
        <Label>System prompt</Label>
        <textarea className={area} value={form.systemPrompt} onChange={(e) => set('systemPrompt', e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Template do usuário</Label>
        <textarea className={area} value={form.userTemplate} onChange={(e) => set('userTemplate', e.target.value)} />
        <p className="text-xs text-muted-foreground">
          Variáveis: category, group, subcategories, fields, title, original (entre chaves duplas).
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Provedor</Label>
          <select className={SELECT_CLASS} value={form.provider ?? ''} onChange={(e) => set('provider', e.target.value || null)}>
            <option value="">Padrão do sistema</option>
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Modelo</Label>
          <Input value={form.model ?? ''} onChange={(e) => set('model', e.target.value || null)} />
        </div>
        <div className="space-y-1.5">
          <Label>Temperatura</Label>
          <Input
            type="number"
            step="0.1"
            min={0}
            max={2}
            value={form.temperature ?? ''}
            onChange={(e) => set('temperature', e.target.value === '' ? null : Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Categoria (override)</Label>
          <select
            className={SELECT_CLASS}
            value={form.categoryId ?? ''}
            onChange={(e) => set('categoryId', e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Global</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
        Ativo
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <Button disabled={busy} onClick={save}>
          Salvar
        </Button>
        <div className="ml-auto flex items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor={`test-${prompt.id}`}>ID do anúncio para teste</Label>
            <Input id={`test-${prompt.id}`} type="number" value={serviceId} onChange={(e) => setServiceId(e.target.value)} />
          </div>
          <Button variant="outline" disabled={busy || !serviceId} onClick={test}>
            Testar
          </Button>
        </div>
      </div>
      <Feedback text={msg} error={isError} />
      {result ? (
        <div className="space-y-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground">
              {htmlToText(result.original)}
            </div>
            <div className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground">
              {htmlToText(result.revised)}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {result.provider} · {result.model ?? 'modelo padrão'} · {result.tokensIn} tokens de entrada /{' '}
            {result.tokensOut} de saída (nada foi gravado)
          </p>
        </div>
      ) : null}
    </section>
  );
}

function PromptsTab() {
  const [prompts, setPrompts] = React.useState<Prompt[]>([]);
  const [categories, setCategories] = React.useState<CategoryOption[]>([]);
  const [error, setError] = React.useState('');

  const load = React.useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        listResource<Prompt>('ai_prompts', { pageSize: 200 }),
        listResource<CategoryOption>('categories', { pageSize: 100, 'filter.ai_review': 'true' }),
      ]);
      setPrompts(p.items);
      setCategories(c.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar prompts.');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <Feedback text={error} error />
      {prompts.map((p) => (
        <PromptEditor key={`${p.id}-${p.version}`} prompt={p} categories={categories} onSaved={load} />
      ))}
      {prompts.length === 0 && !error ? (
        <p className="text-sm text-muted-foreground">Nenhum prompt cadastrado.</p>
      ) : null}
    </div>
  );
}

function RunsTab() {
  const [runs, setRuns] = React.useState<RunInfo[]>([]);
  const [error, setError] = React.useState('');

  const load = React.useCallback(async () => {
    try {
      setRuns((await listResource<RunInfo>('ai_review_runs', { pageSize: 30 })).items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar execuções.');
    }
  }, []);

  const hasRunning = runs.some((r) => r.status === 'running');
  React.useEffect(() => {
    void load();
  }, [load]);
  React.useEffect(() => {
    if (!hasRunning) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [hasRunning, load]);

  async function cancel(id: number | string) {
    try {
      await apiJson(`/api/ai/review/runs/${id}/cancel`, { method: 'POST' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao cancelar.');
    }
  }

  return (
    <section className={CARD}>
      <Feedback text={error} error />
      {runs.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma execução.</p> : null}
      <ul className="divide-y divide-border">
        {runs.map((r) => (
          <li key={r.id} className="space-y-2 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-medium text-foreground">#{r.id}</span>
              <Badge variant={r.status === 'failed' ? 'destructive' : r.status === 'running' ? 'secondary' : 'outline'}>
                {r.status}
              </Badge>
              <span className="text-muted-foreground">categoria {r.categoryId ?? '-'}</span>
              <span className="text-muted-foreground">
                {r.processed}/{r.total}
                {r.failed ? ` · ${r.failed} falha(s)` : ''}
              </span>
              <span className="text-xs text-muted-foreground">
                {r.tokensIn} entrada / {r.tokensOut} saída
              </span>
              {r.status === 'running' ? (
                <Button variant="outline" size="sm" className="ml-auto" onClick={() => cancel(r.id)}>
                  Cancelar
                </Button>
              ) : null}
            </div>
            {r.total > 0 ? <Progress value={Math.round((r.processed / r.total) * 100)} /> : null}
            {r.error ? <p className="text-xs text-destructive">{r.error}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Administração root da IA: provedores/chaves, prompts (com teste) e execuções da revisão de textos. */
export function AiAdminScreen() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">Inteligência artificial</h1>
        <p className="text-sm text-muted-foreground">
          Provedores e chaves, prompts de revisão de texto e execuções em lote.
        </p>
      </header>
      <Tabs defaultValue="providers">
        <TabsList>
          <TabsTrigger value="providers">Provedores e chaves</TabsTrigger>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
          <TabsTrigger value="runs">Execuções</TabsTrigger>
        </TabsList>
        <TabsContent value="providers" className="mt-4">
          <ProvidersTab />
        </TabsContent>
        <TabsContent value="prompts" className="mt-4">
          <PromptsTab />
        </TabsContent>
        <TabsContent value="runs" className="mt-4">
          <RunsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
