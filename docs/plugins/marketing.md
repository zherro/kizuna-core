---
description: Plugin marketing - carteira pré-paga por conta, impulsionar anúncios, banners pagos, créditos de bônus, estorno e extrato.
---

# Plugin `marketing`

Carteira pré-paga por conta (`tenant_id`), impulsionar anúncios e banners pagos. Valores sempre em
**centavos** (`bigint`). Depende de `services`, `analytics` e `ads`.

| Migration | O que traz |
|---|---|
| `0001_marketing.sql` | `wallet_ledger` (livro-razão só de inserção), `boosts`, `ad_campaigns`, `ad_creative_reviews`, `payment_intents`, `vw_wallet_balance`, views públicas `vw_*_live`, métricas |
| `0002_marketing_purchase.sql` | compra com propósito (PIX que já cria o impulsionamento/campanha), devolução de banner reprovado |
| `0003_boost_metrics_placement.sql` | métricas do impulsionado por lugar (patrocinado × orgânico) |
| `0004_marketing_credits.sql` | `credit_bonus` e `reversal`, trava de saldo, extrato `vw_wallet_statement` (v1.3.0) |
| `0005_marketing_live_until_paid.sql` | parado continua no ar até o fim do dia pago; `committed_cents` só com reserva; coluna `purchased_cents` (v1.4.0) |

## Modelo

- **Saldo** = soma do razão − custo reservado de `boosts` e `ad_campaigns` (diária × dias). Não há
  débito no razão: a reserva é o próprio impulsionamento/campanha. Parar (`stopped_on`) devolve os
  dias não usados.
- **Parar:** `stopped_on` é o primeiro dia **não** servido (no mínimo amanhã), então hoje já foi
  pago. Desde a 0005, `vw_boosts_live` e `vw_ad_campaigns_live` mantêm o impulsionado/banner no ar
  até o fim do dia pago (antes saíam na hora).
- **`vw_wallet_balance`:** `balance_cents` (saldo), `credited_cents` (todo crédito positivo:
  pagamento, admin, bônus), `committed_cents` (só o reservado em impulsionamentos e campanhas; desde
  a 0005 não soma `adjust`/`reversal`), `purchased_cents` (0005: só `credit_payment`). A tela não lê
  `purchased_cents`, para funcionar em banco sem a 0005.
- **Dia do banco:** `CURRENT_DATE` segue o fuso do banco (UTC por padrão). Em Cuiabá (UTC−4) o dia
  do impulsionamento vira às 20h. Ainda não tratado.
- **Tipos de lançamento** (`wallet_ledger.kind`):

| kind | Sinal | Quem lança | `ref_id` |
|---|---|---|---|
| `credit_payment` | + | servidor (`settlePayment`, `service_role`) | id da intent; único |
| `credit_admin` | + | admin (`marketing.manage`) | livre |
| `adjust` | ± | admin | livre |
| `credit_bonus` | + | regra do app (RPC `SECURITY DEFINER` própria ou `service_role`) | **obrigatório**, `<regra>:<id>` (ex.: `indicacao:42`, `^[a-z][a-z0-9_]{0,39}:[A-Za-z0-9_-]{1,80}$`); **único** = idempotente |
| `reversal` | − | admin ou servidor/app | **obrigatório**, id do lançamento estornado; **único** = um estorno por lançamento |

  Estorno: só de `credit_bonus`, `credit_payment` ou `credit_admin` da mesma conta, no máximo o
  valor do original, e nunca deixando o saldo negativo. Se o crédito já foi gasto, estorne
  `-least(valor, saldo)` (ou pare o impulsionamento antes, para os dias voltarem ao saldo).
  Estorno de **gasto** não é lançamento: é parar o impulsionamento/campanha.

## Exceção à regra "sem funções e sem triggers"

O plugin nasceu só com tabelas, views, grants e RLS. A 0004 abre **uma** exceção, aprovada pelo dono
em 22/11/2026: a função de trigger `public.fn_marketing__wallet_guard()`, disparada `BEFORE INSERT`
em `boosts`, `ad_campaigns` e nos lançamentos negativos de `wallet_ledger`.

**Por quê:** a RLS confere o saldo com o retrato do início do comando e não serializa por conta.
Dois impulsionamentos criados ao mesmo tempo passavam juntos pela conferência e gastavam além do
saldo; e um `adjust`/estorno negativo podia deixar a conta negativa. Nenhuma policy resolve a
corrida: é preciso travar a conta e reler o saldo.

