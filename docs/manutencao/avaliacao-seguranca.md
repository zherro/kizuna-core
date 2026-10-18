# Avaliação de segurança (OWASP Top 10:2025)

**Data da avaliação: 18/10/2026** · Escopo: `kizuna-starter` + `kizuna-core` (código, migrations, deploy) · Método: revisão de código por categoria + `npm audit` + busca de segredos no histórico.

Avaliação pré-produção feita sobre o `kizuna-starter` (projeto consumidor) com o core na versão vendorizada.
Os caminhos `src/server/...`, `plugins/...` e `sql/...` são do core; `src/app/...`, `deploy/...`, `.env.example` e `package.json` são do projeto.

Legenda: **[T]** testado ao vivo (Next dev local + PostgREST local, sem conta de teste — só anon e login inválido);
**[C]** confirmado no código; **[P]** plausível, a confirmar. O detalhe de cada achado (evidência e cenário) está em
"Resultados detalhados por categoria", no fim deste documento.

Itens corrigidos ficam na tabela de bloqueadores com a correção aplicada; os demais estão abertos.

## Resultado por categoria OWASP

| Categoria | Resultado | Achados abertos |
|---|---|---|
| A01 Controle de acesso (+ SSRF) | **Reprovado** | #3 autopublicação, #9 PostgREST exposto, #10 proxy RPC, #11 `files` público; SSRF: OK |
| A02 Configuração | **Reprovado** | #8 Postgres publicado, #10 erro interno vazado, #16 sem CSP, #21 imagens `latest` |
| A03 Supply chain | **Reprovado** | #1 next/sharp/nodemailer/postcss vulneráveis (`npm audit`: 1 crítica, 4 altas, 2 baixas) |
| A04 Criptografia | **Reprovado** | #2 segredo JWT do exemplo; baixos de AES-GCM e segredo único |
| A05 Injeção | **Reprovado** | #4 XSS JSON-LD, #5 upload HTML/SVG, #15 filtro PostgREST; SQL e comandos de SO: OK |
| A06 Design inseguro | Atenção | #14 rate-limit em memória, signup sem limite, contadores infláveis |
| A07 Autenticação | **Reprovado** | #6 open redirect, #7 reset sem revogar, #13 XFF, #17 senha curta, #18 enumeração, #19, #20 |
| A08 Integridade | Atenção | sem SRI (resolver via CSP); sem desserialização insegura; sem CI |
| A09 Logs | Atenção | e-mail em claro em 2 logs |
| A10 Exceções | **Reprovado** | #12 captcha fail-open; revogação de sessão fail-open (#20) |

Testes executados: revisão de código das 10 categorias; `npm audit --omit=dev`; busca de padrões de segredo em
`git log -p --all` (starter e core, nada real encontrado); requisições ao Next dev e ao PostgREST locais
(ver "Testado ao vivo").

## Bloqueadores — corrigidos em 18/10/2026 (falta só o que está em "Para fechar")

| # | Sev. | Achado | Correção aplicada |
|---|---|---|---|
| 1 | Crítico | `next 16.2.6` com RCE; `sharp`, `nodemailer`, `postcss` vulneráveis | `next 16.4.2`, `sharp ^0.35.5`, `nodemailer ^10.1.5` (peer do core aceita `^10`), `npm audit fix`. `npm audit --omit=dev`: só 2 baixas **[T]** |
| 2 | Crítico | Segredo JWT igual ao do `.env.example` | `.env.example` sem valor; `checkKizunaEnv` (`src/lib/env-guard.ts`) recusa em produção segredo < 32 caracteres ou do exemplo — o proxy devolve a tela de setup (503) **[T: teste unitário]** |
| 3 | Alto | Dono se autopublica (`status`/`sponsored`) | `plugins/services/0015_services_moderation_guard.sql`: trigger força `pending`/`false` no INSERT e mantém `status` (só aceita voltar a `pending`), `sponsored` e `tenant_id` no UPDATE de quem não tem `services.moderate` |
| 4 | Alto | XSS no JSON-LD | `jsonLdScript` escapa `<`, `>`, `&`, U+2028/2029 **[T: teste unitário]** |
| 5 | Alto | Upload HTML/SVG servido inline | `isBlockedUpload` recusa HTML/SVG/XML/JS (MIME ou extensão); `storageContentHeaders` nas duas rotas de conteúdo: `inline` só para imagem raster, resto `attachment`, CSP `sandbox`, `nosniff`, nome RFC 5987 **[T]** |
| 6 | Alto | Open redirect / `javascript:` no login social | `resolveReturnTo` e `goAfterLogin` passam por `sanitizeReturnTo` **[T: teste unitário]** |
| 7 | Alto | Reset não revogava sessões | `sql/0119_password_reset_revokes_sessions.sql` grava `sessions_revoked_at` (truncado ao segundo) |
| 8 | Alto | Postgres publicado em `0.0.0.0` | `deploy/postgres-postgrest/docker-compose.prod.yml` e `docker-compose.db.yml` (projeto e template) ligam só em `127.0.0.1`; o `docker-compose.yml` de deploy segue aberto durante a manutenção |
| 9 | Médio | Login chamável por anon direto no PostgREST | `sql/0120_login_requires_purpose.sql` exige claim `purpose = 'login'`; `auth-handlers.ts` assina com `purposeAuthHeader('login')` (login via Next testado: 401 normal) **[T]** |

### Para fechar

