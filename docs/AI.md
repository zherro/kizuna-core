# AI

> **Princípio inalterado:** sem SDK de fornecedor (só `fetch` cru contra a REST do provedor) e
> **sempre um caminho manual/template**. Se a IA faltar — desligada, sem chave, sobre quota, erro —
> a feature continua 100% utilizável sem ela. A IA é enriquecimento, nunca dependência.

O core hoje **tem** um mecanismo de IA (plugin `ai_assistant`): orquestração genérica + abstração
de provider + degradação graciosa, servindo N contextos (busca, wizard, depois atendimento). As
*skills* concretas (prompt, schema, validação, carga de taxonomia) moram no **app consumidor**.

## Peças — `@kizuna/core/server/ai/*` (server-only)

| Peça | O quê |
| --- | --- |
| `AiProvider` (`provider/types.ts`) | Interface: `generateStructured(req) → Record<string,unknown>`. `req` = `{ systemPrompt, contents, schema, timeoutMs, temperature? }`. Falha recuperável ⇒ lança `AiUnavailableError`. |
| `GeminiProvider` (`provider/gemini.ts`) | Único adapter real. `fetch` → checa `res.ok` → `classifyAiError` → parseia `candidates[0].content.parts`. |
| `NotImplementedProvider` (`provider/not-implemented.ts`) | `openai` / `claude` — `generateStructured` lança `AiUnavailableError(..., { reason: 'blocked' })`. Ligar um provider sem adapter degrada limpo. |
| `resolveProvider()` (`provider/resolve.ts`) | Lê `system_config` `ai_assistant.provider` / `ai_assistant.model` + env `GEMINI_API_KEY` / `GEMINI_MODEL`. Sem chave ⇒ `AiUnavailableError('… não configurada', { reason: 'blocked' })`. |
| `AiSkill` + `registerSkill` / `getSkill` / `listSkillContexts` (`skill.ts`) | Uma skill empacota `{ key, context, loadContext?, buildPrompt, schema, validate, rateLimit? }`. O **app** registra as suas num módulo importado pelo bootstrap server. `context` agrupa skills para o liga/desliga. |
| `runSkill(skillKey, input, ctx)` (`run-skill.ts`) | Orquestrador: resolve a skill → checa o toggle `ai_assistant.contexts[skill.context]` (`=== false` desliga; ausente = ligado) → `checkRateLimit` opcional → `resolveProvider` → `loadContext` → `buildPrompt` → `provider.generateStructured` → `skill.validate`. Qualquer falha vira `AiUnavailableError`. |
| `checkRateLimit(key, max, windowMs)` (`rate-limit.ts`) | In-memory, por processo. Persistência ⇒ `TODO-AI.md`. |
| `readSystemConfig<T>(key)` (`system-config.ts`) | Lê um valor de `auth.system_config` via PostgREST. |
| `AiUnavailableError`, `classifyAiError`, `isRecoverableAiError` (`errors.ts` + `@kizuna/core/shared/ai-error`) | `classifyAiError` é isomórfico (string matching puro) — server e client. `'blocked'` (sem retry) vs `'transient'` (vale tentar). |

### Rota do app (padrão)

```ts
try {
  const { output } = await runSkill('search', body, { userId, tenantId });
  return Response.json(output);
} catch (err) {
  if (err instanceof AiUnavailableError) {
    return Response.json({ fallback: 'text', reason: err.reason }, { status: 503 });
  }
  throw err;
}
```

## Client — `@kizuna/core/client/hooks/use-ai-degradation`

`useAiDegradation(contextKey) → { status: 'ready'|'degraded'|'unavailable', report(err), retry(), reset() }`.
Máquina sticky por sessão (não persiste): `report` com `'blocked'` ⇒ `unavailable` na hora; 5
`'transient'` seguidos ⇒ `unavailable`; antes disso ⇒ `degraded`. `retry()` só tira de
`degraded`. A UI usa isso para cair em modo manual sem quebrar.

## Client — `@kizuna/core/client/components/ai-assistant`

`<AiAssistantConfigPage contexts={string[]} value onSave statusConfigured loading />` — tela de
config (provedor `select` com `gemini` ativo e `openai`/`claude` desabilitados; `model` texto; um
toggle por contexto). **O core não lê nem grava `system_config`** — recebe `value` e devolve a
edição por `onSave` (o app faz 3 `submitResource` contra `system_config`). `statusConfigured ===
false` (de `GET /api/ai/status`) mostra um aviso de chave ausente.

## Config (`auth.system_config`, plugin `system_config`)

| Chave | Default | Nota |
| --- | --- | --- |
| `ai_assistant.provider` | `"gemini"` | `gemini` \| `openai` \| `claude` |
| `ai_assistant.model` | `"gemini-2.0-flash"` | env `GEMINI_MODEL` sobrepõe |
| `ai_assistant.contexts` | `{ "search": true, "service-wizard": true }` | mapa contexto→bool |

## Env

| Var | Default | Nota |
| --- | --- | --- |
| `GEMINI_API_KEY` | — | obrigatória para chamadas reais; ausência ⇒ degrada para manual |
| `GEMINI_MODEL` | `gemini-2.0-flash` | sobrepõe `ai_assistant.model` |
| `AI_TIMEOUT_MS` | `18000` | timeout de uma chamada |

A chave de API **nunca** entra em `system_config` — só env. `GET /api/ai/status` devolve
`{ configured, provider }`, nunca a chave.
