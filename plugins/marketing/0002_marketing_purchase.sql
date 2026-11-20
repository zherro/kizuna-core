-- plugins/marketing/0002_marketing_purchase.sql
-- Compra direta: o pagamento (PIX etc.) carrega um PROPÓSITO — impulsionar um anúncio ou contratar
-- um banner. Quem confirma é o servidor (`settlePayment`, service_role): credita a carteira e, no
-- mesmo fluxo idempotente, cria o boost (vai ao ar sozinho) ou a campanha (fica esperando a
-- aprovação do banner). Continua o modelo pré-pago: o crédito entra no livro-razão e a reserva é
-- o próprio boost/campanha (vw_wallet_balance). Se não der para criar, o valor fica no saldo.
--
-- Reprovação de banner: o admin para a campanha em `starts_on` (0 dias comprometidos) e o valor
-- inteiro volta ao saldo — só para criativo reprovado que NUNCA foi exibido (policy abaixo).
--
-- Sem funções e sem triggers (mesma regra da 0001). Idempotente.

-- =========================================================================
-- 1) Propósito e resultado na intenção de pagamento
-- =========================================================================
-- purpose: NULL = recarga de saldo (como antes).
--   {"kind":"boost","serviceUid":uuid,"dailyCents":int,"startsOn":"YYYY-MM-DD","days":int}
--   {"kind":"campaign","creativeId":uuid,"slotSlug":text,"dailyCents":int,"startsOn":"YYYY-MM-DD","days":int}
-- fulfilled_ref: o que foi criado ao liquidar ("boost:<id>" / "campaign:<id>").
-- fulfill_error: por que não deu para criar (o valor ficou no saldo). Só o servidor escreve.
ALTER TABLE public.payment_intents ADD COLUMN IF NOT EXISTS purpose       jsonb;
ALTER TABLE public.payment_intents ADD COLUMN IF NOT EXISTS fulfilled_ref text;
ALTER TABLE public.payment_intents ADD COLUMN IF NOT EXISTS fulfill_error text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_intents_purpose_chk') THEN
    ALTER TABLE public.payment_intents ADD CONSTRAINT payment_intents_purpose_chk CHECK (
      purpose IS NULL
      OR (jsonb_typeof(purpose) = 'object' AND purpose->>'kind' IN ('boost', 'campaign'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_intents_fulfill_chk') THEN
    ALTER TABLE public.payment_intents ADD CONSTRAINT payment_intents_fulfill_chk CHECK (
      char_length(COALESCE(fulfilled_ref, '')) <= 60 AND char_length(COALESCE(fulfill_error, '')) <= 300
    );
  END IF;
END $$;

-- O dono cria a intenção, mas o resultado é só do servidor.
DROP POLICY IF EXISTS payment_intents_insert_clean ON public.payment_intents;
CREATE POLICY payment_intents_insert_clean ON public.payment_intents AS RESTRICTIVE FOR INSERT TO auth_user
WITH CHECK (fulfilled_ref IS NULL AND fulfill_error IS NULL);

-- =========================================================================
-- 2) Boost/campanha comprados: vínculo único com o pagamento (idempotência)
-- =========================================================================
ALTER TABLE public.boosts       ADD COLUMN IF NOT EXISTS payment_intent_id uuid REFERENCES public.payment_intents(id) ON DELETE SET NULL;
ALTER TABLE public.ad_campaigns ADD COLUMN IF NOT EXISTS payment_intent_id uuid REFERENCES public.payment_intents(id) ON DELETE SET NULL;
-- Webhook reentregue não cria dois: a segunda inserção bate aqui (409) e o servidor segue.
CREATE UNIQUE INDEX IF NOT EXISTS boosts_payment_once       ON public.boosts (payment_intent_id)       WHERE payment_intent_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ad_campaigns_payment_once ON public.ad_campaigns (payment_intent_id) WHERE payment_intent_id IS NOT NULL;

-- O anunciante não pode vincular pagamento por conta própria (bloquearia a compra de outro, ou a sua).
DROP POLICY IF EXISTS boosts_insert_no_payment ON public.boosts;
CREATE POLICY boosts_insert_no_payment ON public.boosts AS RESTRICTIVE FOR INSERT TO auth_user
WITH CHECK (payment_intent_id IS NULL);
DROP POLICY IF EXISTS ad_campaigns_insert_no_payment ON public.ad_campaigns;
CREATE POLICY ad_campaigns_insert_no_payment ON public.ad_campaigns AS RESTRICTIVE FOR INSERT TO auth_user
WITH CHECK (payment_intent_id IS NULL);

-- =========================================================================
-- 3) Reprovação devolve tudo: parar em starts_on (0 dias) a campanha de criativo reprovado que
--    nunca foi exibido. Soma-se (OR) à policy `ad_campaigns_stop` da 0001, que só para do dia
--    seguinte em diante. Só admin (marketing/ads.manage).
-- =========================================================================
DROP POLICY IF EXISTS ad_campaigns_refund_rejected ON public.ad_campaigns;
CREATE POLICY ad_campaigns_refund_rejected ON public.ad_campaigns FOR UPDATE TO auth_user
USING (
  stopped_on IS NULL
  AND (auth.fun_auth_has_perm('marketing', 'manage') OR auth.fun_auth_has_perm('ads', 'manage'))
  AND EXISTS (SELECT 1 FROM public.ad_creative_reviews r
               WHERE r.creative_id = ad_campaigns.creative_id AND r.status = 'rejected')
  AND EXISTS (SELECT 1 FROM public.ad_creatives c WHERE c.id = ad_campaigns.creative_id AND NOT c.active)
  AND NOT EXISTS (SELECT 1 FROM public.ad_stats_daily s
                   WHERE s.creative_id = ad_campaigns.creative_id AND s.impressions > 0)
)
WITH CHECK (stopped_on = starts_on);

-- =========================================================================
-- 4) Servidor: o que `settlePayment` precisa para criar a compra (service_role tem BYPASSRLS;
--    as regras de dono/saldo/período são conferidas no código antes de inserir).
-- =========================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT, INSERT ON public.boosts, public.ad_campaigns TO service_role;
    GRANT SELECT ON public.services, public.ad_creatives, public.ad_slots, public.ad_creative_reviews TO service_role;
    GRANT SELECT ON public.vw_wallet_balance TO service_role;
  ELSE
    RAISE NOTICE 'papel service_role ausente (sql/0117) — a compra direta não poderá ser liquidada';
  END IF;
END $$;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('marketing', '1.1.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