- Aplicar as migrations `services/0015`, `0119` e `0120` (`node kizuna-core/cli db migrate --db-url ...`) e repetir o teste: `POST /rpc/fun_auth__login_with_perms` direto no PostgREST deve dar `42501`.
- Gerar um `PGRST_JWT_SECRET` novo (`openssl rand -hex 32`) no `.env` local e no PostgREST; em produção, um por ambiente.
- No servidor, o PostgREST local (`:3004`) ainda escuta em `0.0.0.0` (container de outro compose): ligar em `127.0.0.1`.
- Terminada a manutenção remota no banco, publicar `deploy/postgres-postgrest/docker-compose.prod.yml` (Postgres só em 127.0.0.1).
- Testar com usuário de teste: autopublicação (#3) e revogação após reset (#7).

## Médios

| # | Achado | Onde |
|---|---|---|
| 10 | `/api/postgrest/rpc` é proxy genérico: aceita schema `auth` e qualquer função; devolve `message/details/hint` do PostgREST | `src/app/api/postgrest/rpc/route.ts:13,51,76` |
| 11 | Leitura pública de `files` sem filtro de `purpose`/tenant; anon lista arquivos com `uid` do dono e o conteúdo sai `inline` com o MIME gravado, sem CSP `sandbox` **[T]** | `plugins/storage/0001_storage.sql:65` |
| 12 | Captcha fail-open (erro de rede = ok) e desligado por padrão | `src/server/captcha.ts:24,68` |
| 13 | IP do cliente = 1º valor de `X-Forwarded-For` → burla o lockout por IP (após 429 no mesmo IP, trocar o header volta a 401) e permite travar conta alheia por 2 h **[T]** | `auth-handlers.ts:53`, `password-reset.ts`, `otp-handlers.ts:27` |
| 14 | Rate-limit e lockout em memória (somem no restart, não valem entre instâncias); signup sem limite por IP; `fn_ad_track`/`fn_analytics_track` infláveis por anon | `db/public.sql:4687,4891` |
| 15 | Injeção de filtro PostgREST na busca (`,` e `)` dentro de `or=(...)`) | `src/server/postgrest-crud.ts:165` |
| 16 | Sem CSP (terceiros: AdSense, One Tap, Turnstile); `X-Powered-By: Next.js` exposto **[T]** | `next.config.ts:19` |
| 17 | Senha mínima 6, sem blocklist; reset faz `trim()` na senha | `auth-handlers.ts:315`, `password-reset.ts:244,249` |
| 18 | Enumeração de usuários: signup 409, timing do login (sem bcrypt para inexistente), esqueci-a-senha síncrono | `auth-handlers.ts:374`, `sql/0110_login_checks_active.sql:37`, `password-reset.ts:178` |
| 19 | Código de verificação de e-mail de 6 dígitos sem limite de tentativas | `plugins/onboarding/.../verify-code/route.ts:110` |
| 20 | Logout só apaga cookie; revogação depende de `POSTGREST_SERVICE_TOKEN`, cache de 60 s e fail-open | `auth-handlers.ts:523`, `proxy.ts:87` |
| 21 | Imagens Docker `latest` (PostgREST, CloudBeaver) | `deploy/*/docker-compose.yml` |

## Baixos

- `SECURITY DEFINER` sem `SET search_path` (messaging, demanda, pedido, review); nenhuma tabela com `FORCE ROW LEVEL SECURITY`.
- Um só segredo HS256 para sessão, tokens `purpose`, state OAuth e PostgREST; `verifySession` não checa `aud`/`typ`.
- AES-GCM sem `authTagLength: 16` (`ai/credentials.ts:53`, `app-crypto.ts:54`).
- Sem checagem de `Origin` em rotas que mudam estado (só `SameSite=Lax`).
- E-mail em claro nos logs (`email/index.ts:58`, `auth-handlers.ts:367`).
- Multipart lido inteiro antes do limite; sharp sem `limitInputPixels`.
- `/api/agenda/cities` não valida `uf`; 403 do RPC revela a role; Grafana com usuário `admin`; scripts de terceiros sem SRI (resolver via CSP).

## O que está OK

Headers base (HSTS preload, nosniff, X-Frame-Options, Referrer/Permissions-Policy) · sem CORS aberto · bcrypt cost 10 · cookie `HttpOnly`/`Secure`/`SameSite=Lax` · token de reset aleatório, hash no banco, uso único, 60 min, no fragmento `#` · Google/One Tap com JWKS, `iss`, `aud`, `nonce`, PKCE e `email_verified` · OTP com hash e limite · `sanitizeDescriptionHtml` sem bypass encontrado · Markdown sem HTML cru · sem `child_process`, `eval` ou desserialização insegura · sem SSRF (fetches com host fixo) · RLS por dono sem IDOR nas tabelas revisadas · anon barrado em `ai_credentials`, `tickets`, `user_data`, `notifications` **[T]** · nenhum segredo real no histórico do git · lockfiles commitados, Node 22.

## Testado ao vivo

- **[OK]** Login inválido: mensagem genérica (`Credenciais invalidas.`) e 429 após 5 tentativas do mesmo IP.
- **[OK]** Esqueci-a-senha com e-mail inexistente: 200 com mensagem neutra.
- **[OK]** `/api/postgrest/rpc` sem sessão: recusado.
- **[OK]** Headers HSTS, X-Frame-Options e `nosniff` presentes.

- **[FALHA]** Lockout por IP: após 429 no mesmo IP, trocar `X-Forwarded-For` volta a processar o login (401) — #13.
- **[FALHA]** Sem `Content-Security-Policy`; `X-Powered-By: Next.js` exposto — #16.
- **[FALHA]** Anon no PostgREST lista `public.files` com `uid` do dono; o conteúdo sai `inline`, sem CSP `sandbox` — #11 e #5.
- **[FALHA]** `fun_auth__login_with_perms` chamável por anon direto no PostgREST (200) — #9.
- **[OK]** Anon no PostgREST: `ai_credentials`, `user_data`, `tickets`, `notifications` negados; `services` só ativos.
- **[OK]** `external_login` como anon: `42501` (exige claim `purpose`).

## Pendente desta avaliação

- Testes com dois usuários de teste: IDOR, autopublicação (#3), XSS do JSON-LD (#4) e do upload (#5), open redirect (#6), reset sem revogar (#7), schema `auth` no RPC (#10).
- `gitleaks` de verdade (foi feito grep no histórico).
- Revisão completa das funções `SECURITY DEFINER` e de `deploy/observability`.

## Resultados detalhados por categoria

### A01 — Controle de acesso e SSRF

Data: 2026-10-18. Nenhum arquivo do projeto foi editado e nenhum dado foi alterado.

**Limitação dos testes dinâmicos:** `http://localhost:3000` NÃO é o app Next do kizuna. Ele responde com um app Vite chamado "sicop-ui" (`<title>sicop-ui</title>`) em todas as rotas `/api/*`. Por isso não deu para testar as rotas Next. Os testes dinâmicos foram feitos direto no **PostgREST do kizuna em `127.0.0.1:3004`**, que está escutando em `0.0.0.0:3004` e serve os dados do projeto (services, files, system_config). Os seeds não têm credencial de teste (nenhum usuário com senha em `db/*.sql`), então tudo foi testado só como `anon`. Também não forjei JWT, embora o segredo esteja disponível (ver F2).

---

#### F1 — Alto — Dono publica o próprio anúncio sem moderação e se marca como patrocinado (status/sponsored graváveis pelo usuário)
- **Arquivos:** `kizuna-core/src/client/components/screen-engine/resources/services.ts:62-63` (`status: input.status ?? 'pending'`, `sponsored: parseActive(input.sponsored ?? false)`); `kizuna-core/plugins/services/0001_services.sql:91` (`GRANT SELECT, INSERT, UPDATE ON public.services TO auth_user`, valendo para a tabela inteira) e `:105-111` (as policies só verificam `created_by`).
- **Cenário:** um usuário comum manda `POST /api/resources/services {..., "status":"active","sponsored":true}`, ou `PATCH /api/resources/services/<seu id> {"status":"active"}`, ou chama o PostgREST direto. O anúncio vai ao ar sem passar por `fn_service_moderate` e ganha destaque de patrocinado. Nenhum trigger protege `status`/`sponsored`: um grep por `NEW.status`/`OLD.status` nas migrations não achou nada. Com PATCH direto no PostgREST também dá para trocar `tenant_id` (o WITH CHECK não confere o tenant).
- **Correção:** tirar `status`, `sponsored`, `tenant_id` e `like_count` do `mapInput`. No banco, usar GRANT por coluna (`GRANT UPDATE (title, description, …) ON services TO auth_user`) ou um trigger BEFORE INSERT/UPDATE que só deixa mudar `status`/`sponsored` quem tem `fun_auth_has_perm('services','moderate')` (o dono no máximo pausa: active↔paused).
- **PLAUSÍVEL** (o código é inequívoco; não testei porque não há credencial de teste).

#### F2 — Alto (Crítico se for para produção assim) — Segredo do JWT do PostgREST igual ao exemplo commitado → dá para forjar token de root
- **Arquivos:** `.env.example:6` (valor de exemplo commitado); o `.env` local usa **o mesmo valor** (comparei sem imprimir; 37 caracteres).
- **Cenário:** quem lê o repositório assina um HS256 com `role=auth_user` e `is_root=true` e passa por toda a RLS. Por exemplo, a policy `role_grants_write_policy` (`sql/0111_rbac_admin_delegation.sql:93`) confia direto no claim `is_root`.
- **Correção:** gerar um segredo aleatório de 32 bytes ou mais por ambiente. Fazer o boot recusar subir quando o segredo for igual ao de `.env.example`.
- **CONFIRMADO** (os valores são iguais); não forjei o token.

#### F3 — Médio — PostgREST exposto na rede e RPCs de login chamáveis por anon (pula o rate limit e o captcha do Next)
- **Evidência:** `netstat` mostra `0.0.0.0:3004 LISTENING`. O `POSTGREST_URL` não é `NEXT_PUBLIC_*` (correto), mas a porta responde para qualquer host. `sql/0106_wire_rbac_into_login.sql:212` faz `GRANT EXECUTE ON auth.fun_auth__login_with_perms TO anon`.
- **Teste:** `POST :3004/rpc/fun_auth__login_with_perms` com `Content-Profile: auth` e credencial inexistente → `null [200]`. Ou seja, dá para fazer brute force/credential stuffing direto no banco, sem o captcha e o rate limit das rotas `/api/auth/*`.
- **Correção:** ligar o PostgREST só em `127.0.0.1` ou numa rede interna, e nunca publicar esse host. Fazer o login exigir o claim `purpose` assinado pelo servidor, como já fazem `external_login`, `otp_*` e `password_reset_*`.
- **CONFIRMADO.**

#### F4 — Médio — `public.files`: anon e qualquer usuário leem e listam QUALQUER arquivo ativo (anexos de chamado/demanda, documentos) e o `uid` do dono
- **Arquivo:** `kizuna-core/plugins/storage/0001_storage.sql:65-73`. `files_select_policy` USING `(uid = me OR active = true)` e `files_select_anon_policy` USING `(active = true)`, sem nenhum filtro por `purpose` nem por tenant. O mesmo vale para `src/app/api/public/storage/files/[id]/content/route.ts` (sem autenticação).
- **Cenário:** os anexos `ticket_attachment` e `demanda_attachment` (adicionados em 0003/0004), assim como `document`/`pdf`, ficam públicos. Pela rota pública basta saber o id, e pelo PostgREST a lista inteira sai de uma vez.
- **Teste:** `GET :3004/files?select=id,purpose,mime_type,uid` sem token → 67 linhas com `uid` do dono. Hoje todas são `service_image`, então ainda não há anexo privado exposto.
- **Correção:** restringir a leitura de anon/público a `purpose IN ('ad_image','service_image','avatar','banner')`. Anexos ficam visíveis só para o dono, para quem participa do ticket/demanda e para a staff. Não expor a coluna `uid` para anon (GRANT por coluna).
- **CONFIRMADO** (listagem por anon); a exposição de anexos é PLAUSÍVEL.

#### F5 — Médio — `/api/postgrest/rpc` é um proxy genérico: qualquer função de qualquer schema
- **Arquivo:** `src/app/api/postgrest/rpc/route.ts:53-75`. Aceita `schema` livre e qualquer `functionName` `[a-zA-Z0-9_]+`.
- **Cenário:** um usuário logado alcança qualquer função com EXECUTE para `auth_user` em qualquer schema exposto (por exemplo `auth.fn_rbac__*`, `auth.fun_auth__switch_tenant`), e isso anula a allowlist `postgrestRpcs` de `src/lib/server/resources.ts`. Hoje a RLS e as funções se defendem (o anon recebe `not authorized` em `fn_rbac__tenant_users`), mas a superfície fica toda nas mãos de cada GRANT.
- **Correção:** remover a rota ou exigir que `schema.functionName` esteja numa allowlist.
- **PLAUSÍVEL.**

#### F6 — Baixo — Funções SECURITY DEFINER sem `SET search_path`
- **Arquivos:** `plugins/messaging/0001_messaging.sql:153,221,267,306,320` (`fun_msg_is_participant`, `fn_msg_start_conversation`, `fn_msg_send_message`, `fn_msg_mark_read`, `fn_msg_list_conversations`); `plugins/demandas/0001_demandas.sql` (`fun_demanda_is_cliente`, `fun_demanda_prestador_respondeu`); `plugins/pedidos/0001_pedidos.sql` (`fun_pedido_is_participant`); `plugins/reviews/0001_reviews.sql` (`fn_review_moderation_request`). As de login/signup em `sql/0008`/`0010` foram corrigidas depois em `0105`/`0107`.
- **Risco:** search_path hijacking se algum papel tiver CREATE em um schema do path. Todas usam `auth.fun_auth_user_id()` do JWT, não um id vindo do usuário.
- **Correção:** `ALTER FUNCTION … SET search_path = public, auth, pg_temp`.
- **PLAUSÍVEL.**

#### F7 — Baixo — Nenhuma tabela usa `FORCE ROW LEVEL SECURITY`
- Todas as tabelas de dados têm `ENABLE ROW LEVEL SECURITY`, mas nenhuma tem `FORCE`, então o dono da tabela (o papel que roda as migrations) passa por cima da RLS. Hoje isso afeta só scripts e conexões diretas. `auth.groups` (`sql/0007:174`) não tem RLS, mas também não tem GRANT para `anon`/`auth_user`.
- **Correção:** `ALTER TABLE … FORCE ROW LEVEL SECURITY` nas tabelas sensíveis.

#### F8 — Baixo — `/api/agenda/cities` interpola `uf` sem codificar na URL do IBGE
- **Arquivo:** `src/app/api/agenda/cities/route.ts:9-17`. O host é fixo (servicodados.ibge.gov.br), então não é SSRF para a rede interna, só manipulação de path/query no IBGE.
- **Correção:** validar com `/^[A-Z]{2}$/`.
- **PLAUSÍVEL.**

---

#### O que foi verificado e está OK
- **SSRF:** nenhum `fetch` do servidor usa URL controlada pelo usuário. `/api/images/optimize` só aceita multipart (`requireAuth` padrão `true`, `kizuna-core/src/server/image/index.ts:95-99`). `cep` é normalizado para 8 dígitos. `location/reverse` valida lat/lng. `location/ip` tem `isPublicIp` e `encodeURIComponent`. Os provedores de IA (Anthropic/Gemini), o captcha, o OAuth do Google e a busca de endereço usam endpoints constantes.
- **PostgREST no browser:** `POSTGREST_URL`, `PGRST_JWT_SECRET` e `POSTGREST_SERVICE_TOKEN` não são `NEXT_PUBLIC_*`. As únicas `NEXT_PUBLIC_*` são `UI_STYLE` e `TURNSTILE_SITE_KEY`.
- **Rotas admin/root:** `storage/admin` (`requireRoot` com `session.is_root`), todas as `ai/*` (`requireAiRoot`) e `pages/revalidate` (`is_root`).
- **CRUD genérico** (`kizuna-core/src/server/postgrest-crud.ts`): allowlist de recursos (404 fora dela), escritas exigem sessão `auth_user` e repassam o JWT do usuário, então a RLS decide.
- **RLS dono/objeto** (sem IDOR pelas policies): `service_user_favorites` (user_id = me), `user_data`, `form_results`, `service_categories_sub`/`service_addresses` (dono via services), `tickets` (insert com `created_by`/`owner_email` do JWT, update só staff), `messaging` (participante ou `messaging.manage`), `files` insert/update (uid = me), `forms`/`pages`/`system_config` (escrita com permissão), RBAC (`user_roles`, `role_grants`, `user_tenant_permissions` filtram por tenant e permissão, `fun_auth_can_assign_role`).
- **Anon no PostgREST (teste):** `ai_credentials`, `user_data`, `tickets`, `notifications` → `permission denied`; `tenants` e `reviews` → `[]`; `services` só `status=active`.
- **RPCs sensíveis para anon** (`external_login`, `otp_*`, `password_reset_*`) exigem o claim `purpose`. Teste: `external_login` → `42501 external_login_forbidden`.
- **Rota pública de arquivo:** valida UUID e só serve `active=true` (o problema de escopo está descrito em F4).

### A02, A03 e A08 — Configuração, segredos, supply chain e integridade

Observação: http://localhost:3000 está servindo um app **Vite** (HTML com /@vite/client, 200 para qualquer rota), não o Next.js deste repo. Os probes dinâmicos não valem para este projeto; achados abaixo são de análise estática. gitleaks não instalado — feito grep no `git log -p --all` dos dois repos.

#### Achados

1. **Alto — PostgreSQL publicado na porta 5432** — deploy/postgres-postgrest/docker-compose.yml:17-18 (`"5432:5432"`). Cenário: em VPS sem firewall, o banco fica acessível na internet (força bruta na senha do `postgres`). Fix: remover `ports` ou `127.0.0.1:5432:5432`. CONFIRMED (config).
2. **Médio — PostgREST exposto no host em todas as interfaces** — docker-compose.db.yml:35-36 (`${PGRST_PORT:-3001}:3000`) e Postgres em :12. Cenário: compose "dev" usado em servidor deixa a API do banco (role anon) e o DB públicos, contornando rate-limit/captcha do Next. Fix: bind `127.0.0.1:`. PLAUSIBLE (depende do uso).
3. **Médio — Sem Content-Security-Policy** — next.config.ts:19-20 (comentário: CSP não entra por default). Cenário: qualquer XSS (ex. sanitizeDescriptionHtml em kizuna-core/src/client/components/services/detail/ad-description.tsx:147) executa sem barreira; scripts de terceiros (AdSense, GSI, Turnstile) sem controle. Fix: CSP com nonce em Report-Only → enforce, allowlist pagead2.googlesyndication.com, accounts.google.com, challenges.cloudflare.com. CONFIRMED.
4. **Médio — Mensagens do PostgREST repassadas ao cliente** — src/app/api/postgrest/rpc/route.ts:13-21 e ~76 (`message`/`details`/`hint` do PostgREST devolvidos); kizuna-core/src/server/storage-admin.ts:206 (`error.message`). Cenário: vaza nomes de função/tabela/constraint e erros SQL (enumeração de schema). Também: `schema` vem livre do body (:51), permitindo chamar RPC em `auth` se exposto (PGRST_DB_SCHEMAS=public,auth). Fix: logar detalhe no servidor, retornar mensagem genérica; allowlist de schema = public. CONFIRMED (código), não probado.
5. **Médio — Imagens com tag flutuante `latest`** — deploy/cloudbeaver/docker-compose.yml:3 (`dbeaver/cloudbeaver:latest`), deploy/postgres-postgrest/docker-compose.yml:26 (`postgrest/postgrest:latest`). Cenário: supply chain / quebra silenciosa em redeploy. Fix: pinar versão (ideal digest). CONFIRMED.
6. **Baixo — .env.example com segredo JWT "real-looking"** — .env.example:6 (`PGRST_JWT_SECRET=(valor de exemplo)`, valor de exemplo conhecido também no histórico). Cenário: quem copia o .env sem trocar fica com HS256 previsível → forja de JWT de qualquer role. Fix: deixar vazio + validar no boot (recusar o valor de exemplo / < 32 bytes). CONFIRMED.
7. **Baixo — Grafana user default `admin`** — deploy/observability/docker-compose.yml:38; .env.example de observability com senha placeholder ("...orte"). Senha é obrigatória (`:?`), sign-up e anônimo desligados — ok. Fix: sem default de usuário. CONFIRMED (baixo impacto).
8. **Baixo — Detalhe de role no 403** — src/app/api/postgrest/rpc/route.ts:36 (`Role atual: ...`). Info leak menor. CONFIRMED.
9. **Baixo — Scripts de terceiros sem SRI** — kizuna-core/src/client/ads/google-ad.tsx:18, components/auth/google-one-tap.tsx:6, captcha/turnstile-widget.tsx:34. SRI não é viável (scripts versionados pelo provedor); mitigar via CSP (item 3). CONFIRMED.
10. **Baixo — Faixas `^` em lib de segurança** — package.json:15 `jsonwebtoken ^9.0.3` (mitigado por package-lock.json commitado). Fix: `npm ci` no build (verificar Dockerfile) e pin exato. PLAUSIBLE.

#### Segredos (histórico)
Nenhum segredo real encontrado nos dois repos. Ocorrências são placeholders/testes: `(valor de exemplo)` (.env.example), `troque-por-uma-senha-forte`, `troque_esta_senha`, `sk-ant-abcd1234`/`sk-ant-segredo` (testes de cripto), `segredo-de-teste-com-32-caracteres!!`, `TURNSTILE_SECRET_KEY=...AAAA` (doc de teste da Cloudflare). Nenhum `.env` real jamais commitado (`git log --all -- .env` vazio). Recomendado rodar gitleaks de verdade para confirmação.

#### A08 Integridade
- Sem `eval`, `new Function`, `yaml.load` em src/ e kizuna-core/src (fora de testes).
- `dangerouslySetInnerHTML` apenas em JSON-LD (src/lib/anuncio-detail.tsx:80,83 via `jsonLdScript`, que deve escapar `</`) e descrição sanitizada — revisar sanitizer com casos de bypass.
- Não há `.github/` (sem CI) em nenhum dos repos → sem risco de pull_request_target/segredos em workflow.

#### OK
- Headers: nosniff, X-Frame-Options SAMEORIGIN, Referrer-Policy, HSTS preload, Permissions-Policy.
- Nenhum `Access-Control-Allow-Origin` nas rotas de API (sem CORS aberto).
- Rota RPC exige sessão + role auth_user e valida nome de função com regex.
- Lockfiles commitados (package-lock.json, kizuna.lock); Node 22 (LTS ativo) no Dockerfile; next 16.2.6 e react pinados.
- docker-compose.yml do app, Loki, Grafana e CloudBeaver sem `ports` (só rede interna); PostgREST de produção sem ports; Grafana com senha obrigatória, sem signup/anônimo; Loki/Grafana/Alloy pinados.
- docker-compose.db.yml exige POSTGRES_PASSWORD e PGRST_JWT_SECRET (`:?`).

### A04 e A07 — Criptografia e autenticação

Data: 2026-10-18. Auditoria só de leitura. Nenhum arquivo do projeto foi alterado e nenhuma conta foi criada.

**Sondagem ao vivo:** não foi possível fazer. Em `localhost:3000` (IPv4 e IPv6) responde um app Vite/SPA, não o Next: `POST /api/auth/login` dá 404 vazio e `GET /api/auth/me` devolve `text/html`. As portas 3001-3006, 3010 e 4000 não responderam. Os achados abaixo vêm da leitura do código e do `.env` (só tamanhos e comparações, nenhum valor foi impresso).

#### Achados

##### 1. Crítico: o segredo do JWT no `.env` é o valor público do `.env.example` (CONFIRMED)
- `.env` → `PGRST_JWT_SECRET` é idêntico ao de `.env.example:6`, com 37 caracteres. `kizuna-core/src/server/auth.ts:21-28` não valida força nem rejeita esse valor conhecido.
- **Cenário:** quem conhece o repositório assina um HS256 com `{user_id, tenant_id, is_root:true, perms}`, coloca no cookie `session` e vira root. O mesmo token também vale direto no PostgREST, que usa o mesmo segredo. Se `APP_ENCRYPTION_KEY` faltar, ela também é derivada desse segredo (`app-crypto.ts:24`).
- **Correção:** gerar um segredo aleatório com 32 bytes ou mais. No boot (`checkKizunaEnv` / `getJwtSecret`), recusar segredo com menos de 32 caracteres ou igual ao do exemplo. Rotacionar o segredo em qualquer ambiente que já tenha usado esse valor.

##### 2. Alto: a troca de senha via reset não revoga as sessões (CONFIRMED)
- `kizuna-core/sql/0112_password_reset.sql:146-148`: o `UPDATE auth.users SET password=...` não mexe em `sessions_revoked_at`. O JWT dura 7 dias (`auth.ts:31`).
- **Cenário:** a vítima percebe a invasão e redefine a senha. O atacante continua logado por até 7 dias.
- **Correção:** fazer `sessions_revoked_at = now()` no mesmo UPDATE. Fazer o mesmo em qualquer troca de senha autenticada.

##### 3. Médio: o logout não revoga o token, não há refresh nem rotação, e o JWT vale 7 dias (CONFIRMED)
- `auth-handlers.ts:523-539` só apaga o cookie. O JWT continua válido no PostgREST e em qualquer lugar até o `exp`. Não existe `jti` nem denylist.
- A revocação de `proxy.ts:87-101` só funciona quando há `POSTGREST_SERVICE_TOKEN` e falha aberta: com erro no banco, a sessão é aceita, e o cache é de 60 s.
- **Correção:** sessão mais curta (por exemplo 1 h) com refresh rotativo, ou `jti` com denylist. No logout, gravar a revogação.

##### 4. Médio: o IP do cliente vem de `X-Forwarded-For` sem proxy confiável, então o lockout por IP é contornável (CONFIRMED no código, sem teste ao vivo)
- `auth-handlers.ts:53-57`, `password-reset.ts` (`clientIp`) e `otp-handlers.ts:27`: usam o primeiro valor do XFF, que o cliente controla.
- **Cenário:** password spraying em muitas contas trocando o XFF a cada request. A chave por IP nunca acumula falhas, e não existe rate-limit por IP no starter (não achei `auth-rate-limit` em `src/`).
- Efeito colateral: a chave por login permite travar a conta de qualquer pessoa (DoS), com até 2 h após 20 falhas.
- O lockout fica em memória (`login-lockout.ts:94`): some no restart e não é compartilhado entre instâncias.
- **Correção:** derivar o IP do último hop confiável (`TRUSTED_PROXY_HOPS`) ou do `request.ip` da plataforma. Usar um limiter distribuído (Redis/PG). Para a chave por login, preferir atraso progressivo ou captcha em vez de bloqueio duro.

##### 5. Médio: captcha desligado por padrão e com fail-open (CONFIRMED)
- `captcha.ts:24-30`: sem as chaves, o captcha fica desligado. O `.env` atual não tem `TURNSTILE_*`.
- `captcha.ts:67-71`: erro de rede ou timeout é aceito como sucesso.
- **Correção:** em produção, exigir as chaves (falhar no boot) e trocar o fail-open por fail-closed, ou por um limiter mais rígido enquanto o Turnstile estiver fora.

##### 6. Médio: política de senha fraca, mínimo de 6 caracteres e sem blocklist (CONFIRMED)
- `auth-handlers.ts:315`, `password-reset.ts:249` e `sql/0112_password_reset.sql:127`.
- O reset faz `.trim()` na senha (`password-reset.ts:244`). Se o cadastro não fizer o mesmo, senhas com espaço nas pontas ficam inconsistentes.
- **Correção:** mínimo de 8 caracteres com blocklist (top 100k ou HIBP k-anonymity), ou 15 sem blocklist, conforme NIST 800-63B-4. Aceitar até 64 caracteres ou mais. Não usar trim.

##### 7. Médio: enumeração de usuários (CONFIRMED no código)
- **Cadastro:** `auth-handlers.ts:374` devolve 409 "Ja existe conta com este email". É enumeração direta. Mitigar com captcha ou rate-limit, ou com fluxo "enviamos um e-mail".
- **Login por timing:** `sql/0110_login_checks_active.sql:37-43`. Usuário inexistente retorna sem rodar o `crypt` (bcrypt custo 10, uns 50-100 ms); usuário existente roda. As mensagens são iguais. Correção: rodar `crypt` contra um hash fictício quando o usuário não existe.
- **Esqueci a senha:** a mensagem é genérica, mas só conta existente envia e-mail de forma síncrona (`password-reset.ts:178-197`), o que muda o tempo de resposta e pode devolver **503** quando o envio falha. Correção: enviar em fila/assíncrono e sempre devolver 200.

##### 8. Médio: o código de verificação de e-mail tem 6 dígitos e não tem limite de tentativas (PLAUSIBLE)
- `email-verification.ts:81` (`randomInt`, 6 dígitos) e `plugins/onboarding/shell/src/app/api/onboarding/email/verify-code/route.ts:110-111`: comparação direta, sem contador, sem expiração própria do código e sem rate-limit. O link vale 24 h (`email-verification.ts:23`).
- **Cenário:** um usuário logado testa 10^6 códigos para "verificar" um e-mail que não é dele. O e-mail verificado também pesa no vínculo com o Google (`0113:282-286`).
- **Correção:** no máximo 5 tentativas por código, TTL de 15 min e comparação em tempo constante.

##### 9. Baixo: o mesmo segredo HS256 serve para tudo
- O mesmo segredo assina a sessão, os tokens `purpose` (`session-issue.ts:46`), os cookies de state/nonce do OAuth (`oauth-handlers.ts:42,373`) e o JWT do PostgREST.
- `verifySession` (`auth.ts:59`) não confere tipo, `aud` nem `iss`. O payload do cookie de state não tem `user_id`, então o proxy o descarta, mas a separação depende só do formato do payload.
- **Correção:** usar `aud`/`typ` por finalidade e checar no verify, ou derivar uma chave por finalidade com HKDF.

##### 10. Baixo: AES-GCM das credenciais de IA sem comprimento fixo de tag e com salt fixo no scrypt
- `ai/credentials.ts:53-54`: `setAuthTag` sem `authTagLength: 16`. Assim o Node aceita tags curtas, o que facilita forjar o texto cifrado.
- `ai/credentials.ts:36`: o salt do scrypt é fixo, o que é aceitável para uma chave que vem do ambiente.
- Sem AAD: um ciphertext pode ser trocado entre linhas/providers.
- **Correção:** `createDecipheriv(..., { authTagLength: 16 })`, rejeitar tag com tamanho diferente de 16 e usar `setAAD(provider)`. Vale o mesmo para `app-crypto.ts:54`.

##### 11. Baixo: CSRF, só o SameSite=Lax protege (PLAUSIBLE, risco baixo)
- Não há verificação de `Origin`/`Sec-Fetch-Site` nas rotas POST/PATCH com cookie. O cookie é `HttpOnly` + `SameSite=Lax` + `Secure` em produção (`auth.ts:47-55`). Lax bloqueia POST cross-site, mas não protege contra subdomínios do mesmo site, nem contra rotas GET que mudem estado.
- **Correção:** checar `Origin` no `proxy.ts` para métodos que não sejam GET (defesa em profundidade).

#### O que está OK
- **Hash de senha:** pgcrypto `crypt` com `gen_salt('bf', 10)` (bcrypt custo 10, `0107`/`0112:147`), com `search_path` fixado. Subir para 12 é opcional.
- **JWT:** `algorithm: 'HS256'` explícito na assinatura, com `exp` de 7 d. A sessão fica em cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção, não em localStorage.
- **Token de reset:** `randomBytes(32)` em base64url. No banco fica só o SHA-256. É de uso único (queima todos os tokens pendentes do usuário), tem TTL de 60 min (limitado entre 5 e 1440) e exige conta ativa e não excluída. A RPC exige o claim `purpose` assinado pelo servidor. O token vai no **fragmento `#`**, então não vaza por Referer nem por log. Há throttle no pedido e no confirm.
- **Exclusão de conta:** grava `sessions_revoked_at` (`delete-account.ts:46`), e o proxy derruba a sessão e o cookie.
- **Google/One Tap:** assinatura RS256 conferida via JWKS, com checagem de `iss`, `aud == clientId`, `exp`, `nonce` (em cookie assinado) e `sub`. No fluxo de código há `state` + PKCE. O vínculo por e-mail **exige `email_verified`** (`0113:276-279`). Há proteção contra pre-hijack: se a conta local não tinha e-mail verificado, a senha é zerada e as sessões são revogadas.
- **OTP de telefone:** guarda só o hash do código, com expiração, até 5 tentativas e limite diário.
- **AES-GCM:** IV aleatório de 12 bytes a cada cifragem (`credentials.ts:40`, `app-crypto.ts:41`). A chave vem do ambiente (32 bytes base64 ou scrypt). `app-crypto` usa AAD por finalidade e tem expiração.
- **Login:** mensagem genérica de "Credenciais invalidas", lockout progressivo por login e por IP, e conta inativa não autentica nem com a senha certa.

### A05, A06, A09 e A10 — Injeção, design, logs e exceções

#### Achados

##### 1. [Alto] XSS armazenado via JSON-LD (`</script>` sem escape): PLAUSÍVEL (confirmado no código)
- kizuna-core/src/server/seo/build.ts:72-74 (`jsonLdScript` = `JSON.stringify`), usado em src/lib/anuncio-detail.tsx:80,83
- Cenário: anunciante põe no título (ou nome do prestador/categoria) `</script><img src=x onerror=alert(1)>`. `JSON.stringify` não escapa `<`, então o HTML sai do `<script type=application/ld+json>` e o código roda na página pública do anúncio. `name`/`providerName` não passam por `stripHtml`, e o próprio `stripHtml` (build.ts:33) remove só tags completas.
- Correção: `JSON.stringify(data).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')`.

##### 2. [Alto] Open redirect / XSS por `javascript:` no `returnTo` do login social: PLAUSÍVEL (confirmado no código)
- kizuna-core/src/client/components/auth/oauth-client.ts:15-16 (`resolveReturnTo` aceita `returnTo` sem validar) → :22-26 `window.location.assign(target)`; também google-one-tap.tsx:73,83
- Cenário: `/login?returnTo=javascript:alert(document.domain)` ou `?returnTo=https://evil.tld`. A vítima entra pelo popup OAuth ou pelo One Tap, e `goAfterLogin` executa o JS ou manda para o site externo. O servidor (`sanitizeReturnTo`, app-url.ts:18) e o login-page.tsx:53 validam o valor; esse caminho do cliente não valida.
- Correção: passar `fromQuery` (e `explicit`) por uma validação igual à `sanitizeReturnTo` (começa com `/`, não `//` nem `/\`, sem CR/LF).

##### 3. [Alto] Upload sem allowlist de MIME e conteúdo servido inline na mesma origem: PLAUSÍVEL
- kizuna-core/src/server/storage-service.ts:221 (MIME vem do cliente, `file.type`); src/app/api/public/storage/files/[id]/content/route.ts:76-84 (`Content-Type: <mime gravado>` + `Content-Disposition: inline`, público)
- Cenário: usuário logado sobe `x.html` como `text/html` ou um `image/svg+xml` com `<script>`. O sharp não otimiza SVG/HTML, então o arquivo fica intacto e roda na origem do site ao abrir `/api/public/storage/files/<id>/content`. O `nosniff` global não ajuda, porque o tipo declarado já é perigoso.
- Correção: allowlist (jpeg/png/webp/avif/gif/pdf) checada por magic bytes, recusar SVG/HTML; servir não-imagem com `attachment`; `Content-Security-Policy: default-src 'none'; sandbox` na rota de conteúdo; codificar o filename (RFC 5987), porque um nome com caractere não-Latin1 pode derrubar o `new Response`.
- Não testei upload no localhost para não gravar dados.

##### 4. [Médio] Injeção de filtro PostgREST na busca do CRUD genérico: PLAUSÍVEL
- kizuna-core/src/server/postgrest-crud.ts:165-169
- Cenário: só o `*` é removido. Com `,` `)` `(` no `search` dá para fechar o `or=(...)` e acrescentar filtros arbitrários (ex.: `x*,id.gt.0,role.eq.admin`), o que permite enumerar colunas não pesquisáveis. O RLS ainda limita as linhas visíveis.
- Correção: aspas duplas no valor (`col.ilike."*${v.replace(/["\\]/g,'\\$&')}*"`) ou RPC com parâmetro.
- Ponto parecido: prompt-store.ts:104 interpola `categoryId` (tipado como number, risco baixo se for coerced).

