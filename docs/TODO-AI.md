# TODO — AI

Backlog do mecanismo de IA (plugin `ai_assistant`). Itens explicitamente fora do escopo da v1.

- [ ] `OpenAiProvider` — structured output via `response_format: json_schema`.
- [ ] `ClaudeProvider` — structured output via tool-use forçado.
- [ ] Tabela `ai_assistant_usage` (quem, skill, provider, tokens, latência, ok/erro) + grant só backend.
- [ ] Rate-limit persistente (hoje in-memory, morre no restart / não cobre multi-instância).
- [ ] Chave de API gerenciável pelo admin (precisa de coluna cifrada ou secret store — hoje só env).
- [ ] Contexto "atendimento ao cliente" — precisa de histórico de conversa (integrar plugin `messaging`).
- [ ] Streaming (hoje 1-shot; ok pra extração estruturada, não pra chat longo).
- [ ] `generate-marketplace-description` vira skill `describe-service` (mantendo fallback de template).
- [ ] Tela de config: seletor de modelo por lista (hoje texto livre) quando houver > 1 provider.
