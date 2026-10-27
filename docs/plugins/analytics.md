# Plugin `analytics`

Métricas de negócio por anúncio, first-party e sem cookie. Com `collect.ip` desligado não há dado
pessoal; com ele ligado (padrão), o IP do acesso é gravado cifrado e passa a ser dado pessoal: ver
[Dado sensível e LGPD](#dado-sensivel-e-lgpd). Uma tabela (`analytics_events`), a função
`fn_analytics_track` (cliente antigo) e a `fn_analytics_track_ctx` (rota nova, só servidor); sem
views, rollup ou trigger.

## Como funciona

1. O cliente (`useTrackView` / `trackEvent`) decide quando um evento conta — tempo mínimo em
   milissegundos, fração visível, aba em foco, uma vez por sessão — e envia
   `POST /api/analytics/track` com o tipo de aparelho. O servidor acrescenta região e IP (dos headers)
   e grava pela `fn_analytics_track_ctx` (ver [Rota](#rota-apianalyticstrack)). A RPC antiga
   `POST /api/resources/fn_analytics_track` continua para clientes antigos, mas grava sem contexto.
2. O banco valida por CHECK/RLS/UNIQUE: piso de tempo (`view` 500 ms, `impression` 200 ms), anúncio
   ativo, dono não conta, no máximo 1 linha por visitante/anúncio/evento/dia.
3. O painel lê `GET /api/resources/analytics_events` (RLS = anúncios do tenant) e agrega no
   cliente com `fetchOwnerStats(days)`.

Colunas de `analytics_events`: `entity_type`, `entity_id`, `event_type`, `source`, `visitor_hash`,
`visible_ms`, `day`, `created_at` e, preenchidas só pela rota nova (todas anuláveis): `device`
(`mobile`, `tablet` ou `desktop`), `region_city`, `region_uf`, `ip_masked`, `ip_key` e `ip` (cifrado).

## Configuração (`kizuna.config.json` → `analytics`)

| Campo | Efeito |
|---|---|
| `enabled` | `false` desliga a coleta |
| `events.<evento>.minVisibleMs` | milissegundos contínuos em tela antes de contar; `0` = na hora |
| `events.<evento>.minVisibleRatio` | fração do elemento visível (0..1) |
| `events.<evento>.oncePerSession` | conta no máximo 1x por sessão |
| `entities.<tipo>.events.<evento>` | sobrescreve por tipo de entidade |

Eventos: `impression`, `view`, `contact_click`, `favorite`, `share`. Teto de `minVisibleMs`: 60000.

## Configuração `collect`

Bloco opcional que diz o que o servidor grava junto de cada evento. Ausente = os padrões abaixo.

```json
"collect": { "device": true, "region": true, "ip": true, "encryptIp": true, "ipRetentionDays": 30 }
```

| Campo | Padrão | Efeito |
|---|---|---|
| `device` | `true` | grava o tipo de aparelho (`mobile`, `tablet`, `desktop`) |
| `region` | `true` | grava cidade e UF aproximadas, derivadas do IP (só Brasil) |
| `ip` | `true` | grava o IP do acesso (cifrado quando `encryptIp` está ligado; ver abaixo) |
| `encryptIp` | `true` | cifra o IP com `APP_ENCRYPTION_KEY` |
| `ipRetentionDays` | `30` | dias até zerar o IP gravado; `0` = nunca zera; inteiro >= 0 |

Valor inválido cai no padrão. Mudar `collect` vale para os eventos novos; o que já foi gravado fica.
O prazo `ipRetentionDays` é lido pelo job do banco, não pelo app: ver [Retenção](#retencao).

## Pré-requisitos

- **`POSTGREST_SERVICE_TOKEN` é obrigatório** para registrar eventos: a rota grava com o papel
  `service_role` (`node kizuna-core/cli token service`). Os outros docs do core chamam o token de
  opcional; para o analytics não é. Sem ele a rota responde 200 com `tracked` falso e avisa **uma vez**
  no log do servidor (`POSTGREST_SERVICE_TOKEN não configurado`).
- A migração `0003` aplicada. Sem a função `fn_analytics_track_ctx` (RPC 404) acontece o mesmo,
  com aviso único pedindo para aplicar a migração 0003.
- `APP_ENCRYPTION_KEY` definida, se `encryptIp` estiver ligado.

## Rota no projeto

O core só exporta o handler; a rota existe no projeto, em `src/app/api/analytics/track/route.ts`:

```ts
import { createAnalyticsTrackHandler, getSession } from '@kizuna/core/server';
import { analyticsConfig } from '@/lib/analytics';

export const runtime = 'nodejs';

async function getViewerId(): Promise<string | null> {
  try { return (await getSession())?.user_id ?? null; } catch { return null; }
}

export const POST = createAnalyticsTrackHandler({ config: analyticsConfig, getViewerId });
```

**Projeto que atualiza o core precisa criar esse arquivo**, senão o cliente novo recebe 404 e nenhum
evento é gravado. O template do core (`kizuna-core/starter`) traz só configuração, sem rotas de API.

## Dispositivo, região e IP

- **Dispositivo:** o cliente classifica o aparelho e envia `mobile`, `tablet` ou `desktop`; o servidor
  só aceita esses três valores.
- **Região:** cidade e UF aproximadas. Primeiro os headers da plataforma (Vercel:
  `x-vercel-ip-city` e `x-vercel-ip-country-region`; Cloudflare: `cf-ipcity` e `cf-region-code`),
  sem chamada externa; sem eles, consulta o ip-api.com. Só vale Brasil (país BR e UF de 2 letras);
  qualquer falha grava o evento sem região.
- **IP:** (cifrado quando `encryptIp` está ligado; com `encryptIp` falso o IP normalizado fica em claro na coluna `ip`, que continua fora do SELECT da API) vem do header `x-forwarded-for` (ou `x-real-ip` quando não há `x-forwarded-for`) e só é
  gravado se for IP público válido. Em desenvolvimento, sem proxy, o IP é local e o evento fica sem
  IP e sem região.

## Rota `/api/analytics/track`

`POST /api/analytics/track`, corpo JSON de até 4 KB (aceita `text/plain`, que é como o
`sendBeacon` envia): `p_entity_type`, `p_entity_id`, `p_event_type`, `p_visitor_hash`,
`p_source`, `p_visible_ms` e `p_device`. O cliente não envia IP, região nem usuário: o servidor
descobre. A rota é pública (sessão opcional, só para o dono não contar o próprio anúncio).

| Resposta | Quando |
|---|---|
| 200 com `tracked` verdadeiro ou falso | processou; falso = já existia hoje, anúncio inativo ou falha tolerada |
| 204 | analytics ou aquele evento desligado na config |
| 400, 413, 415 | corpo inválido, maior que 4 KB, ou não é JSON |
| 429 | mais de 120 requisições por 60 s por IP (checado antes de ler o corpo) |

Falha de geolocalização, de cifra ou do banco nunca vira erro 5xx: o evento é gravado sem o dado que
falhou, ou responde `tracked:false`. O IP e o corpo de erro do banco nunca são logados. A escrita usa
`fn_analytics_track_ctx` (SECURITY DEFINER, só `service_role`), que repete as regras da policy de INSERT
(anúncio ativo, dono não conta) e transforma contexto inválido em NULL.

## `TRUSTED_PROXY_HOPS`

Variável de ambiente (inteiro >= 1, padrão 1; inválido vira 1): quantos proxies confiáveis
acrescentam ao `x-forwarded-for` antes de chegar no app. O IP do cliente é a entrada nessa posição
contada **da direita** (1 = a última, a que o proxy mais próximo acrescentou); as da esquerda o
cliente pode forjar. Com uma entrada só (Vercel e Cloudflare sobrescrevem o header) vale essa
entrada. Se o salto escolhido não for IP público válido, o evento é gravado sem IP e sem região.

Exemplo: app atrás de um CDN e de um balanceador próprio, e cada um acrescenta um IP:
`TRUSTED_PROXY_HOPS=2`. Valor maior que o real é inseguro (aceita IP forjado); menor grava o IP do proxy.

## Limites do ip-api e do `x-forwarded-for`

- **ip-api.com (plano gratuito):** só HTTP (sem TLS: o IP do visitante trafega sem cifra até lá),
  cerca de 45 consultas por minuto por IP de origem do servidor, e uso comercial exige plano pago.
  O app usa timeout de 1,5 s, cache em memória por IP (10 min, até 5000 entradas) e um circuit
  breaker: ao receber 429 ou `X-Rl: 0`, pausa o ip-api pelo tempo de `X-Ttl` (padrão 60 s) e,
  nesse tempo, os eventos entram sem região. Em Vercel ou Cloudflare os headers da plataforma
  dispensam o ip-api. Para volume alto, usar esses headers ou um plano pago.
- **`x-forwarded-for`:** é só um header; qualquer cliente pode mandar o dele. Só vale a entrada
  acrescentada por proxy confiável (`TRUSTED_PROXY_HOPS`). Sem proxy confiável na frente, o IP
  gravado pode ser forjado. VPN, rede móvel com NAT e proxies corporativos fazem vários visitantes
  dividirem o mesmo IP, e a região é aproximada (muitas vezes a da operadora).

## Dado sensível e LGPD

O IP é dado pessoal (LGPD, Lei 13.709/2018). O que o plugin faz para reduzir o risco:

- **IP cifrado:** com `encryptIp` ligado, o IP vai para `analytics_events.ip` cifrado com AES-256-GCM, usando
  `APP_ENCRYPTION_KEY` (propósito `analytics-ip`). **Perder ou trocar a chave torna os IPs já
  gravados ilegíveis**: faça backup da chave junto com os segredos do projeto.
- **`ip_masked`:** IP parcialmente oculto (o final não aparece); é o que o painel mostra.
- **`ip_key`:** HMAC-SHA-256 do IP (derivado da mesma chave). Serve só para agrupar acessos do mesmo
  endereço sem revelá-lo; não é reversível sem a chave.
- **Coluna `ip` fora do SELECT:** `anon` e `auth_user` não leem `ip` (GRANT de SELECT por coluna);
  nem o dono do anúncio nem a API de recursos devolvem o IP, só quem tem acesso ao banco e à chave.
- **Retenção:** zera `ip`, `ip_masked` e `ip_key` das linhas mais antigas que N dias (ver abaixo). A
  linha do evento, sem IP, segue até a limpeza geral de 400 dias.

### Retenção

Um job diário do `pg_cron` (03:25) lê a setting do Postgres `kizuna.analytics_ip_retention_days`:
ausente ou inválida = 30 dias; `0` = nunca zera. A CLI (`kizuna install` e `update`) **não** grava
essa setting a partir de `collect.ipRetentionDays`: aplique o prazo manualmente, uma vez por banco,
e repita se mudar o valor do config:

```sql
ALTER DATABASE nome_do_banco SET kizuna.analytics_ip_retention_days = '30';
```

A setting vale para conexões novas; o job lê a cada execução. Sem `pg_cron`, a migration só avisa:
agende por fora o `UPDATE` diário descrito no aviso (`ip`, `ip_masked` e `ip_key` viram NULL
onde `day` é anterior a hoje menos N dias).

### O que falta decidir (não é código)

- **Base legal** para tratar o IP (por exemplo legítimo interesse, com teste de proporcionalidade, ou
  consentimento) e **política de privacidade** que diga o que é coletado, para quê e por quanto tempo.
  Sem isso, desligue a coleta (`"ip": false` em `collect`).
- O IP que o login por código (OTP) grava em `auth` **não tem prazo** e está fora do escopo deste plugin.

## Como decifrar

Quem tem acesso ao banco e à `APP_ENCRYPTION_KEY` do app pode ler o IP de uma linha (por exemplo
numa apuração de abuso). Pegue o valor da coluna `ip` direto no banco e rode, na raiz do projeto
(Node 22.6 ou mais novo; a chave vem do ambiente ou do `.env`):

```bash
node --experimental-strip-types scripts/analytics-reveal-ip.mjs "<valor da coluna ip>"
```

Imprime só o IP; token inválido ou chave diferente da que cifrou sai com código 1 e sem imprimir nada
do token. Em código, `revealAnalyticsIp(token)` (de `@kizuna/core/server`) devolve o IP ou `null`.
Trate o resultado como dado pessoal: não registre em log nem cole em chat.

## Painel

Em `/painel/metricas` há três blocos, além dos números por anúncio: **dispositivos** (celular, tablet,
computador), **regiões** (cidade e UF) e **acessos por IP** (IP mascarado, acessos e visitantes-dia,
agrupados por `ip_key`). Aparecem só para quem tem a permissão `analytics/view` (o usuário root
sempre tem); nenhum papel recebe essa permissão por padrão. Eventos antigos, ou gravados pela RPC
antiga, não têm contexto e não entram nesses blocos.

## Verificação manual (dono do projeto)

A migration `0003_analytics_context.sql` ainda não foi aplicada em nenhum banco. Roteiro:

1. Faça backup, garanta `APP_ENCRYPTION_KEY` no `.env` e aplique com o comando de atualização do
   projeto (`node kizuna-core/cli update`). Confira em `auth.plugin_registry` que `analytics` está na
   versão 2.2.0.
2. Defina o prazo: `ALTER DATABASE nome_do_banco SET kizuna.analytics_ip_retention_days = '30';`
3. Suba o app e pegue o uid de um anúncio ativo. Envie um evento simulando um visitante (sem proxy
   confiável a mais; o IP precisa ser público):

```bash
curl -i -X POST http://localhost:3000/api/analytics/track \
  -H "Content-Type: application/json" -H "X-Forwarded-For: 187.12.45.9" \
  -d '{"p_entity_type":"service","p_entity_id":"<uid do anuncio>","p_event_type":"view","p_visitor_hash":"0123456789abcdef0123456789abcdef","p_source":"direct","p_visible_ms":1500,"p_device":"mobile"}'
```

   Esperado: 200 com `tracked` verdadeiro. Repetir o mesmo comando no mesmo dia dá `tracked` falso.
4. No banco: `SELECT device, region_city, region_uf, ip_masked, ip_key, left(ip, 12) FROM analytics_events ORDER BY id DESC LIMIT 1;`
   Esperado: `device` = mobile, `ip_masked` e `ip_key` preenchidos, `ip` começando com `v1.` (ilegível).
5. Decifre a coluna `ip` com o script de [Como decifrar](#como-decifrar): deve sair 187.12.45.9.
6. Chame a RPC antiga (`POST /api/resources/fn_analytics_track`): a linha deve ser gravada sem contexto.
7. Entre como root, abra `/painel/metricas` e confira os três blocos (dispositivos, regiões, IPs).
8. Opcional: confirme que um usuário comum não lê o IP: `SET ROLE auth_user; SELECT ip FROM analytics_events LIMIT 1;` deve dar permissão negada.

## Uso no front

```tsx
// Server Component
import { TrackView } from '@kizuna/core/client/analytics';
import { trackRule } from '@/lib/analytics';

<TrackView entityType="service" entityId={service.uid} event="view" rule={trackRule('service', 'view')} source="search">
  {/* só o cabeçalho/hero do anúncio (bloco menor que a tela) */}
</TrackView>

// Client: clique de ação
import { trackEvent } from '@kizuna/core/client/analytics';
trackEvent({ entityType: 'service', entityId: uid, event: 'contact_click' });
```

A regra padrão de `view` exige `minVisibleRatio` 0.5 do elemento embrulhado: embrulhe só o bloco de cabeçalho/hero (menor que a altura da tela), nunca a página inteira — uma página mais alta que duas telas de celular nunca atinge a fração e a view não dispara.

## Origem (source) e contato

Toda ação carrega uma origem, gravada em `analytics_events.source`:

| Origem | Quando |
| --- | --- |
| `search` | clique num card da busca por texto |
| `category` | busca filtrada por grupo, categoria ou subcategoria sem texto livre |
| `home` | trilhas da home e do detalhe (valor padrão de `ServiceCarousel`) |
| `share` | link compartilhado (quem compartilha gera o link com a origem `share`) |
| `direct` | sem parâmetro, sem referrer interno |
| `other` | referrer interno desconhecido ou ação sem contexto (ex.: swipe) |

Como propagar:

- O link gerado por uma lista usa `withSource(href, origem)` (de `client/analytics`), que acrescenta o parâmetro `src` preservando query e hash e ignora URL absoluta.
- O detalhe lê `src` no client com `resolveAdSource(uid)`: parâmetro, depois valor guardado em sessionStorage, depois referrer interno, por fim `direct`. Cliques seguintes na mesma página reutilizam a origem guardada.
- `ServiceDetailPage` envolve a página em `AdTrackingProvider` quando recebe `analytics`; dentro dele, `useAdSource()`, `useTrackContact()` e `TrackedContactLink` dão origem e uid sem props.
- Links e botões de contato (WhatsApp, telefone, e-mail, site, ingresso, copiar valor) disparam o evento `contact_click` via `TrackedContactLink` ou `CopyValueButton`.
- Impressões em listas: `TrackView` (também exportado como `ImpressionTrack`) com a prop `source`; `ServiceCarousel` e `SearchResultsView` aceitam `impressionRule` e `source`.

## Decisões e limites

- **Uma função só:** `createResource` exige login e a maioria dos visitantes é anônima; por isso a
  escrita é uma RPC pública (`requiresAuth:false`, `optionalAuth:true`), no molde do `swipe`.
- **INVOKER + RLS:** `fn_analytics_track` roda com os privilégios de quem chama, então as policies
  valem. Usa `INSERT ... ON CONFLICT DO NOTHING` (sem alvo, pois `anon` não tem SELECT) e devolve
  `ROW_COUNT = 1` (`true` = registrou; `false` = já existia hoje). O INSERT direto é limitado por
  GRANT de colunas (sem `day`/`created_at`), mas anon/auth_user ainda podem inserir por fora da função, sob as mesmas policies/CHECK/UNIQUE.
- **Dedupe por dia:** `views` = visitantes-dia por anúncio; clique de contato repetido no mesmo dia
  conta 1. O `visitor_hash` é aleatório, gerado no navegador e trocado por dia UTC.
- **Anti-abuso:** um cliente malicioso pode inventar hashes; o custo é bloqueado só pelo piso de tempo,
  pelo UNIQUE e pela exigência de anúncio ativo. Filtro de bot é best-effort no cliente.
- **Volume:** a agregação lê até 20 páginas de 1000 linhas (ordem `id desc`). Se um anunciante
  passar disso, introduzir rollup (tabela mantida por job/trigger) num plano à parte.
- **Retenção da linha:** o `0001` agenda via `pg_cron`, se existir, `DELETE ... day < CURRENT_DATE - 400`. Sem
  `pg_cron`, agendar essa instrução por fora.
- **Métricas:** `ctr` pode passar de 100% (views sem impression, ex.: link direto); "visitantes únicos" = ids anônimos distintos por dia (visitantes-dia), próximo de views.
- **Limites conhecidos (contexto):** o recurso `analytics_events` não tem portão por permissão além da RLS do tenant: qualquer usuário autenticado do tenant lê `ip_masked`, `ip_key`, região e dispositivo pela API (o `ip` cifrado não). O `ip_key` é um HMAC global, então liga o mesmo IP entre dias e entre tenants. Restringir isso é decisão em aberto do dono. Além disso, 120 req/min por IP pode descartar eventos de visitantes atrás de IP compartilhado (CGNAT).
- **Limites conhecidos:** a exclusão do dono usa `created_by`, mas a leitura é por tenant — outros membros do mesmo tenant contam como visitantes; a paginação por offset em `id desc` pode contar em dobro linhas de fronteira acima de 1000 linhas.
- **Fuso:** `day` usa `CURRENT_DATE` do banco; as janelas do cliente usam UTC. Rodar o banco em UTC.
- **Dependência:** as policies referenciam `public.services` (plugin `services`).

## Novo tipo de entidade

1. Incluir o tipo no CHECK `analytics_events_entity_chk` e replicar as policies de INSERT/SELECT para
   o dono dessa entidade (migration nova).
2. Passar o novo `entityType` ao `TrackView`/`trackEvent`.
