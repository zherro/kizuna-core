-- plugins/ai_assistant/0001_ai_assistant.sql
-- Plugin: ai_assistant — mecanismo genérico de assistente de IA da plataforma (provider
-- plugável, skills declaradas no projeto consumidor, degradação graciosa quando a IA está
-- indisponível). SEM tabela de dados na v1 — toda a configuração vive em `auth.system_config`
-- (chaves `ai_assistant.provider` / `.model` / `.contexts`). A chave de API do provider fica
-- em variável de ambiente, nunca no banco.
--
-- Depende do plugin `system_config` (tabela `auth.system_config`). Também usa `auth.permissions`
-- e `auth.plugin_registry`, que já existem no core.
--
-- Idempotente, from-zero-safe — mesma convenção de kizuna-core/plugins/*/0001_*.sql (ver
-- kizuna-core/plugins/README.md): INSERT ... ON CONFLICT DO NOTHING para permissão e seeds,
-- self-register em `auth.plugin_registry` via ON CONFLICT DO UPDATE, NOTIFY pgrst no fim.
-- Registra a permissão `ai_assistant`/`manage` catálogo-only (sem grant automático — root passa
-- por auth.fun_auth_has_perm).
--
-- Este plugin NÃO faz CREATE TABLE nem ALTER em nenhuma tabela — é seguro listar em
-- kizuna.plugins.json incondicionalmente (como `forms`).
--
-- Design completo: foco-total/docs/superpowers/specs/2026-09-09-plugin-ai-assistant-design.md §2.1

INSERT INTO auth.permissions (resource, action, name) VALUES
  ('ai_assistant', 'manage', 'Configurar o assistente de IA')
ON CONFLICT (resource, action) DO NOTHING;

-- Seed das chaves de config (só provider/model/contexts — a chave de API fica em env var).
-- `contexts` nasce `{}` — o projeto consumidor liga os contextos na tela admin; contexto
-- ausente é tratado como ligado (default-on), então o marketplace funciona sem config manual.
INSERT INTO auth.system_config (key, value) VALUES
  ('ai_assistant.provider', '"gemini"'::jsonb),
  ('ai_assistant.model',    '"gemini-3.6-flash"'::jsonb),
  ('ai_assistant.contexts', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('ai_assistant', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
