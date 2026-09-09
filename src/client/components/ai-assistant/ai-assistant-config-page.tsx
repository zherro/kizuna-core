'use client';

import * as React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

/** Provedores conhecidos. Só `gemini` está implementado hoje; os demais aparecem desabilitados. */
const PROVIDER_OPTIONS: Array<{ value: string; label: string; enabled: boolean }> = [
  { value: 'gemini', label: 'Gemini (Google)', enabled: true },
  { value: 'openai', label: 'OpenAI — em breve', enabled: false },
  { value: 'claude', label: 'Claude (Anthropic) — em breve', enabled: false },
];

export interface AiAssistantConfigValue {
  provider?: string;
  model?: string;
  contexts?: Record<string, boolean>;
}

export interface AiAssistantConfigPageProps {
  /** Contextos de IA disponíveis (o app passa, ex. `['search', 'service-wizard']`). Um toggle por item. */
  contexts: string[];
  /** Valores atuais lidos de `system_config` pelo app. */
  value?: AiAssistantConfigValue;
  /** Persistência — o app implementa (3 chamadas `submitResource` contra `system_config`). */
  onSave?: (next: {
    provider: string;
    model: string;
    contexts: Record<string, boolean>;
  }) => Promise<void> | void;
  /** De `GET /api/ai/status`. Quando `false`, mostra um aviso de chave ausente. */
  statusConfigured?: boolean;
  /** Desabilita o formulário enquanto o app carrega os valores. */
  loading?: boolean;
}

/**
 * Tela de configuração do plugin `ai_assistant` (provedor + modelo + contextos ligados).
 *
 * O core NÃO lê nem grava `system_config` — recebe os valores atuais por `value` e devolve a
 * edição por `onSave` (decisão do spec §2.3: mantém o core sem depender de um resource específico).
 * O componente só renderiza o formulário, rastreia a edição local e chama `onSave` no submit.
 */
export function AiAssistantConfigPage({
  contexts,
  value,
  onSave,
  statusConfigured,
  loading = false,
}: Readonly<AiAssistantConfigPageProps>) {
  const [provider, setProvider] = React.useState(value?.provider ?? 'gemini');
  const [model, setModel] = React.useState(value?.model ?? '');
  const [contextState, setContextState] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(contexts.map((c) => [c, value?.contexts?.[c] !== false]))
  );
  const [saving, setSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState<'idle' | 'saved' | 'error'>('idle');

  // Ressincroniza quando o app termina de carregar os valores.
  React.useEffect(() => {
    if (value?.provider !== undefined) setProvider(value.provider);
    if (value?.model !== undefined) setModel(value.model);
  }, [value?.provider, value?.model]);

  React.useEffect(() => {
    setContextState((prev) =>
      Object.fromEntries(
        contexts.map((c) => [c, value?.contexts?.[c] ?? prev[c] ?? true])
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contexts.join('|'), value?.contexts]);

  const disabled = loading || saving;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!onSave) return;
    setSaving(true);
    setFeedback('idle');
    try {
      await onSave({ provider, model: model.trim(), contexts: contextState });
      setFeedback('saved');
    } catch {
      setFeedback('error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
      {statusConfigured === false ? (
        <div
          role="alert"
          className="rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-700"
        >
          A chave de API do provedor não está configurada no servidor. A IA vai operar em modo
          manual até a variável de ambiente ser definida.
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="ai-provider">Provedor</Label>
        <select
          id="ai-provider"
          value={provider}
          disabled={disabled}
          onChange={(e) => setProvider(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {PROVIDER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={!opt.enabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          OpenAI e Claude ainda não têm adapter implementado (em breve).
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ai-model">Modelo</Label>
        <Input
          id="ai-model"
          value={model}
          disabled={disabled}
          placeholder="gemini-2.0-flash"
          onChange={(e) => setModel(e.target.value)}
        />
      </div>

      <fieldset className="space-y-2" disabled={disabled}>
        <legend className="text-sm font-medium text-foreground">Contextos ativos</legend>
        {contexts.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum contexto de IA registrado.</p>
        ) : (
          contexts.map((ctx) => (
            <label key={ctx} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={contextState[ctx] ?? true}
                onChange={(e) =>
                  setContextState((prev) => ({ ...prev, [ctx]: e.target.checked }))
                }
              />
              <span>{ctx}</span>
            </label>
          ))
        )}
      </fieldset>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={disabled || !onSave}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
        {feedback === 'saved' ? (
          <span className="text-xs font-medium text-emerald-600">Salvo com sucesso.</span>
        ) : null}
        {feedback === 'error' ? (
          <span className="text-xs font-medium text-destructive">Não foi possível salvar.</span>
        ) : null}
      </div>
    </form>
  );
}
