# TODO — AI

Backlog do mecanismo de IA (plugin `ai_assistant`). Itens explicitamente fora do escopo da v1.

- [x] ~~**Naví no wizard — afordância inútil no step 1.**~~ Resolvido: o botão one-shot deu lugar à **Naví conversacional** (`WizardConversation` — ver `docs/WIZARD.md`). Entrevista + tags + preenche + avança; dock/painel no core; `create`-only. Spec `foco-total/docs/superpowers/specs/2026-09-10-navi-conversational-wizard-design.md`.
- [ ] `OpenAiProvider` — structured output via `response_format: json_schema`.
- [ ] `ClaudeProvider` — structured output via tool-use forçado.
- [ ] Tabela `ai_assistant_usage` (quem, skill, provider, tokens, latência, ok/erro) + grant só backend.
- [ ] Rate-limit persistente (hoje in-memory, morre no restart / não cobre multi-instância).
- [ ] Chave de API gerenciável pelo admin (precisa de coluna cifrada ou secret store — hoje só env).
- [ ] Contexto "atendimento ao cliente" — precisa de histórico de conversa (integrar plugin `messaging`).
- [ ] Streaming (hoje 1-shot; ok pra extração estruturada, não pra chat longo).
- [ ] Tela de config: seletor de modelo por lista (hoje texto livre) quando houver > 1 provider.
- [ ] Rota `/api/ai/criar-anuncio`: rate-limit agora volta 503/`transient` (via `skill.rateLimit` → `AiUnavailableError`), não 429. Queima um strike de degradação e mostra a copy genérica; o branch 429 em `use-navi-anuncio.ts` virou morto p/ essa rota. `runSkill` precisaria de um tipo de erro distinto p/ rate-limit restaurar o 429.
- [ ] `ia-config-client.tsx` hardcoda `AI_CONTEXTS` — `listSkillContexts()` existe no core mas não é usado (rodaria server-side; a página é client). Um endpoint `GET /api/ai/contexts` fecharia isso.