##### 5. [Médio] Captcha fail-open: CONFIRMADO no código
- kizuna-core/src/server/captcha.ts:68-71: um erro de rede/timeout ou um `res.json()` com resposta não-JSON (5xx da Cloudflare) devolve `{ok:true}`.
- Cenário: numa instabilidade do Turnstile, o registro e o "esqueci a senha" (auth-handlers.ts:130,330) ficam sem proteção contra bots.
- Correção: fail-closed no registro (ou fail-open só com rate-limit por IP ativo) e checar `res.ok` antes do parse.

##### 6. [Médio] Sem rate-limit no signup e no fn_ad_track / fn_analytics_track
- auth-handlers.ts (register): nenhum `checkRateLimit`, só captcha (que pode estar desligado ou em fail-open).
- db/public.sql:4891 `fn_ad_track` e :4687 `fn_analytics_track` com GRANT para `anon`, sem deduplicação/janela visível: impressões e cliques de anúncio podem ser inflados.
- O rate-limit e o lockout (ai/rate-limit.ts, login-lockout.ts) ficam em memória, por instância: com mais de uma réplica, o limite real se multiplica pelo número de réplicas.
- Correção: limitar por IP no signup; dedupe por (ad, ip/sessão, janela) no SQL; store compartilhado (Redis/PG).

