-- plugins/marketing/0004_marketing_credits.sql
-- Créditos ganhos (bônus) e estornos na carteira, trava de saldo e extrato completo.
--
-- 1) `kind` novos no livro-razão:
--      credit_bonus  (+) crédito dado por regra do app (ex.: indicação). `ref_id` obrigatório no
--                    formato `<regra>:<id>` (ex.: `indicacao:42`) e ÚNICO = idempotente: rodar duas
--                    vezes não credita duas.
--      reversal      (−) estorno de um crédito (bônus, pagamento ou crédito do admin). `ref_id` = id
--                    do lançamento estornado, ÚNICO = um estorno por lançamento, no máximo o valor dele.
--    Estorno de GASTO não é lançamento: é parar o impulsionamento/campanha (já existe).
--
-- 2) EXCEÇÃO À REGRA "sem funções e sem triggers" do plugin (0001), aprovada pelo dono em 22/11/2026:
--    UMA função de trigger, `fn_marketing__wallet_guard`. Por quê: a RLS confere o saldo com o
--    retrato do início do comando e não serializa por conta, então
--      (a) dois impulsionamentos/campanhas criados ao mesmo tempo passavam juntos pela conferência e
--          gastavam além do saldo;
--      (b) um `adjust`/`reversal` negativo podia deixar o saldo abaixo de zero.
--    Policy nenhuma resolve (a): é preciso travar a conta e reler o saldo já com o que os outros
--    gravaram. A função faz só isso: `pg_advisory_xact_lock` por `tenant_id` (até o fim da
--    transação), recalcula o saldo das tabelas base e recusa o que deixaria a conta negativa.
--    Vale em READ COMMITTED (o padrão do PostgREST): cada consulta da função vê o que já foi commitado.
--    Recusa de impulsionamento/campanha sai com o MESMO código e texto da recusa de RLS (42501): a
--    tela e o `settlePayment` seguem tratando igual, e quem tenta usar outra conta não descobre o
--    saldo dela pela mensagem. Lançamento negativo (só admin/servidor) sai com mensagem clara (23514).
--    Efeito para quem já usa (Bora): o caso normal não muda; agora o admin não consegue mais lançar um
--    `adjust` que deixe a conta negativa, e a corrida descrita em (a) deixa de passar.
--
-- 3) `vw_wallet_statement`: extrato completo = razão + impulsionamentos e campanhas como débito +
--    devoluções de dias não usados quando param. A soma de `amount_cents` por conta = saldo.
--
-- Tudo opcional: quem não lança `credit_bonus`/`reversal` nem lê a view não vê diferença.
-- Idempotente.

-- =========================================================================
-- 1) Livro-razão: kinds novos, sinais, formato do ref_id e idempotência
-- =========================================================================
ALTER TABLE public.wallet_ledger DROP CONSTRAINT IF EXISTS wallet_ledger_kind_chk;
ALTER TABLE public.wallet_ledger ADD CONSTRAINT wallet_ledger_kind_chk
  CHECK (kind IN ('credit_admin', 'credit_payment', 'credit_bonus', 'adjust', 'reversal'));

ALTER TABLE public.wallet_ledger DROP CONSTRAINT IF EXISTS wallet_ledger_sign_chk;
ALTER TABLE public.wallet_ledger ADD CONSTRAINT wallet_ledger_sign_chk
  CHECK (kind = 'adjust' OR (kind = 'reversal' AND amount_cents < 0) OR (kind <> 'reversal' AND amount_cents > 0));

ALTER TABLE public.wallet_ledger DROP CONSTRAINT IF EXISTS wallet_ledger_ref_chk;
ALTER TABLE public.wallet_ledger ADD CONSTRAINT wallet_ledger_ref_chk
  CHECK (
    (kind <> 'credit_bonus' OR ref_id ~ '^[a-z][a-z0-9_]{0,39}:[A-Za-z0-9_-]{1,80}$')
    AND (kind <> 'reversal' OR ref_id ~ '^[0-9]{1,18}$')
  );