**O que ela faz, e só isso:** `pg_advisory_xact_lock` pela conta (até o fim da transação), recalcula
o saldo nas tabelas base (vê o que já foi commitado, em READ COMMITTED — o padrão do PostgREST) e
recusa o que deixaria a conta negativa. Também valida o estorno (ver acima).

**Erros:** impulsionamento/campanha recusados saem com o mesmo código e texto da recusa de RLS
(`42501`, `new row violates row-level security policy for table "boosts"`), então telas e
`settlePayment` tratam igual e ninguém descobre o saldo de outra conta pela mensagem. Lançamento
negativo recusado sai com `23514` e mensagem clara ("Saldo insuficiente…", "Estorno inválido…").

**Efeito em quem já usa:** o caso normal não muda. Muda que o admin não consegue mais lançar um
`adjust` que deixe a conta negativa, e a corrida deixa de passar.

Smoke: `db/extras/marketing_credits_test_smoke.sql` (roda numa transação e desfaz).

## Extrato `vw_wallet_statement`

`security_invoker` (cada um vê a própria conta; `marketing.manage` vê todas). A soma de
`amount_cents` por conta é igual ao saldo.

| Coluna | |
|---|---|
| `tenant_id` | conta |
| `entry_id` | único: `L:<id>` razão, `B:<id>` impulsionamento, `BR:<id>` devolução dele, `C:<id>` campanha, `CR:<id>` devolução dela |
| `kind` | os do razão + `boost`, `boost_refund`, `campaign`, `campaign_refund` |
| `amount_cents` | negativo no débito (período inteiro reservado), positivo na devolução |
| `note`, `ref_id` | do razão (vazios nas linhas de impulsionamento/campanha) |
| `service_uid`, `service_title` | impulsionamento |
| `slot_slug` | campanha |
| `days` | dias do período (débito) ou dias devolvidos |
| `occurred_at` | criação; devolução = dia da parada (`stopped_on − 1`, nunca antes da criação) |

Recurso: `vw_wallet_statement` em `resourceMarketing` (só leitura).

## Telas: opção `display`

`AdvertiserPanel` (`src/client/components/marketing/advertiser/advertiser-panel.tsx`) e
`MarketingAdminScreen` (`src/client/components/marketing/admin/marketing-admin-screen.tsx`) aceitam
a prop opcional `display: MarketingDisplay` (`src/shared/marketing/display.ts`). **Sem ela, tudo fica
como antes** (R$, aba de banners, extrato lendo só `wallet_ledger`).

| Chave | Padrão | Efeito |
|---|---|---|
| `banners` | `true` | `false` esconde as abas e os blocos de banner (anunciante, admin e métricas) e os textos que citam banner; `?aba=banners` cai na aba inicial |
| `unit` | `'brl'` | `'credits'` mostra "30 créditos" (1 crédito = R$ 1 = 100 centavos). Campos de valor pedem "Créditos" com a dica "1 crédito = R$ 1"; o PIX mostra "20 créditos (R$ 20,00)" |
| `statement` | `'ledger'` | `'full'` faz o extrato ler `vw_wallet_statement` (precisa da 0004) |
| `badgeName` | `'BORA INDICA'` | nome do selo nos textos |
| `kindLabels` | `{}` | sobrescreve o rótulo do extrato por `kind` |
| `title` | `'Marketing'` | título da página (anunciante e admin) |
| `boostPlacement` | `'entra na faixa de patrocinados, em todas as páginas'` | onde o impulsionado aparece, em "O anúncio ganha o selo X e …, assim que começar." |
| `dateHint` | `'Data do servidor (UTC)'` | dica do campo "Começa em" |

No admin, o desconto ("Corrigir") que deixaria a conta negativa mostra o aviso e não deixa confirmar
(o banco também recusa desde a 0004).

```tsx
<AdvertiserPanel
  tenantId={session.tenant_id}
  display={{ unit: 'credits', banners: false, statement: 'full', badgeName: 'DESTAQUE' }}
/>
```

O registry de telas root chama `MarketingAdminScreen` sem prop. Para usar `display` no admin, a
página `/painel/root/[slug]` do projeto renderiza `MarketingAdminScreen` com a prop quando o slug for
`marketing`.
