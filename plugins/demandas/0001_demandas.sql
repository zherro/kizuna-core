-- plugins/demandas/0001_demandas.sql
-- Plugin: demandas — "pedido aberto" independente de prestador. Cliente publica uma demanda
-- (moderada antes de ficar visível), prestadores cuja categoria bate respondem com propostas
-- (cada uma ancorada em >=1 service_id do próprio prestador). Depende de `services`/`taxonomy`/
-- `forms` — por isso NÃO entra em kizuna.plugins.json, aplicado manualmente pelo db/install.sh
-- entre services (2.6) e pedidos (2.7, que ganha a FK pedido.demanda_id). MVP: fn_demanda_fechar
-- fica pra depois. Design: foco-total/docs/superpowers/specs/2026-09-15-demanda-e-propostas-design.md

CREATE TABLE IF NOT EXISTS public.demanda (
  id          bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  uid         uuid NOT NULL DEFAULT gen_random_uuid(),
  cliente_id  uuid NOT NULL DEFAULT auth.fun_auth_user_id() REFERENCES auth.users(uid) ON DELETE RESTRICT,
  category_id bigint NOT NULL REFERENCES public.categories(id),
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','aberta','rejeitada','fechada')),
  tenant_id   uuid DEFAULT auth.fun_auth_current_tenant_id(),
  created_by  uuid NOT NULL DEFAULT auth.fun_auth_user_id(),
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT demanda_uid_unique UNIQUE (uid)
);
CREATE INDEX IF NOT EXISTS demanda_cliente ON public.demanda (cliente_id);
CREATE INDEX IF NOT EXISTS demanda_category_status ON public.demanda (category_id) WHERE status = 'aberta';

CREATE TABLE IF NOT EXISTS public.demanda_moderacao (
  id                bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  uid               uuid NOT NULL DEFAULT gen_random_uuid(),
  demanda_id        bigint NOT NULL REFERENCES public.demanda(id) ON DELETE CASCADE,
  decision          text NOT NULL CHECK (decision IN ('approved','rejected','escalated')),
  decision_note     text,
  rejection_reason  text,
  decided_at        timestamptz NOT NULL DEFAULT now(),
  tenant_id         uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id(),
  created_by        uuid NOT NULL DEFAULT auth.fun_auth_user_id(),
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT demanda_moderacao_uid_unique UNIQUE (uid)
);
CREATE INDEX IF NOT EXISTS demanda_moderacao_demanda ON public.demanda_moderacao (demanda_id, decided_at DESC);

CREATE TABLE IF NOT EXISTS public.demanda_proposta (
  id            bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  uid           uuid NOT NULL DEFAULT gen_random_uuid(),
  demanda_id    bigint NOT NULL REFERENCES public.demanda(id) ON DELETE CASCADE,
  prestador_id  uuid NOT NULL DEFAULT auth.fun_auth_user_id() REFERENCES auth.users(uid) ON DELETE RESTRICT,
  mensagem      text,
  status        text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','aceita','recusada')),
  tenant_id     uuid DEFAULT auth.fun_auth_current_tenant_id(),
  created_by    uuid NOT NULL DEFAULT auth.fun_auth_user_id(),
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT demanda_proposta_uid_unique UNIQUE (uid),
  CONSTRAINT demanda_proposta_unique UNIQUE (demanda_id, prestador_id)
);
CREATE INDEX IF NOT EXISTS demanda_proposta_demanda ON public.demanda_proposta (demanda_id);
CREATE INDEX IF NOT EXISTS demanda_proposta_prestador ON public.demanda_proposta (prestador_id);

CREATE TABLE IF NOT EXISTS public.demanda_proposta_servico (
  id          bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  uid         uuid NOT NULL DEFAULT gen_random_uuid(),
  proposta_id bigint NOT NULL REFERENCES public.demanda_proposta(id) ON DELETE CASCADE,
  service_id  bigint NOT NULL REFERENCES public.services(id),
  tenant_id   uuid DEFAULT auth.fun_auth_current_tenant_id(),
  created_by  uuid NOT NULL DEFAULT auth.fun_auth_user_id(),
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT demanda_proposta_servico_uid_unique UNIQUE (uid),
  CONSTRAINT demanda_proposta_servico_unique UNIQUE (proposta_id, service_id)
);
CREATE INDEX IF NOT EXISTS demanda_proposta_servico_proposta ON public.demanda_proposta_servico (proposta_id);

