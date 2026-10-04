# AI

> **Princípio inalterado:** sem SDK de fornecedor (só `fetch` cru contra a REST do provedor) e
> **sempre um caminho manual/template**. Se a IA faltar — desligada, sem chave, sobre quota, erro —
> a feature continua 100% utilizável sem ela. A IA é enriquecimento, nunca dependência.

O core hoje **tem** um mecanismo de IA (plugin `ai_assistant`): orquestração genérica + abstração
de provider + degradação graciosa, servindo N contextos (busca, wizard, depois atendimento). As
_skills_ concretas (prompt, schema, validação, carga de taxonomia) moram no **app consumidor**.

## Peças — `@kizuna/core/server/ai/*` (server-only)

| Peça                                                                                                                                 | O quê                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AiProvider` (`provider/types.ts`)                                                                                                   | Interface: `generateStructured(req) → Record<string,unknown>`. `req` = `{ systemPrompt, contents, schema, timeoutMs, temperature? }`. Opcional `generateStructuredWithUsage(req)` devolve também `{ usage: { tokensIn, tokensOut }, model }` (Gemini e Claude implementam). Falha recuperável ⇒ lança `AiUnavailableError`.                                                                                                                                                                          |
| `GeminiProvider` (`provider/gemini.ts`)                                                                                              | Único adapter real. `fetch` → checa `res.ok` → `classifyAiError` → parseia `candidates[0].content.parts`.                                                                                                                                                                                                                                                      |
| `ClaudeProvider` (`provider/claude.ts`) | `fetch` cru em `https://api.anthropic.com/v1/messages` (`x-api-key`, `anthropic-version: 2023-06-01`). Saída estruturada por **tool-use forçado** (uma tool `respond` cujo `input_schema` é o schema da skill). Modelo padrão `claude-haiku-4-5-20251001`. 401/403 ⇒ `blocked`; 429/5xx/529 ⇒ `transient`. |
| `NotImplementedProvider` (`provider/not-implemented.ts`) | Só `openai` — `generateStructured` lança `AiUnavailableError(..., { reason: 'blocked' })`. |
| `resolveProvider(override?)` (`provider/resolve.ts`) | Lê `system_config` `ai_assistant.provider` / `ai_assistant.model`; aceita `{ provider, model }` para sobrepor (ex.: prompt com provider próprio). A chave vem de `getProviderKey` (banco cifrado → env). Sem chave ⇒ `AiUnavailableError('… não configurada', { reason: 'blocked' })`. |
| `getProviderKey` / `saveProviderKey` / `encryptSecret` / `decryptSecret` (`credentials.ts`) | Chave do provedor em `public.ai_credentials` cifrada com AES-256-GCM (segredo `AI_SECRET_KEY`: 32 bytes em base64, ou qualquer frase derivada por scrypt). Leitura via RPC `fn_ai_credential_get_cipher` e gravação via `fn_ai_credential_save`, sempre com o JWT do usuário root (`AiUserDb`); fallback para `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`. Sem `AI_SECRET_KEY` ⇒ `AiUnavailableError` blocked. |
| `AiSkill` + `registerSkill` / `getSkill` / `listSkillContexts` (`skill.ts`)                                                          | Uma skill empacota `{ key, context, loadContext?, buildPrompt, schema, validate, rateLimit? }`. O **app** registra as suas num módulo importado pelo bootstrap server. `context` agrupa skills para o liga/desliga.                                                                                                                                            |
| `runSkill(skillKey, input, ctx, opts?)` (`run-skill.ts`)                                                                                    | Orquestrador: resolve a skill → checa o toggle `ai_assistant.contexts[skill.context]` (`=== false` desliga; ausente = ligado) → `checkRateLimit` opcional → `resolveProvider` → `loadContext` → `buildPrompt` → `provider.generateStructured` → `skill.validate`. Devolve `{ output, provider, model, usage }`; `opts` = `{ provider?, model?, temperature? }`. Falha da IA vira `AiUnavailableError`; rate-limit local estourado vira `AiRateLimitedError`. |
| `checkRateLimit(key, max, windowMs)` (`rate-limit.ts`)                                                                               | In-memory, por processo. Persistência ⇒ [`../manutencao/todo-ai.md`](../manutencao/todo-ai.md).                                                                                                                                                                                                                                                                                                          |
| `readSystemConfig<T>(key)` (`system-config.ts`)                                                                                      | Lê um valor de `auth.system_config` via PostgREST.                                                                                                                                                                                                                                                                                                             |
| `AiUnavailableError`, `AiRateLimitedError`, `classifyAiError`, `isRecoverableAiError` (`errors.ts` + `@kizuna/core/shared/ai-error`) | `classifyAiError` é isomórfico (string matching puro) — server e client. `'blocked'` (sem retry) vs `'transient'` (vale tentar). `AiRateLimitedError extends AiUnavailableError` (`retryAfterSec?`): a rota checa antes → **429** em vez de 503, e o cliente não queima strike de degradação.                                                                  |

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
config (provedor `select` com `gemini` e `claude` ativos e `openai` desabilitado; `model` texto; um
toggle por contexto). **O core não lê nem grava `system_config`** — recebe `value` e devolve a
edição por `onSave` (o app faz 3 `submitResource` contra `system_config`). `statusConfigured ===
false` (de `GET /api/ai/status`) mostra um aviso de chave ausente.

