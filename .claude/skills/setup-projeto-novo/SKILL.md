---
name: setup-projeto-novo
description: Use ao iniciar um projeto novo em cima do kizuna-core — submódulo, kizuna install, instalar o banco, criar o primeiro usuário root e subir.
---

# Setup de Projeto Novo — kizuna-core

## Overview

Um projeto novo entra pelo **`kizuna-starter`** (repo fino: `kizuna.plugins.json` + `.env.example`

- `README.md` + o submódulo `kizuna-core`) ou começando de um dir vazio e adicionando o submódulo
  à mão. Em ambos os casos o conteúdo real da casca **não é copiado no repo** — é **materializado
  por `node kizuna-core/cli install`** a partir do `kizuna-core/template/`.

O `kizuna-core` é consumido por path alias (`@kizuna/core/*` → `./kizuna-core/src/*`), igual num
projeto existente. Depois do `install` + `npm install` + `db install` você tem **auth + RBAC +
chrome do painel + telas admin genéricas + catch-all `[...kizuna]` para telas de plugin**
funcionando; `app/page.tsx` e `app/layout.tsx` vêm como seeds editáveis.

Referência de comandos: **`kizuna-core/docs/CLI.md`**.

## Checklist

1. **Submódulo.**

   ```bash
   git clone --recurse-submodules <kizuna-starter> meu-projeto && cd meu-projeto
   # OU, de um dir vazio:
   git init && git submodule add <url-do-kizuna-core> kizuna-core
   ```

   (esqueceu `--recurse-submodules`? `git submodule update --init --recursive`).

2. **Materializar a casca.**

   ```bash
   node kizuna-core/cli install
   ```

   Cria `kizuna.plugins.json` (pergunta plugin a plugin se o arquivo faltar), materializa
   `template/` (managed + seed), faz merge do `package.json` (scripts `kizuna`/`predev` + deps
   pinadas), e no fim pergunta **"rodar `npm install` agora?"**. Sem `--db-url`/`$DATABASE_URL`
   ele pula o banco (passo 4). Flags úteis: `--yes`, `--no-input`, `--skip-db`.

3. **Env.**

   ```bash
   cp .env.example .env
   ```

   Preencher **`PGRST_JWT_SECRET`** (ou `JWT_SECRET` — tem que bater com o secret que o PostgREST
   verifica) e **`POSTGREST_URL`**. Todo o resto (SMTP, TinyPNG, Gemini, `SHOWCASE_ENABLED`,
   `DEBUG_HTTP`) é opcional.

4. **Banco.**

   ```bash
   node kizuna-core/cli db install --db-url "$DATABASE_URL"
   ```

   Aplica `kizuna-core/sql/*` (auth, RBAC, plugin_registry) em ordem, depois cada plugin de
   `kizuna.plugins.json`. Idempotente — é um instalador do zero, não histórico de migração.

5. **Primeiro usuário = root.** `npm run dev`, abrir `/registre-se`, criar o primeiro usuário →
   `fun_auth__signup_bootstrap` detecta `auth.users` vazio e marca esse usuário
   **`is_root = true`** automaticamente. Nenhum signup depois disso vira root.

6. **Re-rodar o `db install`** — agora os seeds de plugin que dependem de um tenant/root existirem
   pegam (ex.: `plugins/pages/0002_pages_seed.sql` semeia `sobre`/`quem-somos`/`termos-de-uso` sob
   o tenant do primeiro root; era no-op silencioso antes).

   ```bash
   node kizuna-core/cli db install --db-url "$DATABASE_URL"
   ```

7. **Começar o app:** `src/lib/server/resources/` (recursos do app — skill `criar-recurso`), a nav
   do `PanelShell`, migrations do app, `.claude/domains/` (docs de domínio). Telas novas de
   `/painel` seguem a skill `nova-tela-screen-engine`.

## `taxonomy` — o caso especial

`taxonomy` fica **fora** de `kizuna.plugins.json` de propósito: ele faz `ALTER` em
`public.categories` / `public.categories_sub`, que só existem depois de uma migração do app criar
essas tabelas. Se o projeto usa taxonomia: crie as tabelas mínimas numa migration do app e habilite
o plugin **depois** (`node kizuna-core/cli plugin add taxonomy`). Se não usa: deixe fora.

## Manter o core alinhado depois

- `predev` roda `node kizuna-core/cli check` a cada `npm run dev` — só **avisa** se o submódulo
  divergiu do `kizuna.lock` (nunca bloqueia).
- `git -C kizuna-core pull` + `node kizuna-core/cli update` aplica o que mudou no core (fast-forward
  / conflito 3-way + migrations pendentes).
- `node kizuna-core/cli lock` marca o core atual como "visto" sem aplicar nada.
- Melhorou algo local que devia estar no core: `node kizuna-core/cli sync` (submódulo num branch).

Detalhes de cada comando, do `kizuna.lock` e da regra de bump do `VERSION`: **`kizuna-core/docs/CLI.md`**.

## Env que o core lê

| Var                                  | Obrigatória | Para quê                                                  |
| ------------------------------------ | ----------- | --------------------------------------------------------- |
| `PGRST_JWT_SECRET` / `JWT_SECRET`    | sim         | assinar/verificar o JWT de sessão (bater com o PostgREST) |
| `POSTGREST_URL`                      | sim         | base das chamadas `pgrstTable`/`pgrstRpc`                 |
| `SMTP_*`                             | não         | email (`kizuna-core/docs/EMAIL.md`)                       |
| `TINYPNG_API_KEY` / `TINIFY_API_KEY` | não         | otimização de imagem no upload                            |
| `GEMINI_API_KEY`                     | não         | features de AI                                            |
| `SHOWCASE_ENABLED`                   | não         | liga `/showcase`                                          |
| `DEBUG_HTTP=1`                       | não         | loga um `curl` equivalente por chamada ao PostgREST       |

## Verificação (fim do setup)

- Login funciona; primeiro usuário é root (`select is_root from auth.users`).
- `/painel` abre; telas de `administracao` (categorias/forms/paginas) salvam.
- `/sobre` (seed do plugin `pages`) aparece — se não, o passo 6 não rodou.
- `node kizuna-core/cli check` → sem banner (lock == submódulo).
- `npm run build` limpo.
