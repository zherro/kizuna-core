---
name: setup-projeto-novo
description: Use ao iniciar um projeto novo em cima do kizuna-starter / kizuna-core — clonar, renomear, escolher plugins, instalar o banco, criar o primeiro usuário root e subir.
---

# Setup de Projeto Novo — kizuna-starter

## Overview

Um projeto novo nasce de `git clone` do **`kizuna-starter`** (não CLI, não `app-template/` dentro
do core). O `kizuna-core` entra como submódulo, consumido por path alias (`@kizuna/core/*` →
`./kizuna-core/src/*`), igual num projeto existente. No primeiro `npm run dev` você já tem
**auth + RBAC + chrome do painel + telas admin genéricas + showcase** funcionando, e
**home / busca / wizard como exemplos editáveis**.

> Esta skill é forward-looking: descreve o starter pretendido (spec
> `2026-09-04-kizuna-starter-setup-design.md`). Se algum passo ainda não existe no repo, ele é o
> trabalho da Fase B/D — confira o `README.md` do starter, que é a fonte viva.

## Forma do starter (o que você recebe)

```
meu-projeto/
├── kizuna-core/                    # submódulo
├── src/
│   ├── app/
│   │   ├── layout.tsx              # providers (Auth, AppPreferences, Toaster) — mínimo
│   │   ├── page.tsx                # home EXEMPLO ("// EXEMPLO — reescreva")
│   │   ├── login/ registre-se/     # renderizam LoginPageContent / RegisterPageContent do core
│   │   ├── painel/                 # layout com getSession→redirect→<PanelShell>, dashboard exemplo,
│   │   │   ├── root/[slug]/         #   catch-all root-screens do core
│   │   │   └── administracao/…      #   telas genéricas via screen-engine (categorias, forms, paginas)
│   │   ├── showcase/               # showcase do core
│   │   ├── [slug]/                 # PageView do plugin pages
│   │   └── api/                    # re-export dos handlers do core (auth, resources, postgrest, storage)
│   ├── components/
│   │   ├── nav-config.ts           # a lista de nav do PanelShell — é aqui que o projeto começa a editar
│   │   └── examples/               # home, busca — código de exemplo isolado, dá pra apagar
│   ├── lib/server/resources/index.ts  # importa + spread dos resourceX de plugin do core
│   └── proxy.ts                    # createKizunaProxy({ protectedPrefixes, authPages })
├── db/
│   ├── install.sh                 # core + plugins (de kizuna.plugins.json) + migrations/ + extras/
│   ├── migrations/                # vazio (0001 template comentado — cria categories/categories_sub se usar taxonomy)
│   └── extras/                    # vazio (seeds de exemplo comentados)
├── kizuna.plugins.json            # lista curada default (sem taxonomy — ver nota)
├── .env.example
└── README.md
```

**Regra do starter:** tudo que é "exemplo" fica fisicamente isolado (`components/examples/`,
comentário `// EXEMPLO`). O que não está em `examples/` é infraestrutura que o projeto mantém.

## Checklist

1. `git clone --recurse-submodules <kizuna-starter> meu-projeto && cd meu-projeto`
   (esqueceu `--recurse-submodules`? `git submodule update --init --recursive`).
2. `bash scripts/rename-project.sh "Meu Projeto"` — troca nome do app, `themeColor`, metadata
   num passo.
3. `cp .env.example .env` e preencher **`PGRST_JWT_SECRET`** (ou `JWT_SECRET` — tem que bater com
   o secret que o PostgREST verifica) + a **URL do PostgREST** (`POSTGREST_URL`). Todo o resto
   (SMTP, TinyPNG, Gemini) é opcional.
4. Editar `kizuna.plugins.json` — manter só os plugins que o projeto usa. Cada linha comentada
   explica o plugin. Ver `kizuna-core/docs/PLUGINS.md`.
5. `npm install`
6. `npm run db:install -- --db-url "$DATABASE_URL"` — aplica `kizuna-core/sql/*` (schema de auth,
   RBAC, plugin_registry) em ordem, depois cada plugin de `kizuna.plugins.json`, depois
   `db/migrations/` e `db/extras/` do app (vazios no starter).
7. `npm run dev`, abrir `/registre-se`, criar o **primeiro usuário** → `fun_auth__signup_bootstrap`
   detecta `auth.users` vazio e marca esse usuário **`is_root = true`** automaticamente. Nenhum
   signup depois disso vira root.
8. **Re-rodar `npm run db:install`** — agora os seeds de plugin que dependem de um tenant/root
   existirem pegam (ex.: `plugins/pages/0002_pages_seed.sql` semeia `sobre`/`quem-somos`/
   `termos-de-uso` sob o tenant do primeiro root; era no-op silencioso antes).
9. `/painel` abre; `/showcase` é a referência de UI viva; `src/components/examples/` é o que dá
   pra apagar sem medo.
10. Começar o app: `src/components/nav-config.ts` (nav do painel), `src/lib/server/resources/`
    (recursos do app — skill `criar-recurso`), `db/migrations/` (schema do app),
    `.claude/domains/` (docs de domínio do app).

## `taxonomy` — o caso especial

`taxonomy` fica **fora** de `kizuna.plugins.json` de propósito: ele faz `ALTER` em
`public.categories` / `public.categories_sub`, que só existem depois de uma migração do app criar
essas tabelas. Se o projeto usa taxonomia: descomente o `db/migrations/0001` template (cria
`categories`/`categories_sub` mínimos) e o passo do `install.sh` que aplica o plugin `taxonomy`
entre as migrations e os extras. Se não usa: deixe como está.

## Env que o core lê

| Var | Obrigatória | Para quê |
| --- | --- | --- |
| `PGRST_JWT_SECRET` / `JWT_SECRET` | sim | assinar/verificar o JWT de sessão (bater com o PostgREST) |
| `POSTGREST_URL` | sim | base das chamadas `pgrstTable`/`pgrstRpc` |
| `SMTP_*` | não | email (`kizuna-core/docs/EMAIL.md`) |
| `TINYPNG_API_KEY` / `TINIFY_API_KEY` | não | otimização de imagem no upload |
| `GEMINI_API_KEY` | não | features de AI |
| `SHOWCASE_ENABLED` | não | liga `/showcase` |
| `DEBUG_HTTP=1` | não | loga um `curl` equivalente por chamada ao PostgREST |

## Verificação (fim do setup)

- Login funciona; primeiro usuário é root (`select is_root from auth.users`).
- `/painel` abre; telas de `administracao` (categorias/forms/paginas) salvam.
- `/showcase` renderiza.
- `/sobre` (seed do plugin `pages`) aparece — se não, o passo 8 não rodou.
- `npm run build` limpo.
