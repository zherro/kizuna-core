# kizuna-core — pontos de performance e segurança

Levantamento dos riscos da stack (Next App Router + PostgREST + JWT/RLS multi-tenant).
Coluna **MITIGADO**: `sim` / `não` / `parcial` — estado no código hoje, não o ideal.
**NÍVEL**: alto / médio / baixo. **TIPO**: ataque / user / infra / load.

> `user` = degrada a experiência do usuário (tela lenta, flash). `load` = quebra sob
> volume. `infra` = configuração de deploy. `ataque` = superfície explorável.

---

## Performance

| PONTO | RISCO | MITIGAÇÃO | MITIGADO | NÍVEL | TIPO |
|---|---|---|---|---|---|
| `export const dynamic = 'force-dynamic'` no `layout.tsx` | mata static/ISR do app inteiro — toda página renderiza por request, inclusive públicas | remover; a trava de env já está no proxy | **não** (foi adicionado nesta entrega) | médio | user, load |
| `layout.tsx` raiz chama `getSession()` → lê `cookies()` | qualquer rota que herda o layout vira dinâmica; páginas públicas (`/`, `/[slug]`, `/anuncios/[slug]`, `/busca`) não podem ser estáticas | layout raiz sem cookie; `AuthProvider` hidrata client-side via `/api/auth/me`; `getSession()` só em `/painel/*` | **não** | alto | user, load |
| N+1 de round-trips ao PostgREST | cada `pgrstTable` = 1 HTTP + 1 query + 1 conexão do pool; server component com N fetches sequenciais = N waterfalls | `Promise.all` para fetches independentes; **RPC que compõe** o payload num call | **parcial** (padrão existe — `fn_search_ads`, `fn_msg_list_conversations` agregam — mas nada força; a rota genérica `/api/resources` é 1 tabela por call) | alto | user, load |
| RLS avaliada por linha | policy com `EXISTS(SELECT … FROM tenant_members …)` ou `fun_auth__has_permission()` por linha → scan caro | índice em `tenant_id` e `tenant_members(tenant_id, user_id)`; permissão via `SECURITY DEFINER` com cache; `(SELECT auth.fun_…())` para o planner materializar 1x | **parcial** (funções existem; `search_path` corrigido em 0105/0107; indexação de suporte não garantida) | alto | load |
| `SELECT *` no PostgREST | sem `select=` explícito PostgREST devolve todas as colunas — payload gordo, colunas sensíveis expostas ao cliente | pinar `select` no `ResourceConfig` de cada recurso | **parcial** (`ResourceConfig` suporta; adesão por recurso não auditada) | médio | user, load, ataque |
| Paginação por `OFFSET` | `OFFSET 10000` faz o Postgres varrer até lá; lista profunda fica lenta | keyset / cursor pagination (`WHERE id > $cursor ORDER BY id LIMIT n`) | **parcial** (chat usa cursor; `/api/resources` e listas de screen-engine usam offset) | médio | load |
| Respostas do PostgREST não são cacheadas | leitura pública repetida (home, busca, listagem) refaz query toda vez; com `force-dynamic` o cache do `fetch` do Next some | ISR nas páginas públicas; `Cache-Control` nas rotas de leitura anônima; Redis/edge cache se o volume pedir | **não** | alto | load |
| Pool de conexão do PostgREST | `db-pool` default = 10; sob carga concorrente as requisições enfileiram | PgBouncer (transaction pooling) na frente do Postgres; tunar `db-pool` / `db-pool-timeout`; PostgREST horizontal | **não** (default, sem PgBouncer documentado) | alto | infra, load |
| Busca full-text sem índice | `to_tsvector(...)` / `ILIKE '%x%'` sem índice = seq scan na tabela toda a cada busca | índice **GIN** em `to_tsvector('portuguese', …)`; `websearch_to_tsquery`; `pg_trgm` para fuzzy | **parcial** (`fn_search_ads` é do app; índice de suporte por conta do app, não do core) | alto | load, user |
| Screen-engine registry importa tudo eagermente | `render-screen` → `registry.ts` → `AccountForm` → editores markdown/quill; toda tela de screen-engine carrega o bundle inteiro | lazy import por bloco; `next/dynamic` nos editores (já é `dynamic` internamente, mas o import do registry é estático) | **parcial** | baixo | user (bundle) |

---

## Segurança