## Config (`auth.system_config`, plugin `system_config`)

| Chave                   | Default                                 | Nota                                                          |
| ----------------------- | --------------------------------------- | ------------------------------------------------------------- |
| `ai_assistant.provider` | `"gemini"`                              | `gemini` \| `openai` \| `claude`                              |
| `ai_assistant.model`    | `"gemini-3.6-flash"`                    | tem **precedência** sobre `GEMINI_MODEL` (ver `resolveModel`) |
| `ai_assistant.contexts` | `{}` (seed) — contexto ausente = ligado | mapa contexto→bool; a tela admin liga/desliga                 |

## Env

| Var              | Default | Nota                                                                                                            |
| ---------------- | ------- | --------------------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY` | —       | obrigatória para chamadas reais; ausência ⇒ degrada para manual                                                 |
| `GEMINI_MODEL`   | —       | usado só quando `ai_assistant.model` não está setado (`resolveModel`: system_config → env → `gemini-3.6-flash`) |
| `AI_TIMEOUT_MS`  | `18000` | timeout de uma chamada                                                                                          |

A chave de API **nunca** entra em `system_config`: vem de env ou da tabela `ai_credentials` (cifrada). `GET /api/ai/status` devolve `{ configured, provider }`, nunca a chave.

| Var | Nota |
| --- | --- |
| `AI_SECRET_KEY` | segredo de cifra das chaves gravadas no banco (obrigatório para `saveProviderKey`/ler chave do banco) |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | fallback quando não há credencial ativa no banco |

## Revisão de texto de anúncios — `@kizuna/core/server/ai` (`text-review/`)

Skill `text_review` (contexto `text_review`, liga/desliga em `ai_assistant.contexts`) que sugere uma descrição revisada. **Nunca altera o anúncio**: grava uma linha `pending` em `service_text_revisions` para aprovação humana.

**Acesso: somente root, e somente com o JWT do usuário logado.** Nada desta feature usa token de serviço nem `service-db`: as funções recebem um `AiUserDb` (`{ accessToken }`, o JWT da sessão) e falam com o PostgREST por `aiTable`/`aiRpc` (`db.ts`). O banco repete a regra (RLS e RPCs checam a claim `is_root` por `public.fn_ai_review_is_root()`); as permissões `ai_review.manage`/`ai_review.review` ficam só no catálogo e não abrem acesso.

| Peça | O quê |
| --- | --- |
| `loadReviewPrompt(db, categoryId)` / `renderTemplate` (`prompt-store.ts`) | Prompt ativo `service_description_review` de `ai_prompts` (override por categoria, senão global), cache de 30 s, fallback para o prompt embutido. Placeholders do template: `category`, `group`, `subcategories`, `fields`, `title`, `original` (entre chaves duplas). |
| `buildServiceContext(db, serviceId)` (`context.ts`) | Categoria, grupo, subcategorias e respostas de `form_results` rotuladas pelo schema do formulário. |
| `textReviewSkill` / `validateRevision` (`skill.ts`) | Schema `{ revised }`; valida não vazio, tamanho entre 0,4x e 2,5x do original, só as tags p, strong, em, ul, ol, li, br, a (sem atributos, exceto href http/https/mailto/tel no a) e diferente do original. |
| `reviewService(db, serviceId, { runId, userId })` (`review-service.ts`) | Roda a skill e insere a revisão `pending` com provider, model, `prompt_version` e tokens. Se já existe `pending`, não gera outra (`skipped`). |
| `startReviewRun(db, { categoryId, limit, includeReviewed, userId })` (`run-batch.ts`) | Valida `categories.ai_review`, encerra runs presos, recusa se já há lote ativo na categoria (`ReviewRunConflictError`), seleciona anúncios `active`/`pending` com descrição (exclui os com revisão `pending`/`approved`, salvo `includeReviewed`, que ainda nunca duplica `pending`) e grava o run com `total` e `service_ids` (jsonb). Não processa nada. |
| `stepReviewRun(db, runId, opts?)` (`run-batch.ts`) | Processa o próximo pedaço: até 5 anúncios, concorrência 3, sem iniciar novos depois de 40 s. Os pendentes são recomputados a cada passo (`service_ids` menos o que já tem revisão deste run, o que já tem revisão `pending` de outro lote e os ids em `failed_ids`), então o passo é idempotente e retomável. Devolve `{ runId, status, total, processed, failed, tokensIn, tokensOut, error, done }`. Falha por item não aborta (o id vai para `failed_ids` e não é repetido); erro `blocked` (sem chave, contexto desligado) encerra como `failed`; todos falharam ⇒ `failed`. |
| `cancelReviewRun` / `getReviewRun` / `getActiveReviewRun` / `expireStaleRuns` (`run-batch.ts`) | Cancelar, ler o progresso, achar o run ativo (para retomar a tela) e encerrar como `failed` o run `pending`/`running` sem passo há mais de 30 min (`updated_at`). |

### Credenciais, chaves e prompts

- Chave por provedor: `saveProviderKey(db, provider, label, key)` cifra no Node (AES-256-GCM, segredo `AI_SECRET_KEY`) e chama a RPC `fn_ai_credential_save`, que grava a nova ativa e desativa as anteriores do provedor na mesma transação; só `key_last4` é legível por SELECT. `getProviderKey(provider, db?)` lê o cipher pela RPC `fn_ai_credential_get_cipher` (só root) e cai para a env. A coluna cifrada nunca sai do servidor (nem pelo recurso REST).
- Prompts ficam em `ai_prompts` (editáveis na tela `/painel/root/ia`, aba Prompts); `version` sobe por trigger quando o texto muda e é gravada em cada revisão.

### Fluxo de revisão e telas

1. A categoria precisa de `ai_review = true` (flag na edição da categoria).
2. `/painel/administracao/revisao-ia` (somente root): escolhe categoria, quantidade e "incluir já revisados" e dispara `POST /api/ai/review/run`, que cria o run e devolve `runId` (201) sem processar nada. Em seguida a tela chama `POST /api/ai/review/runs/[id]/step` em loop (um passo por vez) enquanto a aba está aberta, mostra a barra de progresso e tem Pausar/Continuar/Cancelar. Ao reabrir a tela, `GET /api/ai/review/runs/active` devolve o run em andamento e o loop retoma de onde parou. Não há processamento em segundo plano: fechar a aba pausa o lote (um run sem passo por 30 min vira `failed`).
3. Cancelar: `POST /api/ai/review/runs/[id]/cancel` marca o run como `cancelled`; o passo em andamento confere o status após cada anúncio e para, e os seguintes não processam nada.
4. Revisão lado a lado: original (texto simples) à esquerda, revisado em editor editável à direita. Aplicar chama `POST /api/ai/review/revisions/[id]/apply` (corpo opcional com o texto editado) e rejeitar chama `.../reject`; ambas usam as RPCs `fn_service_revision_apply`/`fn_service_revision_reject` com o JWT do usuário. `POST /api/ai/review/apply-bulk` aplica várias sem edição.
5. `/painel/root/ia` (somente root): abas Provedores e chaves (provedor/modelo padrão, contextos, chaves por provedor), Prompts (editar, testar em um anúncio sem gravar, override por categoria) e Execuções (progresso, tokens, cancelar). Teste: `POST /api/ai/prompts/test`.

Componentes reutilizáveis: `@kizuna/core/client/components/ai-review` (`AiAdminScreen`, `AiReviewScreen`). O slot `ia` do `ROOT_SCREEN_REGISTRY` recebe `AiAdminScreen` por `slotComponents` na page do projeto.

### Integração com robôs de importação

Uma revisão `approved` é a descrição definitiva do anúncio. Importadores/robôs não devem sobrescrever `description` de serviço que tenha `service_text_revisions` com `status = 'approved'` (ver `docs/integracoes/cinema-depara.md`).
