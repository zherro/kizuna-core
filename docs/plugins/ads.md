---
description: Plugin ads - espaços de publicidade com criativos próprios (imagem/GIF) e Google AdSense, sorteio por peso e métricas diárias por espaço, criativo e página.
---

# Plugin `ads`

Espaços de publicidade (slots) no app público. Cada espaço pode exibir um criativo próprio
(imagem ou GIF) ou um anúncio Google AdSense, sorteados por peso. Métrica first-party, sem cookie e
sem dado pessoal: contadores diários por espaço, criativo e página. Três tabelas e uma função
(`fn_ad_track`).

Spec do desenho (no projeto starter):
`docs/superpowers/specs/2026-10-13-publicidade-slots-google-e-proprios-design.md`.

## Como funciona

1. O catálogo de espaços vive no código (`AD_SLOT_CATALOG`, em `src/shared/ads/catalog.ts`). A
   tabela `ad_slots` guarda só a configuração de cada espaço (ligado, mídias, peso do Google,
   unidade, rotação).
2. O componente `<AdSlot slot="..." />` (`@kizuna/core/client/ads`) busca uma vez por carga de
   página os espaços habilitados e os criativos vigentes (`GET /api/resources/ad_slots` e
   `ad_creatives`; a RLS já filtra o que o visitante pode ver).
3. No navegador, `buildCandidates` monta a lista de candidatos (criativos próprios que servem ao
   espaço e, se permitido, o Google) e `pickWeighted` sorteia um pelo peso. Sem candidato, o espaço
   não ocupa lugar nenhum.
4. A impressão conta quando 50% do espaço fica à vista por 1 segundo; o clique conta no link do
   criativo. Ambos chamam `POST /api/resources/fn_ad_track` (RPC pública, sem login), por beacon.
5. O painel root (`/painel/root/ads`, componente `AdsScreen`) tem 3 abas: Espaços, Criativos e
   Métricas.

## Tabelas

### `ad_slots` (1 linha por espaço)

| Coluna | Tipo | Regra |
|---|---|---|
| `slug` | text, PK | `^[a-z0-9-]{1,40}$`; deve existir no `AD_SLOT_CATALOG` para o app exibir |
| `enabled` | boolean | padrão `false`; anônimo só lê espaços habilitados |
| `media` | text[] | subconjunto de `imagem`, `gif`, `google` |
| `google_weight` | integer | 0..1000; 0 = Google não entra no sorteio |
| `google_ad_unit` | text | ID da unidade AdSense do espaço |
| `rotate_seconds` | integer | 0 (sem rotação) ou 5..600 |
| `updated_at` | timestamptz | |

### `ad_creatives` (criativos próprios)

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid, PK | |
| `format` | text | `faixa`, `banner`, `card`, `card-vertical` ou `retangulo` |
| `kind` | text | `imagem` ou `gif` |
| `image_url` | text | caminho relativo (`/...`) ou `http(s)://` |
| `alt` | text | texto alternativo |
| `link_url` | text | só `http(s)://` |
| `label` | text | nome interno, para o painel |
| `weight` | integer | 0..1000; 0 = fora do sorteio |
| `starts_at`, `ends_at` | timestamptz | vigência opcional (anônimo só lê o que está vigente) |
| `cities` | text[] | vazio = todas as cidades; senão, só nas listadas |
| `slots` | text[] | vazio = qualquer espaço do mesmo formato; senão, só nos listados |
| `active` | boolean | padrão `true` |
| `created_at`, `updated_at` | timestamptz | |

Não há DELETE para ninguém: para tirar um criativo do ar, desative (`active = false`).

### `ad_stats_daily` (contadores)

Chave primária composta `(slot_slug, creative_id, page, day)`, mais `id` (identity, UNIQUE) para o
recurso genérico. Colunas `impressions` e `clicks` (inteiros). `creative_id` zerado
(`00000000-0000-0000-0000-000000000000`, constante `GOOGLE_CREATIVE_ID`) representa o Google.
`page` é o padrão da rota, nunca a URL real: `/anuncios/[id]`, `/[cidade]/[id]` (função
`routePattern`). Leitura só para quem tem `ads`/`manage`. Ninguém escreve direto; só a função.

## Permissão

`ads`/`manage` ("Gerenciar publicidade"): registrada no catálogo `auth.permissions`, sem concessão
automática (root sempre passa). Libera INSERT/UPDATE em `ad_slots` e `ad_creatives`, leitura de
espaços desligados e de criativos inativos ou fora da vigência, e leitura de `ad_stats_daily`.
Conceder a um papel é decisão de quem administra o projeto.

## `fn_ad_track(p_slot, p_creative_id, p_page, p_event)`

RPC pública (`SECURITY DEFINER`, execução para `anon` e `auth_user`). Devolve `true` se contou e
`false` se rejeitou. Valida, nesta ordem:

- `p_event` é `impression` ou `click`;
- `p_page` bate com o padrão de rota (até 4 segmentos de 1 a 40 caracteres);
- o espaço existe e está habilitado;
- se vier `p_creative_id`: o criativo está ativo, vigente e (se tem `slots`) inclui o espaço;
- clique exige criativo próprio; impressão do Google passa sem criativo.

