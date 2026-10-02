# Plugin `analytics`

Métricas de negócio por anúncio, first-party, sem cookie e sem dado pessoal. Uma tabela
(`analytics_events`) e uma função (`fn_analytics_track`); sem views, rollup ou trigger.

## Como funciona

1. O cliente (`useTrackView` / `trackEvent`) decide quando um evento conta — tempo mínimo em
   milissegundos, fração visível, aba em foco, uma vez por sessão — e chama
   `POST /api/resources/fn_analytics_track` (RPC pública, sessão opcional).
2. O banco valida por CHECK/RLS/UNIQUE: piso de tempo (`view` 500 ms, `impression` 200 ms), anúncio
   ativo, dono não conta, no máximo 1 linha por visitante/anúncio/evento/dia.
3. O painel lê `GET /api/resources/analytics_events` (RLS = anúncios do tenant) e agrega no
   cliente com `fetchOwnerStats(days)`.

## Configuração (`kizuna.config.json` → `analytics`)

| Campo | Efeito |
|---|---|
| `enabled` | `false` desliga a coleta |
| `events.<evento>.minVisibleMs` | milissegundos contínuos em tela antes de contar; `0` = na hora |
| `events.<evento>.minVisibleRatio` | fração do elemento visível (0..1) |
| `events.<evento>.oncePerSession` | conta no máximo 1x por sessão |
| `entities.<tipo>.events.<evento>` | sobrescreve por tipo de entidade |

Eventos: `impression`, `view`, `contact_click`, `favorite`, `share`. Teto de `minVisibleMs`: 60000.

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
- **Retenção:** o `0001` agenda via `pg_cron`, se existir, `DELETE ... day < CURRENT_DATE - 400`. Sem
  `pg_cron`, agendar essa instrução por fora.
- **Métricas:** `ctr` pode passar de 100% (views sem impression, ex.: link direto); "visitantes únicos" = ids anônimos distintos por dia (visitantes-dia), próximo de views.
- **Limites conhecidos:** a exclusão do dono usa `created_by`, mas a leitura é por tenant — outros membros do mesmo tenant contam como visitantes; a paginação por offset em `id desc` pode contar em dobro linhas de fronteira acima de 1000 linhas.
- **Fuso:** `day` usa `CURRENT_DATE` do banco; as janelas do cliente usam UTC. Rodar o banco em UTC.
- **Dependência:** as policies referenciam `public.services` (plugin `services`).

## Novo tipo de entidade

1. Incluir o tipo no CHECK `analytics_events_entity_chk` e replicar as policies de INSERT/SELECT para
   o dono dessa entidade (migration nova).
2. Passar o novo `entityType` ao `TrackView`/`trackEvent`.