-- Mesmo bônus não entra duas vezes; um estorno por lançamento.
CREATE UNIQUE INDEX IF NOT EXISTS wallet_ledger_bonus_once
  ON public.wallet_ledger (ref_id) WHERE kind = 'credit_bonus';
CREATE UNIQUE INDEX IF NOT EXISTS wallet_ledger_reversal_once
  ON public.wallet_ledger (ref_id) WHERE kind = 'reversal';

-- Admin (marketing.manage) passa a poder estornar. Bônus é do app (RPC própria ou servidor).
DROP POLICY IF EXISTS wallet_ledger_insert ON public.wallet_ledger;
CREATE POLICY wallet_ledger_insert ON public.wallet_ledger FOR INSERT TO auth_user
WITH CHECK (kind IN ('credit_admin', 'adjust', 'reversal') AND auth.fun_auth_has_perm('marketing', 'manage'));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    DROP POLICY IF EXISTS wallet_ledger_server ON public.wallet_ledger;
    CREATE POLICY wallet_ledger_server ON public.wallet_ledger FOR ALL TO service_role
      USING (true) WITH CHECK (kind IN ('credit_payment', 'credit_bonus', 'reversal'));
  END IF;
END $$;

-- =========================================================================
-- 2) Trava de saldo (a exceção à regra "sem funções", ver cabeçalho)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.fn_marketing__wallet_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_cost    bigint;
  v_balance bigint;
  v_orig    public.wallet_ledger%ROWTYPE;
BEGIN
  -- Uma escrita que gasta saldo por vez, por conta, até o fim da transação.
  PERFORM pg_advisory_xact_lock(hashtextextended('marketing.wallet:' || NEW.tenant_id::text, 0));

  IF TG_TABLE_NAME = 'wallet_ledger' THEN
    IF NEW.amount_cents >= 0 THEN
      RETURN NEW;
    END IF;
    v_cost := -NEW.amount_cents;
    IF NEW.kind = 'reversal' THEN
      IF NEW.ref_id IS NULL OR NEW.ref_id !~ '^[0-9]{1,18}$' THEN
        RAISE EXCEPTION 'Estorno inválido: ref_id deve ser o id do lançamento estornado.' USING ERRCODE = '23514';
      END IF;
      SELECT * INTO v_orig FROM public.wallet_ledger WHERE id = NEW.ref_id::bigint;
      IF NOT FOUND
         OR v_orig.tenant_id <> NEW.tenant_id
         OR v_orig.kind NOT IN ('credit_bonus', 'credit_payment', 'credit_admin')
         OR v_cost > v_orig.amount_cents THEN
        RAISE EXCEPTION 'Estorno inválido: o lançamento não existe nesta conta, não é crédito ou o valor passa do original.'
          USING ERRCODE = '23514';
      END IF;
    END IF;
  ELSE
    v_cost := NEW.daily_cents::bigint
              * GREATEST(0, LEAST(NEW.ends_on + 1, COALESCE(NEW.stopped_on, NEW.ends_on + 1)) - NEW.starts_on);
  END IF;

  -- Mesma conta da vw_wallet_balance, direto nas tabelas base (vê o que já foi commitado).
  SELECT COALESCE(SUM(t.amount), 0) INTO v_balance
  FROM (
    SELECT l.amount_cents AS amount FROM public.wallet_ledger l WHERE l.tenant_id = NEW.tenant_id
    UNION ALL
    SELECT -(b.daily_cents::bigint
             * GREATEST(0, LEAST(b.ends_on + 1, COALESCE(b.stopped_on, b.ends_on + 1)) - b.starts_on))
      FROM public.boosts b WHERE b.tenant_id = NEW.tenant_id
    UNION ALL
    SELECT -(c.daily_cents::bigint
             * GREATEST(0, LEAST(c.ends_on + 1, COALESCE(c.stopped_on, c.ends_on + 1)) - c.starts_on))
      FROM public.ad_campaigns c WHERE c.tenant_id = NEW.tenant_id
  ) t;

  IF v_balance < v_cost THEN
    IF TG_TABLE_NAME = 'wallet_ledger' THEN
      RAISE EXCEPTION 'Saldo insuficiente: o lançamento deixaria a conta negativa.' USING ERRCODE = '23514';
    END IF;
    -- Igual à recusa da RLS (ver cabeçalho).
    RAISE EXCEPTION 'new row violates row-level security policy for table "%"', TG_TABLE_NAME
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_marketing__wallet_guard() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_wallet_ledger_guard ON public.wallet_ledger;
CREATE TRIGGER trg_wallet_ledger_guard
  BEFORE INSERT ON public.wallet_ledger
  FOR EACH ROW WHEN (NEW.amount_cents < 0)
  EXECUTE FUNCTION public.fn_marketing__wallet_guard();

