-- Smoke da 0004 do plugin marketing (créditos, estorno, trava de saldo, extrato).
-- Roda tudo numa transação e desfaz no fim (ROLLBACK): não deixa dado nenhum.
-- Precisa de: plugin marketing 1.3.0, um usuário com conta (auth.user_roles) e um anúncio ativo.
BEGIN;
DO $$
DECLARE
  v_t   uuid;  -- conta
  v_u   uuid;  -- usuário da conta
  v_s   uuid;  -- anúncio ativo (vira do usuário só nesta transação)
  v_s2  uuid;
  v_bonus bigint;
  v_bal bigint;
  v_stmt bigint;
  v_n integer;
  v_boost bigint;
BEGIN
  ASSERT EXISTS (SELECT 1 FROM auth.plugin_registry WHERE name = 'marketing' AND version >= '1.3.0'), 'marketing 1.3.0';
  ASSERT to_regclass('public.vw_wallet_statement') IS NOT NULL, 'vw_wallet_statement existe';

  SELECT ur.tenant_id, ur.user_id INTO v_t, v_u FROM auth.user_roles ur LIMIT 1;
  SELECT uid INTO v_s  FROM public.services WHERE active AND status = 'active' ORDER BY uid LIMIT 1;
  SELECT uid INTO v_s2 FROM public.services WHERE active AND status = 'active' ORDER BY uid OFFSET 1 LIMIT 1;
  ASSERT v_t IS NOT NULL AND v_s IS NOT NULL AND v_s2 IS NOT NULL, 'precisa de conta e de 2 anúncios ativos';
  UPDATE public.services SET created_by = v_u WHERE uid IN (v_s, v_s2);
  -- conta limpa para a conta do teste
  DELETE FROM public.boosts WHERE tenant_id = v_t;
  DELETE FROM public.ad_campaigns WHERE tenant_id = v_t;
  DELETE FROM public.wallet_ledger WHERE tenant_id = v_t;

  -- 1) bônus: entra uma vez só (idempotente por ref_id)
  INSERT INTO public.wallet_ledger (tenant_id, kind, amount_cents, note, ref_id, created_by)
  VALUES (v_t, 'credit_bonus', 3000, 'Bônus por indicar', 'indicacao:1', v_u) RETURNING id INTO v_bonus;
  BEGIN
    INSERT INTO public.wallet_ledger (tenant_id, kind, amount_cents, ref_id) VALUES (v_t, 'credit_bonus', 3000, 'indicacao:1');
    RAISE EXCEPTION 'esperava erro';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.wallet_ledger (tenant_id, kind, amount_cents, ref_id) VALUES (v_t, 'credit_bonus', 3000, 'sem formato');
    RAISE EXCEPTION 'esperava erro';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.wallet_ledger (tenant_id, kind, amount_cents, ref_id) VALUES (v_t, 'credit_bonus', -3000, 'indicacao:2');
    RAISE EXCEPTION 'esperava erro';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 2) como o dono da conta (RLS de verdade): impulsiona 5 dias × R$ 5 = 2500 de 3000
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'auth_user', 'tenant_id', v_t, 'user_id', v_u)::text, true);
  SET LOCAL ROLE auth_user;
  INSERT INTO public.boosts (service_uid, daily_cents, starts_on, ends_on)
  VALUES (v_s, 500, CURRENT_DATE, CURRENT_DATE + 4) RETURNING id INTO v_boost;
  -- sobra 500: 2 dias × R$ 5 = 1000 é recusado com o mesmo erro da RLS
  BEGIN
    INSERT INTO public.boosts (service_uid, daily_cents, starts_on, ends_on) VALUES (v_s2, 500, CURRENT_DATE, CURRENT_DATE + 1);
    RAISE EXCEPTION 'esperava erro';
  EXCEPTION WHEN insufficient_privilege THEN
    ASSERT SQLERRM LIKE 'new row violates row-level security policy%', 'mesma mensagem da RLS: ' || SQLERRM;
  END;
  -- o dono não lança bônus nem estorno
  BEGIN
    INSERT INTO public.wallet_ledger (tenant_id, kind, amount_cents, ref_id) VALUES (v_t, 'credit_bonus', 100, 'indicacao:9');
    RAISE EXCEPTION 'esperava erro';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  -- extrato do dono: razão + débito do impulsionamento
  SELECT count(*), COALESCE(SUM(amount_cents), 0) INTO v_n, v_stmt FROM public.vw_wallet_statement WHERE tenant_id = v_t;
  ASSERT v_n = 2, 'extrato com bônus e impulsionamento: ' || v_n;
  SELECT balance_cents INTO v_bal FROM public.vw_wallet_balance WHERE tenant_id = v_t;
  ASSERT v_stmt = v_bal AND v_bal = 500, 'soma do extrato = saldo (500): ' || v_stmt || ' / ' || v_bal;
  ASSERT EXISTS (SELECT 1 FROM public.vw_wallet_statement WHERE tenant_id = v_t AND kind = 'boost'
                   AND amount_cents = -2500 AND days = 5 AND service_uid = v_s), 'linha do impulsionamento';
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '{}', true);

  -- 3) estorno: não deixa negativo, no máximo o valor do original, um por lançamento
  BEGIN
    INSERT INTO public.wallet_ledger (tenant_id, kind, amount_cents, ref_id) VALUES (v_t, 'reversal', -3000, v_bonus::text);
    RAISE EXCEPTION 'esperava erro';
  EXCEPTION WHEN check_violation THEN
    ASSERT SQLERRM LIKE 'Saldo insuficiente%', SQLERRM;
  END;
  BEGIN
    INSERT INTO public.wallet_ledger (tenant_id, kind, amount_cents, ref_id) VALUES (v_t, 'reversal', -100, '999999999');
    RAISE EXCEPTION 'esperava erro';
  EXCEPTION WHEN check_violation THEN
    ASSERT SQLERRM LIKE 'Estorno inválido%', SQLERRM;
  END;
  INSERT INTO public.wallet_ledger (tenant_id, kind, amount_cents, note, ref_id)
  VALUES (v_t, 'reversal', -500, 'Estorno do bônus (o que restava)', v_bonus::text);
  BEGIN
    INSERT INTO public.wallet_ledger (tenant_id, kind, amount_cents, ref_id) VALUES (v_t, 'reversal', -1, v_bonus::text);
    RAISE EXCEPTION 'esperava erro';
  EXCEPTION WHEN unique_violation OR check_violation THEN NULL;
  END;
  -- ajuste negativo que deixaria a conta negativa: recusado
  BEGIN
    INSERT INTO public.wallet_ledger (tenant_id, kind, amount_cents) VALUES (v_t, 'adjust', -1);
    RAISE EXCEPTION 'esperava erro';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  SELECT balance_cents INTO v_bal FROM public.vw_wallet_balance WHERE tenant_id = v_t;
  ASSERT v_bal = 0, 'saldo zerado, nunca negativo: ' || v_bal;

  -- 4) parar devolve: linha de devolução no extrato e soma continua = saldo
  UPDATE public.boosts SET stopped_on = CURRENT_DATE + 1 WHERE id = v_boost;  -- usou 1 dia, volta 4
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_stmt FROM public.vw_wallet_statement WHERE tenant_id = v_t;
  SELECT balance_cents INTO v_bal FROM public.vw_wallet_balance WHERE tenant_id = v_t;
  ASSERT v_bal = 2000 AND v_stmt = v_bal, 'devolveu 4 dias (2000): ' || v_stmt || ' / ' || v_bal;
  ASSERT EXISTS (SELECT 1 FROM public.vw_wallet_statement WHERE tenant_id = v_t AND kind = 'boost_refund'
                   AND amount_cents = 2000 AND days = 4), 'linha de devolução';

  RAISE NOTICE 'marketing_credits smoke: ok';
END $$;
ROLLBACK;
