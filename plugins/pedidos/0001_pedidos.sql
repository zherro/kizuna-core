-- plugins/pedidos/0001_pedidos.sql
-- Plugin: pedidos — o container 1:1 (cliente, prestador) que nasce junto com uma conversation de
-- solicitação e pode acumular varios `services` do mesmo prestador. Depende de `services`
-- (plugin services) e `conversation` (plugin messaging) via FK — por isso NÃO entra em
-- kizuna.plugins.json, é aplicado manualmente pelo db/install.sh depois de services + messaging
-- (ver Task 5). Design: foco-total/docs/superpowers/specs/2026-09-15-plugin-pedidos-design.md

-- =========================================================================
-- 1) Tabelas
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.pedido (
  id                bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  uid               uuid NOT NULL DEFAULT gen_random_uuid(),
  cliente_id        uuid NOT NULL DEFAULT auth.fun_auth_user_id() REFERENCES auth.users(uid) ON DELETE RESTRICT,
  prestador_id      uuid NOT NULL REFERENCES auth.users(uid) ON DELETE RESTRICT,
  conversation_id   bigint NOT NULL REFERENCES public.conversation(id) ON DELETE RESTRICT,
  origem            text NOT NULL CHECK (origem IN ('anuncio','demanda')),
  status            text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','concluido','cancelado')),
  tenant_id         uuid DEFAULT auth.fun_auth_current_tenant_id(),
  created_by        uuid NOT NULL DEFAULT auth.fun_auth_user_id(),
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pedido_uid_unique UNIQUE (uid),
  CONSTRAINT pedido_conversation_unique UNIQUE (conversation_id)
);
CREATE INDEX IF NOT EXISTS pedido_cliente    ON public.pedido (cliente_id);
CREATE INDEX IF NOT EXISTS pedido_prestador  ON public.pedido (prestador_id);

CREATE TABLE IF NOT EXISTS public.pedido_servico (
  id                bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  uid               uuid NOT NULL DEFAULT gen_random_uuid(),
  pedido_id         bigint NOT NULL REFERENCES public.pedido(id) ON DELETE CASCADE,
  service_id        bigint NOT NULL REFERENCES public.services(id),
  status            text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','agendado','concluido','cancelado')),
  agenda_event_id   bigint,
  tenant_id         uuid DEFAULT auth.fun_auth_current_tenant_id(),
  created_by        uuid NOT NULL DEFAULT auth.fun_auth_user_id(),
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pedido_servico_uid_unique UNIQUE (uid),
  CONSTRAINT pedido_servico_unique UNIQUE (pedido_id, service_id)
);
CREATE INDEX IF NOT EXISTS pedido_servico_pedido ON public.pedido_servico (pedido_id);

-- =========================================================================
-- 2) Helper de participação (mesmo padrão de auth.fun_msg_is_participant)
-- =========================================================================
CREATE OR REPLACE FUNCTION auth.fun_pedido_is_participant(p_pedido_id bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.pedido
        WHERE id = p_pedido_id
          AND (cliente_id = auth.fun_auth_user_id() OR prestador_id = auth.fun_auth_user_id())
    );
$$;

-- =========================================================================
-- 3) RLS
-- =========================================================================
ALTER TABLE public.pedido ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.pedido TO auth_user;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.pedido FROM auth_user;

DROP POLICY IF EXISTS pedido_select ON public.pedido;
CREATE POLICY pedido_select ON public.pedido FOR SELECT TO auth_user
  USING (cliente_id = auth.fun_auth_user_id() OR prestador_id = auth.fun_auth_user_id());

ALTER TABLE public.pedido_servico ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.pedido_servico TO auth_user;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.pedido_servico FROM auth_user;

DROP POLICY IF EXISTS pedido_servico_select ON public.pedido_servico;
CREATE POLICY pedido_servico_select ON public.pedido_servico FOR SELECT TO auth_user
  USING (auth.fun_pedido_is_participant(pedido_id));

-- =========================================================================
-- 4) RPCs
-- =========================================================================

CREATE OR REPLACE FUNCTION public.fn_pedido_create(
  p_conversation_id bigint,
  p_prestador_id    uuid,
  p_origem          text,
  p_service_ids     bigint[]
) RETURNS public.pedido
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_pedido  public.pedido;
  v_bad_ct  integer;