-- =========================================================================
-- Helpers SECURITY DEFINER pra quebrar a recursão de RLS entre demanda <-> demanda_proposta
-- (cada policy consultando a tabela da outra, direto, causaria "infinite recursion detected" —
-- mesmo padrão de auth.fun_pedido_is_participant no plugin pedidos: rodando como o dono das
-- tabelas, a consulta interna não reavalia RLS, então não há ciclo).
-- =========================================================================
CREATE OR REPLACE FUNCTION auth.fun_demanda_is_cliente(p_demanda_id bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.demanda d
        WHERE d.id = p_demanda_id AND d.cliente_id = auth.fun_auth_user_id()
    );
$$;

CREATE OR REPLACE FUNCTION auth.fun_demanda_prestador_respondeu(p_demanda_id bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.demanda_proposta dp
        WHERE dp.demanda_id = p_demanda_id AND dp.prestador_id = auth.fun_auth_user_id()
    );
$$;

-- =========================================================================
-- RLS
-- =========================================================================
ALTER TABLE public.demanda ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON TABLE public.demanda TO auth_user;
REVOKE UPDATE, DELETE ON TABLE public.demanda FROM auth_user;

DROP POLICY IF EXISTS demanda_select ON public.demanda;
CREATE POLICY demanda_select ON public.demanda FOR SELECT TO auth_user
  USING (
    cliente_id = auth.fun_auth_user_id()
    OR (
      status = 'aberta'
      AND category_id IN (
        SELECT s.category_id FROM public.services s
         WHERE s.created_by = auth.fun_auth_user_id() AND s.active AND s.status = 'active'
      )
    )
    OR auth.fun_demanda_prestador_respondeu(demanda.id)
    OR auth.fun_auth_has_perm('demandas','moderate')
  );

DROP POLICY IF EXISTS demanda_insert ON public.demanda;
CREATE POLICY demanda_insert ON public.demanda FOR INSERT TO auth_user
  WITH CHECK (cliente_id = auth.fun_auth_user_id());

ALTER TABLE public.demanda_moderacao ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.demanda_moderacao TO auth_user;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.demanda_moderacao FROM auth_user;

DROP POLICY IF EXISTS demanda_moderacao_select ON public.demanda_moderacao;
CREATE POLICY demanda_moderacao_select ON public.demanda_moderacao FOR SELECT TO auth_user
  USING (
    auth.fun_auth_has_perm('demandas','moderate')
    OR auth.fun_demanda_is_cliente(demanda_id)
  );

ALTER TABLE public.demanda_proposta ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.demanda_proposta TO auth_user;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.demanda_proposta FROM auth_user;

DROP POLICY IF EXISTS demanda_proposta_select ON public.demanda_proposta;
CREATE POLICY demanda_proposta_select ON public.demanda_proposta FOR SELECT TO auth_user
  USING (
    prestador_id = auth.fun_auth_user_id()
    OR auth.fun_demanda_is_cliente(demanda_id)
  );

ALTER TABLE public.demanda_proposta_servico ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.demanda_proposta_servico TO auth_user;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.demanda_proposta_servico FROM auth_user;

DROP POLICY IF EXISTS demanda_proposta_servico_select ON public.demanda_proposta_servico;
CREATE POLICY demanda_proposta_servico_select ON public.demanda_proposta_servico FOR SELECT TO auth_user
  USING (
    EXISTS (
      SELECT 1 FROM public.demanda_proposta dp
       WHERE dp.id = proposta_id
         AND (dp.prestador_id = auth.fun_auth_user_id() OR auth.fun_demanda_is_cliente(dp.demanda_id))
    )
  );

-- =========================================================================
-- RPCs
-- =========================================================================
CREATE OR REPLACE FUNCTION public.fn_demanda_create(
  p_category_id  bigint,
  p_form_answers jsonb DEFAULT '{}'::jsonb
) RETURNS public.demanda
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $function$
DECLARE
  v_demanda  public.demanda;
  v_form_key text;
BEGIN
  IF p_category_id IS NULL THEN
    RAISE EXCEPTION 'categoria obrigatória' USING errcode = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE id = p_category_id AND active) THEN
    RAISE EXCEPTION 'categoria inválida' USING errcode = '22023';
  END IF;

  INSERT INTO public.demanda (category_id) VALUES (p_category_id)
  RETURNING * INTO v_demanda;

  IF p_form_answers IS NOT NULL AND p_form_answers <> '{}'::jsonb THEN
    SELECT c.request_form_key INTO v_form_key FROM public.categories c WHERE c.id = p_category_id;
    IF v_form_key IS NOT NULL THEN
      PERFORM public.fn_form_result_upsert(v_form_key, 'demanda', v_demanda.uid::text, p_form_answers);
    END IF;
  END IF;

  RETURN v_demanda;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_demanda_create(bigint, jsonb) TO auth_user;