| PONTO | RISCO | MITIGAÇÃO | MITIGADO | NÍVEL | TIPO |
|---|---|---|---|---|---|
| PostgREST acessível fora da rede interna | se `POSTGREST_URL` aponta para um host público, qualquer um com um JWT válido bate direto no PostgREST e pula toda a lógica das rotas Next | PostgREST **só** em rede privada / localhost / sidecar; nunca porta pública; firewall | **parcial** (padrão é proxiar via `/api/postgrest/rpc` e rotas server-only, mas nada impede um `POSTGREST_URL` público) | alto | ataque, infra |
| RLS é a única barreira de dados | a rota genérica `/api/resources/[resource]` confia 100% no RLS; uma policy faltando, um `ResourceConfig` novo sem RLS na tabela = vazamento total do tenant | `ENABLE ROW LEVEL SECURITY` **+ `FORCE ROW LEVEL SECURITY`** em toda tabela; checklist de review por tabela nova; teste automatizado de isolamento entre tenants | **parcial** (tabelas de plugin têm RLS; `FORCE` não confirmado em todas; sem checklist/teste) | alto | ataque |
| JWT HS256 com segredo compartilhado | o mesmo `PGRST_JWT_SECRET` assina a sessão no Next **e** o PostgREST verifica; se o processo Next vaza o segredo, o atacante forja token de qualquer tenant/role | RS256: Next assina com chave privada, PostgREST verifica com a pública (o Next nunca precisa poder verificar tokens de terceiros) | **não** (HS256 por design) | médio | ataque |
| Funções `SECURITY DEFINER` | rodam como o dono e **bypassam RLS**; uma `fn_*` que não re-checa `auth.fun_auth_user_id()` / tenant vira porta lateral. `search_path` não pinado permite hijack via schema no path do caller | `SET search_path = pg_catalog, public` (ou explícito) em toda função DEFINER; re-checar auth dentro; `REVOKE EXECUTE FROM public` + grant só para `authenticated` | **parcial** (0105/0107 pinaram `search_path` em `has_permission`/login/signup; sem garantia de que toda `fn_*` de plugin fez o mesmo) | alto | ataque |
| Grants para a role `anon` | leituras públicas (busca, `pages`, `fn_get_provider_profile`) rodam como `anon`; um `GRANT SELECT` largo demais expõe tabela/coluna que não devia ser pública | grant mínimo: só as tabelas e colunas realmente públicas; RLS de leitura anônima explícita; auditar `\dp` por schema | **parcial** (`0099_grant_authenticator`; grants por plugin; sem auditoria consolidada) | alto | ataque |
| Sem rate limit no login / signup | `/api/auth/login` exposto a brute force de senha; signup exposto a criação em massa | rate limit por IP + por login (o `src/lib/server/ai/rate-limit` do foco é a base); lockout progressivo; captcha no signup | **não** (só features de AI têm rate limit; auth não) | alto | ataque |
| `tenant_id` / claims vindos do cliente | se qualquer rota lê `tenant_id` do body em vez do JWT, o usuário troca de tenant | claims setados só pela RPC de login (`SECURITY DEFINER`); rotas sempre leem tenant da sessão verificada | **sim** (convenção do projeto: tenant sempre do JWT; `getSession()` verifica assinatura) | alto | ataque |
| Trava de ambiente (`SetupRequiredScreen`) | um deploy sem `PGRST_JWT_SECRET` / `POSTGREST_URL` subiria "aberto" | proxy responde 503 com página de setup em toda rota enquanto a env falta | **sim** (`createKizunaProxy` + `checkKizunaEnv`) | baixo | infra |
| Segredos em `.env` no repo | `.env` commitado por engano vaza o segredo do JWT | `.env` no `.gitignore` (feito); `.env.example` sem valores; segredo via secret manager em prod | **parcial** (`.gitignore` cobre; sem enforcement de secret manager) | médio | ataque, infra |
| CORS / headers de segurança | sem `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security` o app fica exposto a clickjacking / injeção | `headers()` no `next.config.ts` com o set padrão; CSP restrita | **não** (template traz `next.config.ts` vazio) | médio | ataque |

---

## SEO / indexação

| PONTO | RISCO | MITIGAÇÃO | MITIGADO | NÍVEL | TIPO |
|---|---|---|---|---|---|
| TTFB alto nas páginas públicas | consequência de `force-dynamic` + `getSession()` no layout — toda página pública renderiza server-side por request; crawler e usuário esperam | ver os 2 primeiros itens de Performance (layout público + remover force-dynamic) → static/ISR | **não** | alto | user |
| Sem `robots.ts` / `sitemap.ts` | motores não descobrem as rotas; sem controle do que indexar | `app/robots.ts` + `app/sitemap.ts` (gerando do `pages` plugin + listagens); no template como seed | **não** (template não traz) | médio | user |
| Sem `generateMetadata` por rota | título/descrição/OG genéricos → SERP ruim, share sem preview | `generateMetadata` nas rotas públicas (`/[slug]`, detalhe de anúncio), lendo do próprio conteúdo | **não** (só metadata estática no `layout.tsx`) | médio | user |
| Sem dados estruturados (JSON-LD) | sem rich results (breadcrumb, produto, organização) | `<script type="application/ld+json">` nas páginas de conteúdo | **não** | baixo | user |
| Crawler pega 503 antes do `.env` | se o site subir sem env, o proxy devolve 503 a tudo — inclusive ao Googlebot | em prod a env sempre existe; garantir no deploy que `.env` está setado antes do tráfego | **parcial** (só acontece em erro de deploy) | baixo | infra |

---

## Prioridade sugerida (Fase B — hardening)

1. **Layout público** (não lê cookie) + remover `force-dynamic` + `/api/auth/me` — destrava static/ISR e TTFB. *Alto impacto, ~1 sessão.*
2. **Checklist + teste de RLS** (FORCE em toda tabela, isolamento entre tenants) + auditoria de grants `anon` + `search_path` em toda `fn_*`. *Alto risco de vazamento.*
3. **Rate limit em `/api/auth/*`** + headers de segurança no `next.config.ts`.
4. **PgBouncer + tuning de `db-pool`** documentado em `docs/DEPLOY.md`; PostgREST privado.
5. **Índices**: GIN para busca, `tenant_id` / `tenant_members` para RLS; RPC-first para leituras compostas; `select=` pinado nos `ResourceConfig`.
6. **SEO**: `robots.ts` / `sitemap.ts` / `generateMetadata` como seeds do template.
7. RS256 no lugar de HS256 (quando #1–#5 estiverem feitos).
