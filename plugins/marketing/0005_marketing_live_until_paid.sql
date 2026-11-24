-- plugins/marketing/0005_marketing_live_until_paid.sql
-- Correções achadas no teste dos créditos (22/11/2026). `CREATE OR REPLACE VIEW` com as mesmas
-- colunas (e uma nova no fim da vw_wallet_balance). Sem funções. Idempotente.
--
-- 1) No ar até o fim do dia pago. "Parar" grava `stopped_on` = o primeiro dia NÃO servido (no mínimo
--    amanhã), então hoje já foi cobrado. As views exigiam `stopped_on IS NULL` e tiravam o anúncio/o
--    banner do ar na hora. Agora: não parado, ou parado só a partir de um dia que ainda não chegou.
--
-- 2) vw_wallet_balance:
--    - `committed_cents` = só o reservado em impulsionamentos e campanhas (antes somava também os
--      lançamentos negativos do razão — `adjust` e `reversal` —, que não são reserva);
--    - `purchased_cents` (nova, no fim) = o que entrou por pagamento (`credit_payment`); o
--      `credited_cents` continua sendo todo crédito positivo (pagamento, admin, bônus).
--    `balance_cents` não muda.

CREATE OR REPLACE VIEW public.vw_boosts_live AS
SELECT b.service_uid
FROM public.boosts b
JOIN public.services s ON s.uid = b.service_uid AND s.active AND s.status = 'active'
WHERE (b.stopped_on IS NULL OR CURRENT_DATE < b.stopped_on)
  AND CURRENT_DATE BETWEEN b.starts_on AND b.ends_on
GROUP BY b.service_uid;

CREATE OR REPLACE VIEW public.vw_ad_campaigns_live AS
SELECT DISTINCT c.creative_id, c.slot_slug
FROM public.ad_campaigns c
JOIN public.ad_creative_reviews r ON r.creative_id = c.creative_id AND r.status = 'approved'
WHERE (c.stopped_on IS NULL OR CURRENT_DATE < c.stopped_on)
  AND CURRENT_DATE BETWEEN c.starts_on AND c.ends_on;

CREATE OR REPLACE VIEW public.vw_wallet_balance WITH (security_invoker = true) AS
SELECT tenant_id,
       SUM(amount_cents)::bigint AS balance_cents,
       SUM(amount_cents) FILTER (WHERE src = 'ledger' AND amount_cents > 0)::bigint AS credited_cents,
       -SUM(amount_cents) FILTER (WHERE src = 'reserve')::bigint AS committed_cents,
       SUM(amount_cents) FILTER (WHERE src = 'ledger' AND kind = 'credit_payment')::bigint AS purchased_cents
FROM (
  SELECT tenant_id, amount_cents, 'ledger'::text AS src, kind FROM public.wallet_ledger
  UNION ALL
  SELECT tenant_id,
         -(daily_cents::bigint
           * GREATEST(0, LEAST(ends_on + 1, COALESCE(stopped_on, ends_on + 1)) - starts_on)),
         'reserve', NULL
    FROM public.boosts
  UNION ALL
  SELECT tenant_id,
         -(daily_cents::bigint
           * GREATEST(0, LEAST(ends_on + 1, COALESCE(stopped_on, ends_on + 1)) - starts_on)),
         'reserve', NULL
    FROM public.ad_campaigns
) t
GROUP BY tenant_id;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('marketing', '1.4.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