CREATE OR REPLACE FUNCTION public.fn_demanda_moderate(
  p_demanda_id       bigint,
  p_decision         text,
  p_note             text DEFAULT NULL,
  p_rejection_reason text DEFAULT NULL
) RETURNS public.demanda_moderacao
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_row    public.demanda_moderacao;
  v_status text;
BEGIN
  IF NOT auth.fun_auth_has_perm('demandas','moderate') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;
  IF p_decision NOT IN ('approved','rejected','escalated') THEN
    RAISE EXCEPTION 'decisão inválida: %', p_decision USING errcode = '22023';
  END IF;

  v_status := CASE p_decision
    WHEN 'approved' THEN 'aberta'
    WHEN 'rejected' THEN 'rejeitada'
    ELSE 'pending'
  END;

  INSERT INTO public.demanda_moderacao (demanda_id, decision, decision_note, rejection_reason)
  VALUES (
    p_demanda_id, p_decision, NULLIF(btrim(coalesce(p_note,'')),''),
    CASE WHEN p_decision = 'rejected' THEN p_rejection_reason ELSE NULL END
  )
  RETURNING * INTO v_row;

  UPDATE public.demanda SET status = v_status, updated_at = now() WHERE id = p_demanda_id;

  RETURN v_row;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_demanda_moderate(bigint, text, text, text) TO auth_user;

CREATE OR REPLACE FUNCTION public.fn_demanda_propor(
  p_demanda_id  bigint,
  p_service_ids bigint[],
  p_mensagem    text DEFAULT NULL
) RETURNS public.demanda_proposta
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_me       uuid := auth.fun_auth_user_id();
  v_status   text;
  v_proposta public.demanda_proposta;
  v_bad_ct   integer;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'sem sessão' USING errcode = '42501';
  END IF;
  IF p_service_ids IS NULL OR array_length(p_service_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'proposta precisa de pelo menos 1 anúncio' USING errcode = '22023';
  END IF;

  SELECT status INTO v_status FROM public.demanda WHERE id = p_demanda_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'demanda não encontrada' USING errcode = '22023';
  END IF;
  IF v_status <> 'aberta' THEN
    RAISE EXCEPTION 'demanda não está aberta' USING errcode = '22023';
  END IF;

  SELECT count(*) INTO v_bad_ct
    FROM unnest(p_service_ids) sid
    LEFT JOIN public.services s ON s.id = sid AND s.created_by = v_me
   WHERE s.id IS NULL;
  IF v_bad_ct > 0 THEN
    RAISE EXCEPTION 'todo service_id precisa pertencer a você' USING errcode = '22023';
  END IF;

  INSERT INTO public.demanda_proposta (demanda_id, mensagem)
  VALUES (p_demanda_id, NULLIF(btrim(coalesce(p_mensagem,'')),''))
  ON CONFLICT (demanda_id, prestador_id) DO UPDATE
    SET mensagem = EXCLUDED.mensagem, updated_at = now()
  RETURNING * INTO v_proposta;

  DELETE FROM public.demanda_proposta_servico
   WHERE proposta_id = v_proposta.id AND service_id <> ALL(p_service_ids);

  INSERT INTO public.demanda_proposta_servico (proposta_id, service_id)
  SELECT v_proposta.id, sid FROM unnest(p_service_ids) sid
  ON CONFLICT (proposta_id, service_id) DO NOTHING;

  PERFORM auth.fun_notify(
    (SELECT cliente_id FROM public.demanda WHERE id = p_demanda_id),
    'demanda_proposta_recebida', 'Nova proposta na sua demanda',
    NULL, 'demanda', (SELECT uid FROM public.demanda WHERE id = p_demanda_id)::text
  );

  RETURN v_proposta;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_demanda_propor(bigint, bigint[], text) TO auth_user;

CREATE OR REPLACE FUNCTION public.fn_demanda_fechar(p_demanda_id bigint) RETURNS public.demanda
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_demanda public.demanda;
BEGIN
  UPDATE public.demanda SET status = 'fechada', updated_at = now()
   WHERE id = p_demanda_id AND cliente_id = auth.fun_auth_user_id()
   RETURNING * INTO v_demanda;
  IF v_demanda IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;
  RETURN v_demanda;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_demanda_fechar(bigint) TO auth_user;

INSERT INTO auth.permissions (resource, action, name) VALUES
  ('demandas', 'moderate', 'Moderar demandas de clientes')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('demandas', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