DROP TRIGGER IF EXISTS trg_boosts_wallet_guard ON public.boosts;
CREATE TRIGGER trg_boosts_wallet_guard
  BEFORE INSERT ON public.boosts
  FOR EACH ROW EXECUTE FUNCTION public.fn_marketing__wallet_guard();

DROP TRIGGER IF EXISTS trg_ad_campaigns_wallet_guard ON public.ad_campaigns;
CREATE TRIGGER trg_ad_campaigns_wallet_guard
  BEFORE INSERT ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.fn_marketing__wallet_guard();

-- =========================================================================
-- 3) Extrato completo
-- =========================================================================
-- entry_id: 'L:<id>' razão · 'B:<id>' impulsionamento · 'BR:<id>' devolução dele ·
--           'C:<id>' campanha · 'CR:<id>' devolução dela.
-- Débito = período inteiro reservado na criação; devolução = dias não usados ao parar (data: o dia
-- da parada, `stopped_on − 1`, nunca antes da criação). `security_invoker`: cada um vê o seu.
CREATE OR REPLACE VIEW public.vw_wallet_statement WITH (security_invoker = true) AS
SELECT l.tenant_id,
       'L:' || l.id          AS entry_id,
       l.kind,
       l.amount_cents::bigint AS amount_cents,
       l.note,
       l.ref_id,
       NULL::uuid            AS service_uid,
       NULL::text            AS service_title,
       NULL::text            AS slot_slug,
       NULL::integer         AS days,
       l.created_at          AS occurred_at
  FROM public.wallet_ledger l
UNION ALL
SELECT b.tenant_id, 'B:' || b.id, 'boost',
       -(b.daily_cents::bigint * (b.ends_on - b.starts_on + 1)),
       '', NULL, b.service_uid, s.title, NULL,
       (b.ends_on - b.starts_on + 1), b.created_at
  FROM public.boosts b
  LEFT JOIN public.services s ON s.uid = b.service_uid
UNION ALL
SELECT b.tenant_id, 'BR:' || b.id, 'boost_refund',
       b.daily_cents::bigint * (b.ends_on + 1 - b.stopped_on),
       '', NULL, b.service_uid, s.title, NULL,
       (b.ends_on + 1 - b.stopped_on), GREATEST(b.created_at, (b.stopped_on - 1)::timestamptz)
  FROM public.boosts b
  LEFT JOIN public.services s ON s.uid = b.service_uid
 WHERE b.stopped_on IS NOT NULL AND b.stopped_on <= b.ends_on
UNION ALL
SELECT c.tenant_id, 'C:' || c.id, 'campaign',
       -(c.daily_cents::bigint * (c.ends_on - c.starts_on + 1)),
       '', NULL, NULL, NULL, c.slot_slug,
       (c.ends_on - c.starts_on + 1), c.created_at
  FROM public.ad_campaigns c
UNION ALL
SELECT c.tenant_id, 'CR:' || c.id, 'campaign_refund',
       c.daily_cents::bigint * (c.ends_on + 1 - c.stopped_on),
       '', NULL, NULL, NULL, c.slot_slug,
       (c.ends_on + 1 - c.stopped_on), GREATEST(c.created_at, (c.stopped_on - 1)::timestamptz)
  FROM public.ad_campaigns c
 WHERE c.stopped_on IS NOT NULL AND c.stopped_on <= c.ends_on;

GRANT SELECT ON public.vw_wallet_statement TO auth_user;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('marketing', '1.3.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
