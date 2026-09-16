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

NOTIFY pgrst, 'reload schema';