##### 7. [Baixo] Corpo multipart lido inteiro antes da checagem de tamanho
- kizuna-core/src/server/image/index.ts:103-106 (`request.formData()` antes de `file.size > maxBytes`, limite 20 MB); o mesmo vale para storage. Sem limite de pixels explícito no sharp (o padrão de 268 MP fica valendo).
- Correção: checar `Content-Length` antes, e usar `sharp(input,{limitInputPixels: 40e6})`.

##### 8. [Baixo] PII em log
- kizuna-core/src/server/email/index.ts:58-61 loga `to` (e-mail em claro). auth-handlers.ts:367 loga `signupErrorDetails` do Postgres, que costuma trazer `Key (email)=(fulano@...)`, desfazendo o mascaramento.
- Correção: logar `maskEmail(to)` e omitir `details`.

#### O que está OK
- `sanitizeDescriptionHtml` (ad-description.tsx:65): reconstrói só tags da allowlist, sem atributos, href só http/https/mailto, sem aspas nem controle, e escapa o texto. Não achei bypass (entidades no href ficam dentro de atributo entre aspas; `<` solto é escapado).
- Markdown via `react-markdown` sem `rehype-raw`; `img` desligado.
- `sanitizeReturnTo` no servidor (OAuth start) e o `returnTo` do login-page.tsx validados.
- Lockout progressivo no login; rate-limit no contato/tickets e nas rotas de IA.
- Captcha com timeout de 5 s; a busca de endereço já trata a ausência da chave.
- Headers globais: nosniff, X-Frame-Options, HSTS, Referrer-Policy.
- Logs de auth usam e-mail mascarado (forgot/register); há eventos de auth logados (forgot, duplicate_email, onetap_invalid_token).
- SQL dinâmico: `EXECUTE` em auth.sql:2723 usa `$1` parametrizado; `format('%s')` só em seeds e GRANT de sequência (sem entrada de usuário). Não achei `child_process`.

#### Limitações
- Nenhum achado foi explorado ao vivo, para não criar anúncio nem upload no banco (fora do escopo não-destrutivo). O servidor localhost:3000 respondeu 200 em /login.
- Não revisei deploy/observability nem todas as funções SQL `SECURITY DEFINER`.
