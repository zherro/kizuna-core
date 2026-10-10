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

Referência de comandos: **`kizuna-core/docs/comecando/cli.md`**.

## Checklist

Caminho testado de ponta a ponta (projeto limpo → login com root). Pré-requisitos: Node ≥ 20, Git e
Docker Desktop rodando.

1. **Submódulo + esqueleto.**

   ```bash
   mkdir meu-app && cd meu-app && git init
   git submodule add -b develop https://github.com/zherro/kizuna-core.git kizuna-core
   cp kizuna-core/starter/kizuna.plugins.json kizuna-core/starter/kizuna.config.json kizuna-core/starter/.env.example .
   ```

   (clonou um projeto existente sem `--recurse-submodules`? `git submodule update --init --recursive`).

2. **Materializar a casca.**

   ```bash
   node kizuna-core/cli install --yes
   ```

   Materializa `template/` (managed + seed + install: inclui `Dockerfile`, `docker-compose.yml` e
   `docker-compose.db.yml`), faz merge do `package.json` (cria com `name`/`version` se não existir),
   escreve `kizuna.lock` e roda `npm install`. Sem `DATABASE_URL` ele pula o banco.

3. **Env.** `cp .env.example .env` e preencher:
   - **`PGRST_JWT_SECRET`** — gerar: `node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))"`.
     O mesmo valor vai para o PostgREST (o `docker-compose.db.yml` lê do `.env`).
   - **`POSTGRES_PASSWORD`** e a senha dentro de **`DATABASE_URL`** — trocar `troque_esta_senha` nos dois.
   - `POSTGREST_URL` já vem `http://localhost:3001`. Porta ocupada? `DB_PORT` / `PGRST_PORT` no `.env`
     (e ajustar `DATABASE_URL` / `POSTGREST_URL` para as mesmas portas).

4. **Banco local + schema.**

   ```bash
   docker compose -f docker-compose.db.yml up -d --wait
   node kizuna-core/cli db install
   ```

   O CLI lê `DATABASE_URL` do `.env` (ou `--db-url` / `$DATABASE_URL`), conecta com o driver `pg`
   (sem psql) e aplica `sql/*` + cada plugin de `kizuna.plugins.json`, em ordem. **Só roda em banco
   vazio** (os `CREATE TABLE` não são idempotentes) — para o que vier depois use `db migrate`/`db run`.

5. **Primeiro usuário = root.** `npm run dev`, abrir `http://localhost:3000/registre-se` e criar o
   primeiro usuário → `fun_auth__signup_bootstrap` vê `auth.users` vazio e marca **`is_root = true`**.

6. **Seed que depende do root** (páginas `sobre`/`quem-somos`/`termos-de-uso` do plugin `pages`):

   ```bash
   node kizuna-core/cli db run kizuna-core/plugins/pages/0002_pages_seed.sql
   ```

   Idempotente. **Não** re-rode `db install` para isso — ele falha em banco já instalado.

7. **Opcional:** `node kizuna-core/cli token service` → `POSTGREST_SERVICE_TOKEN` no `.env` (excluir
   conta, revogar sessão). Trocar nome/tema/marca em `kizuna.config.json` (vem com "Foco Total").

8. **Começar o app:** `src/lib/server/resources/` (recursos do app — skill `criar-recurso`), a nav
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

Detalhes de cada comando, do `kizuna.lock` e da regra de bump do `VERSION`: **`kizuna-core/docs/comecando/cli.md`**.

## Env que o core lê

| Var                                  | Obrigatória | Para quê                                                  |
| ------------------------------------ | ----------- | --------------------------------------------------------- |
| `PGRST_JWT_SECRET` / `JWT_SECRET`    | sim         | assinar/verificar o JWT de sessão (bater com o PostgREST) |
| `POSTGREST_URL`                      | sim         | base das chamadas `pgrstTable`/`pgrstRpc`                 |
| `SMTP_*`                             | não         | email (`kizuna-core/docs/servicos/email.md`)                       |
| `TINYPNG_API_KEY` / `TINIFY_API_KEY` | não         | otimização de imagem no upload                            |
| `GEMINI_API_KEY`                     | não         | features de AI                                            |
| `SHOWCASE_ENABLED`                   | não         | liga `/showcase`                                          |
| `DEBUG_HTTP=1`                       | não         | loga um `curl` equivalente por chamada ao PostgREST       |

## Verificação (fim do setup)

- Login funciona; primeiro usuário é root (`GET /api/auth/me` → `"is_root": true`).
- `/painel` abre; telas de `administracao` (categorias/forms/paginas) salvam.
- `GET <POSTGREST_URL>/pages?select=slug` (header `Accept-Profile: public`) lista `sobre`, `quem-somos`, `termos-de-uso` — se não, o passo 6 não rodou.
- `node kizuna-core/cli check` → sem banner (lock == submódulo).
- `npm run build` limpo.