BEGIN
  IF p_origem NOT IN ('anuncio','demanda') THEN
    RAISE EXCEPTION 'origem inválida: %', p_origem USING errcode = '22023';
  END IF;
  IF p_service_ids IS NULL OR array_length(p_service_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'pedido precisa de pelo menos 1 serviço' USING errcode = '22023';
  END IF;
  IF NOT auth.fun_msg_is_participant(p_conversation_id) THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  SELECT count(*) INTO v_bad_ct
    FROM unnest(p_service_ids) sid
    LEFT JOIN public.services s ON s.id = sid AND s.created_by = p_prestador_id
   WHERE s.id IS NULL;
  IF v_bad_ct > 0 THEN
    RAISE EXCEPTION 'todo service_id precisa pertencer a p_prestador_id' USING errcode = '22023';
  END IF;

  INSERT INTO public.pedido (cliente_id, prestador_id, conversation_id, origem)
  VALUES (auth.fun_auth_user_id(), p_prestador_id, p_conversation_id, p_origem)
  RETURNING * INTO v_pedido;

  INSERT INTO public.pedido_servico (pedido_id, service_id)
  SELECT v_pedido.id, sid FROM unnest(p_service_ids) sid;

  PERFORM auth.fun_notify(
    p_prestador_id, 'pedido_criado', 'Novo pedido recebido',
    NULL, 'pedido', v_pedido.uid::text
  );

  RETURN v_pedido;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_pedido_create(bigint, uuid, text, bigint[]) TO auth_user;

CREATE OR REPLACE FUNCTION public.fn_pedido_add_servico(
  p_pedido_id bigint,
  p_service_id bigint
) RETURNS public.pedido_servico
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_row  public.pedido_servico;
  v_pres uuid;
BEGIN
  IF NOT auth.fun_pedido_is_participant(p_pedido_id) THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  SELECT prestador_id INTO v_pres FROM public.pedido WHERE id = p_pedido_id;
  IF NOT EXISTS (SELECT 1 FROM public.services WHERE id = p_service_id AND created_by = v_pres) THEN
    RAISE EXCEPTION 'serviço não pertence ao prestador deste pedido' USING errcode = '22023';
  END IF;

  INSERT INTO public.pedido_servico (pedido_id, service_id)
  VALUES (p_pedido_id, p_service_id)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_pedido_add_servico(bigint, bigint) TO auth_user;

CREATE OR REPLACE FUNCTION public.fn_pedido_servico_atualizar_status(
  p_pedido_servico_id bigint,
  p_status             text
) RETURNS public.pedido_servico
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_row        public.pedido_servico;
  v_pedido_id  bigint;
  v_cliente    uuid;
  v_prestador  uuid;
  v_other      uuid;
  v_open_ct    integer;
  v_done_ct    integer;
BEGIN
  IF p_status NOT IN ('pendente','agendado','concluido','cancelado') THEN
    RAISE EXCEPTION 'status inválido: %', p_status USING errcode = '22023';
  END IF;

  SELECT pedido_id INTO v_pedido_id FROM public.pedido_servico WHERE id = p_pedido_servico_id;
  IF v_pedido_id IS NULL OR NOT auth.fun_pedido_is_participant(v_pedido_id) THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  UPDATE public.pedido_servico SET status = p_status, updated_at = now()
   WHERE id = p_pedido_servico_id
   RETURNING * INTO v_row;

  SELECT cliente_id, prestador_id INTO v_cliente, v_prestador FROM public.pedido WHERE id = v_pedido_id;
  v_other := CASE WHEN auth.fun_auth_user_id() = v_cliente THEN v_prestador ELSE v_cliente END;

  IF p_status = 'concluido' THEN
    PERFORM auth.fun_notify(
      v_other, 'pedido_servico_concluido', 'Um serviço do seu pedido foi concluído',
      NULL, 'pedido', (SELECT uid FROM public.pedido WHERE id = v_pedido_id)::text
    );
  END IF;

  -- Derivação de §3.1 do spec: fecha o pedido quando nenhum serviço está pendente/agendado E
  -- pelo menos um está concluído. Se todos cancelados (sem nenhum concluído), não fecha sozinho.
  SELECT count(*) FILTER (WHERE status IN ('pendente','agendado')),
         count(*) FILTER (WHERE status = 'concluido')
    INTO v_open_ct, v_done_ct
    FROM public.pedido_servico WHERE pedido_id = v_pedido_id;

  IF v_open_ct = 0 AND v_done_ct > 0 THEN
    UPDATE public.pedido SET status = 'concluido', updated_at = now() WHERE id = v_pedido_id;
  END IF;

  RETURN v_row;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_pedido_servico_atualizar_status(bigint, text) TO auth_user;

CREATE OR REPLACE FUNCTION public.fn_pedido_cancelar(p_pedido_id bigint) RETURNS public.pedido
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_pedido public.pedido;
  v_other  uuid;
BEGIN
  IF NOT auth.fun_pedido_is_participant(p_pedido_id) THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  UPDATE public.pedido SET status = 'cancelado', updated_at = now()
   WHERE id = p_pedido_id
   RETURNING * INTO v_pedido;

  v_other := CASE WHEN auth.fun_auth_user_id() = v_pedido.cliente_id
                   THEN v_pedido.prestador_id ELSE v_pedido.cliente_id END;
  PERFORM auth.fun_notify(
    v_other, 'pedido_cancelado', 'Um pedido foi cancelado', NULL, 'pedido', v_pedido.uid::text
  );

  RETURN v_pedido;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_pedido_cancelar(bigint) TO auth_user;

-- =========================================================================
-- 5) Registro do plugin
-- =========================================================================
INSERT INTO auth.plugin_registry (name, version)
VALUES ('pedidos', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