Grava com `INSERT ... ON CONFLICT DO UPDATE`, somando 1 ao contador do dia.

## Adicionar um espaço novo

1. Acrescente uma entrada em `AD_SLOT_CATALOG` (`src/shared/ads/catalog.ts`): `slug`, `label` e o
   `format` (define a altura mínima em `AD_FORMAT_SPECS`).
2. Monte o componente na página, na posição desejada:

   ```tsx
   import { AdSlot } from '@kizuna/core/client/ads';
   import { adsConfig } from '@/lib/ads';

   <AdSlot slot="home-meio" city={cityName} adsenseClient={adsConfig.adsenseClient} maxPerPage={adsConfig.maxSlotsPerPage} />
   ```

3. No painel root, aba Espaços, o novo slug aparece (vem do catálogo). Habilite e escolha mídias.
4. Suba criativos do mesmo formato do espaço (aba Criativos).

Espaços do catálogo hoje: `home-destaque` (faixa), `home-meio` (banner), `trilho-card` (card),
`busca-patrocinado` (card), `descobrir-card` (card-vertical), `cidade-topo` (banner),
`anuncio-rodape` (retangulo).

## Formatos

| Formato | Uso | Altura mínima (px) |
|---|---|---|
| `faixa` | larga e baixa | 90 |
| `banner` | banner largo | 140 |
| `card` | card de lista | 280 |
| `card-vertical` | card vertical (Descobrir) | 420 |
| `retangulo` | retângulo | 250 |

Um criativo só serve a espaços do mesmo formato. Todo anúncio exibe a marca "Patrocinado" e o
link abre em nova aba com `rel="sponsored noopener noreferrer"`.

## Upload de imagem e GIF

O painel envia o arquivo ao plugin `storage`. Para `kind = gif` o envio vai com
`optimizeImages = false`: o otimizador achataria o GIF animado em um único quadro. O painel valida
que o tipo `gif` recebe arquivo `image/gif` e o tipo `imagem` não recebe GIF. Para imagem comum, a
otimização segue ligada.

## Métricas

Aba Métricas do painel, a partir de `ad_stats_daily` (`src/shared/ads/metrics.ts`):

- totais de impressões, cliques e CTR (cliques / impressões);
- agrupamento por espaço, por criativo e por página (`groupStats`);
- série diária no período (`dailySeries`);
- filtro por espaço, criativo ou página (`summarize`).

## Configuração (`kizuna.config.json` → `ads`)

| Campo | Efeito |
|---|---|
| `adsenseClient` | ID do editor Google (`ca-pub-` mais 10 a 20 dígitos). Vazio ou inválido = só criativos próprios |
| `maxSlotsPerPage` | teto de espaços exibidos por página (1..10, padrão 3) |

O starter lê isso em `src/lib/ads.ts` (`adsConfig`) e repassa às páginas. O painel root avisa
quando `adsenseClient` não está configurado.

## Limites conhecidos

- **Google só impressão:** o clique no anúncio do Google acontece dentro do iframe dele e não é
  medido; só a impressão conta (com o criativo zerado).
- **Sem dedupe por visitante:** cada impressão válida soma 1. Um cliente malicioso pode chamar a
  função em laço e inflar os contadores. Defesa: espaço habilitado, criativo vigente e filtro de
  bot best-effort no cliente.
- **Sem consentimento embutido:** o plugin não traz banner de cookies. Para o Google, o projeto
  decide quando liberar via `allowGoogle` (padrão `true`), conforme seu próprio consentimento.
- **Sem agendamento por dia da semana ou hora:** só há vigência por data (`starts_at`/`ends_at`).
- **`descobrir-card` sem posição montada:** o espaço existe no catálogo (marcado como não montado)
  e a aba Slots avisa; ainda não há posição no deck do Descobrir (pendente).
- **Rota legada `/anuncios/[uid]`:** não tem o espaço `anuncio-rodape`; só a rota
  `/[cidade]/anuncio/[uid]` o monta.
- **Sorteio no navegador:** o peso é aplicado no cliente, por carga de página; não há garantia de
  proporção exata nem de entrega contratada.
- **Cota por página:** `ads.maxSlotsPerPage` (padrão 3) é um teto de segurança por navegação. A
  vaga é reservada na ordem em que as consultas dos espaços resolvem, não na ordem do DOM; o espaço
  que perde a vaga não aparece. Substitui o "1 pago por tela" da spec. O `trilho-card` concorre
  pela mesma cota.
- **CLS aceito:** `cidade-topo` e `home-destaque` aparecem só depois que o pool carrega; espaço sem
  candidato colapsa, por isso não reserva altura antes do carregamento.
- **CTR:** o CTR exibido nas abas Métricas e Slots considera só criativos próprios (o Google não
  tem clique); as impressões totais incluem o Google.
- **Retenção:** o `0001` agenda via `pg_cron`, se existir, `DELETE ... day < CURRENT_DATE - 400`.
  Sem `pg_cron`, agende essa instrução por fora.
- **Fuso:** a métrica diária (`day`) usa `CURRENT_DATE` do servidor do banco, ou seja UTC; já a
  vigência dos criativos (`starts_at`/`ends_at`) é digitada no fuso local do navegador do root.
  Rode o banco em UTC e considere a diferença ao ler o dia limite.
