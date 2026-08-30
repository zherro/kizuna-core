---
name: criar-plugin
description: Use ao criar um plugin novo dentro de kizuna-core/plugins — antes de escrever qualquer 0001_*.sql ou registrar uma tabela nova no core.
---

# Criar um Plugin — kizuna-core

## Overview

Um plugin é uma tabela (ou par de tabelas relacionadas) opcional e independente das outras,
empacotada em um único `.sql` idempotente. Ver `docs/PLUGINS.md` para o que já existe hoje e
`plugins/README.md` para a convenção completa — esta skill é o passo a passo de execução.

**Regra dura**: nada específico de um projeto consumidor entra aqui. Se o campo/tabela só faz
sentido para o foco-total (ou qualquer outro app específico), ele não é plugin do core — vive no
`sql/` próprio do projeto consumidor.

## Passo 1 — Pasta e arquivo

```
kizuna-core/plugins/<nome-do-plugin>/0001_<nome-do-plugin>.sql
```

Nome curto, snake_case, um substantivo do domínio (`agenda`, `onboarding`, não `feature-x`).

## Passo 2 — O que o `0001_*.sql` precisa ter

Use `plugins/onboarding/0001_onboarding.sql` como referência completa. Checklist:

1. `CREATE TABLE IF NOT EXISTS` — nunca assuma que a tabela não existe.
2. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` em toda tabela nova.
3. `GRANT` explícito a `auth_user` só das operações que fazem sentido (uma tabela alimentada só
   pelo backend, como `notifications`, não recebe `INSERT` para `auth_user`).
4. Políticas com `DROP POLICY IF EXISTS` antes de `CREATE POLICY` (idempotência de re-apply).
5. Se a tabela precisa de escopo por tenant/usuário, siga o padrão já usado:
   `tenant_id uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid)`,
   `created_by uuid NOT NULL DEFAULT auth.fun_auth_user_id()`.
6. **Self-register em `auth.plugin_registry`**, no final do arquivo:

   ```sql
   INSERT INTO auth.plugin_registry (name, version)
   VALUES ('<nome-do-plugin>', '1.0.0')
   ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;
   ```

7. **Se houver algo administrável** (uma escrita que não é puramente self-service do próprio
   usuário), registre a permissão no catálogo — só o catálogo, nunca um grant:

   ```sql
   INSERT INTO auth.permissions (resource, action, name)
   VALUES ('<resource>', '<action>', 'Descrição legível')
   ON CONFLICT (resource, action) DO NOTHING;
   ```

   Gate a escrita correspondente com `auth.fun_auth_has_perm('<resource>', '<action>')` na policy
   de `INSERT`/`UPDATE`/`DELETE`. **Nunca insira em `auth.role_grants`** — decidir quem recebe a
   permissão é do projeto consumidor, não do plugin.

8. Se a tabela é estritamente self-service (cada usuário só mexe no próprio registro, como
   `account_preferences`), não registre permissão nenhuma — só o passo 6 já basta.
9. Termine com `NOTIFY pgrst, 'reload schema';`.

## Passo 3 — Documentar

Adicione uma linha em `plugins/README.md` (tabela informal já existente): nome, tabela(s), pra
que serve, uma frase sobre a razão de registrar (ou não) permissão. Depois espelhe a mesma linha
na tabela de `docs/PLUGINS.md`.

## Passo 4 — Testar contra um banco descartável

```bash
./kizuna-core/scripts/install.sh --db-url "$DATABASE_URL_DESCARTAVEL" --plugins <nome-do-plugin>
```

Rode duas vezes seguidas — a segunda tem que terminar sem erro (prova de idempotência). Confirme:

- `select * from auth.plugin_registry where name = '<nome-do-plugin>';` retorna 1 linha.
- Se registrou permissão: `select * from auth.permissions where resource = '<resource>';` retorna
  a linha, e `select * from auth.role_grants where ...` **não** retorna nada por padrão.

## O que NÃO pode ter

- Nada de `env var` com nome específico de um app.
- Nada de import/referência a código de `src/` de um projeto consumidor.
- Nenhum `INSERT INTO auth.role_grants` dentro do plugin.
- Nenhuma coluna/tabela que só faz sentido pra um único projeto — isso é migração própria do
  consumidor (`sql/` do projeto), não plugin do core.
