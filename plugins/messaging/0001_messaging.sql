-- plugins/messaging/0001_messaging.sql
-- Optional. Infra de conversação multicanal. Depende do core (auth.users, auth.tenants,
-- auth.fun_auth_user_id(), auth.fun_auth_current_tenant_id(), auth.fun_auth_has_perm()) E do
-- plugin `user_data` (fn_msg_list_conversations faz LEFT JOIN em public.user_data) — instalar
-- sempre como `--plugins user_data,messaging`.
-- Acesso é SEMPRE por participação (conversation_participant.user_id), nunca por tenant nem por
-- telefone — ver docs/superpowers/specs/2026-09-06-plugin-messaging-multicanal-design.md.
-- Só o canal PLATFORM é exercitado hoje; as colunas/enums de whatsapp/instagram/etc. já existem
-- mas ficam sem uso até o worker de ingestão externa existir.

-- ============================================================================================
-- 1) conversation
-- ============================================================================================
CREATE TABLE IF NOT EXISTS public.conversation (
    id                    bigserial PRIMARY KEY,
    uid                   uuid NOT NULL DEFAULT gen_random_uuid(),
    status                text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','archived')),
    context_type          text,
    context_id            text,
    subject               text,
    created_by            uuid NOT NULL DEFAULT auth.fun_auth_user_id() REFERENCES auth.users(uid) ON DELETE RESTRICT,
    tenant_id             uuid DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
    last_message_at       timestamptz,
    last_message_preview  text,
    last_message_source   text,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT conversation_uid_unique UNIQUE (uid)
);

-- ============================================================================================
-- 2) conversation_participant
-- ============================================================================================
CREATE TABLE IF NOT EXISTS public.conversation_participant (
    id                     bigserial PRIMARY KEY,
    conversation_id        bigint NOT NULL REFERENCES public.conversation(id) ON DELETE CASCADE,
    user_id                uuid NOT NULL REFERENCES auth.users(uid) ON DELETE RESTRICT,
    role                   text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
    last_read_message_id   bigint NOT NULL DEFAULT 0,
    last_read_at           timestamptz,
    muted                  boolean NOT NULL DEFAULT false,
    active                 boolean NOT NULL DEFAULT true,
    joined_at              timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT conversation_participant_unique UNIQUE (conversation_id, user_id)
);

-- ============================================================================================
-- 3) message  — id é o cursor de paginação e delta-sync
-- ============================================================================================
CREATE TABLE IF NOT EXISTS public.message (
    id               bigserial PRIMARY KEY,
    uid              uuid NOT NULL DEFAULT gen_random_uuid(),
    conversation_id  bigint NOT NULL REFERENCES public.conversation(id) ON DELETE CASCADE,
    sender_id        uuid REFERENCES auth.users(uid) ON DELETE SET NULL,
    source           text NOT NULL DEFAULT 'platform'
                     CHECK (source IN ('platform','whatsapp','instagram','telegram','email','system')),
    direction        text NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound','outbound')),
    message_type     text NOT NULL DEFAULT 'text'
                     CHECK (message_type IN ('text','image','video','audio','document','system')),
    content          text,
    metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
    status           text NOT NULL DEFAULT 'sent'
                     CHECK (status IN ('pending','sent','delivered','read','failed')),
    external_id      text,
    external_source  text,
    error_reason     text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT message_uid_unique UNIQUE (uid)
);

-- ============================================================================================
-- 4) message_external_identity
-- ============================================================================================
CREATE TABLE IF NOT EXISTS public.message_external_identity (
    id                   bigserial PRIMARY KEY,
    user_id              uuid REFERENCES auth.users(uid) ON DELETE SET NULL,
    channel              text NOT NULL CHECK (channel IN ('whatsapp','instagram','telegram','email')),
    external_contact_id  text NOT NULL,
    display_name         text,
    verified             boolean NOT NULL DEFAULT false,
    active               boolean NOT NULL DEFAULT true,
    metadata             jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================================
-- Índices
-- ============================================================================================
CREATE INDEX IF NOT EXISTS idx_message_conv_id_desc   ON public.message (conversation_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_message_conv_created    ON public.message (conversation_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_message_external  ON public.message (external_source, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_message_sender          ON public.message (sender_id);
CREATE INDEX IF NOT EXISTS idx_message_pending         ON public.message (status) WHERE status IN ('pending','failed');
CREATE INDEX IF NOT EXISTS idx_participant_user_active ON public.conversation_participant (user_id, active);
CREATE INDEX IF NOT EXISTS idx_conversation_last_msg   ON public.conversation (last_message_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ident_active      ON public.message_external_identity (channel, external_contact_id) WHERE active;

-- ============================================================================================
-- Triggers
-- ============================================================================================
CREATE OR REPLACE FUNCTION public.fun_msg_touch_conversation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.conversation
       SET last_message_at      = NEW.created_at,
           last_message_preview = left(coalesce(NEW.content, ''), 160),
           last_message_source  = NEW.source,
           updated_at           = now()
     WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_message_touch_conversation ON public.message;
CREATE TRIGGER trg_message_touch_conversation
    AFTER INSERT ON public.message
    FOR EACH ROW EXECUTE FUNCTION public.fun_msg_touch_conversation();

CREATE OR REPLACE FUNCTION public.fun_msg_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_conversation_updated_at ON public.conversation;
CREATE TRIGGER trg_conversation_updated_at BEFORE UPDATE ON public.conversation
    FOR EACH ROW EXECUTE FUNCTION public.fun_msg_set_updated_at();
DROP TRIGGER IF EXISTS trg_message_updated_at ON public.message;
CREATE TRIGGER trg_message_updated_at BEFORE UPDATE ON public.message
    FOR EACH ROW EXECUTE FUNCTION public.fun_msg_set_updated_at();

CREATE OR REPLACE FUNCTION public.fun_msg_notify_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM pg_notify('messaging_events', json_build_object(
        'type', CASE WHEN TG_OP = 'INSERT' THEN 'message_created' ELSE 'message_status' END,
        'message_id', NEW.id,
        'conversation_id', NEW.conversation_id,
        'source', NEW.source,
        'direction', NEW.direction,
        'status', NEW.status
    )::text);
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_message_notify ON public.message;
CREATE TRIGGER trg_message_notify
    AFTER INSERT OR UPDATE OF status ON public.message
    FOR EACH ROW EXECUTE FUNCTION public.fun_msg_notify_event();

-- ============================================================================================
-- RLS
-- ============================================================================================
CREATE OR REPLACE FUNCTION auth.fun_msg_is_participant(p_conversation_id bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.conversation_participant
        WHERE conversation_id = p_conversation_id
          AND user_id = auth.fun_auth_user_id()
          AND active
    );
$$;

ALTER TABLE public.conversation                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participant    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_external_identity   ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON TABLE public.conversation             TO auth_user;
GRANT SELECT, INSERT, UPDATE ON TABLE public.conversation_participant TO auth_user;
GRANT SELECT, INSERT          ON TABLE public.message                 TO auth_user;
GRANT SELECT                  ON TABLE public.message_external_identity TO auth_user;
GRANT USAGE, SELECT ON SEQUENCE public.conversation_id_seq, public.conversation_participant_id_seq,
    public.message_id_seq TO auth_user;

DROP POLICY IF EXISTS conversation_select ON public.conversation;
CREATE POLICY conversation_select ON public.conversation FOR SELECT TO auth_user
    USING (auth.fun_msg_is_participant(id) OR auth.fun_auth_has_perm('messaging','manage'));
DROP POLICY IF EXISTS conversation_insert ON public.conversation;
CREATE POLICY conversation_insert ON public.conversation FOR INSERT TO auth_user
    WITH CHECK (created_by = auth.fun_auth_user_id());
DROP POLICY IF EXISTS conversation_update ON public.conversation;
CREATE POLICY conversation_update ON public.conversation FOR UPDATE TO auth_user
    USING (auth.fun_msg_is_participant(id)) WITH CHECK (auth.fun_msg_is_participant(id));

DROP POLICY IF EXISTS participant_select ON public.conversation_participant;
CREATE POLICY participant_select ON public.conversation_participant FOR SELECT TO auth_user
    USING (auth.fun_msg_is_participant(conversation_id) OR auth.fun_auth_has_perm('messaging','manage'));
DROP POLICY IF EXISTS participant_insert ON public.conversation_participant;
CREATE POLICY participant_insert ON public.conversation_participant FOR INSERT TO auth_user
    WITH CHECK (
        user_id = auth.fun_auth_user_id()
        OR EXISTS (SELECT 1 FROM public.conversation c
                   WHERE c.id = conversation_id AND c.created_by = auth.fun_auth_user_id())
    );
DROP POLICY IF EXISTS participant_update ON public.conversation_participant;
CREATE POLICY participant_update ON public.conversation_participant FOR UPDATE TO auth_user
    USING (user_id = auth.fun_auth_user_id()) WITH CHECK (user_id = auth.fun_auth_user_id());

DROP POLICY IF EXISTS message_select ON public.message;
CREATE POLICY message_select ON public.message FOR SELECT TO auth_user
    USING (auth.fun_msg_is_participant(conversation_id) OR auth.fun_auth_has_perm('messaging','manage'));
DROP POLICY IF EXISTS message_insert ON public.message;
CREATE POLICY message_insert ON public.message FOR INSERT TO auth_user
    WITH CHECK (
        auth.fun_msg_is_participant(conversation_id)
        AND sender_id = auth.fun_auth_user_id()
        AND direction = 'outbound'
        AND source = 'platform'
    );

DROP POLICY IF EXISTS identity_select ON public.message_external_identity;
CREATE POLICY identity_select ON public.message_external_identity FOR SELECT TO auth_user
    USING (user_id = auth.fun_auth_user_id() OR auth.fun_auth_has_perm('messaging','manage'));

-- ============================================================================================
-- RPCs
-- ============================================================================================

-- Cria (ou reaproveita) uma conversa 1:1 e insere a primeira mensagem. SECURITY DEFINER: precisa
-- inserir a linha de participante do OUTRO usuário.
CREATE OR REPLACE FUNCTION public.fn_msg_start_conversation(
    p_target_user   uuid,
    p_context_type  text DEFAULT NULL,
    p_context_id    text DEFAULT NULL,
    p_first_message text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_me   uuid := auth.fun_auth_user_id();
    v_conv public.conversation%ROWTYPE;
BEGIN
    IF v_me IS NULL THEN RAISE EXCEPTION 'sem sessão'; END IF;
    IF p_target_user IS NULL OR p_target_user = v_me THEN
        RAISE EXCEPTION 'destinatário inválido';
    END IF;

    SELECT c.* INTO v_conv
      FROM public.conversation c
      JOIN public.conversation_participant p1 ON p1.conversation_id = c.id AND p1.user_id = v_me
      JOIN public.conversation_participant p2 ON p2.conversation_id = c.id AND p2.user_id = p_target_user
     WHERE c.status = 'open'
       AND c.context_type IS NOT DISTINCT FROM p_context_type
       AND c.context_id   IS NOT DISTINCT FROM p_context_id
     ORDER BY c.id DESC
     LIMIT 1;

    IF NOT FOUND THEN
        INSERT INTO public.conversation (context_type, context_id, created_by, tenant_id)
        VALUES (p_context_type, p_context_id, v_me, auth.fun_auth_current_tenant_id())
        RETURNING * INTO v_conv;
        INSERT INTO public.conversation_participant (conversation_id, user_id, role)
        VALUES (v_conv.id, v_me, 'owner'), (v_conv.id, p_target_user, 'member');
    END IF;

    IF p_first_message IS NOT NULL AND length(trim(p_first_message)) > 0 THEN
        INSERT INTO public.message (conversation_id, sender_id, source, direction, content, status)
        VALUES (v_conv.id, v_me, 'platform', 'outbound', p_first_message, 'sent');
    END IF;

    RETURN v_conv.uid;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_msg_start_conversation(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_msg_start_conversation(uuid, text, text, text) TO auth_user;

-- Envia uma mensagem de plataforma. SECURITY DEFINER pra capturar sender do JWT e dedupar por
-- client_token (optimistic retry não duplica).
CREATE OR REPLACE FUNCTION public.fn_msg_send_message(
    p_conversation_id bigint,
    p_content         text,
    p_client_token    text DEFAULT NULL
) RETURNS public.message LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_me  uuid := auth.fun_auth_user_id();
    v_row public.message%ROWTYPE;
BEGIN
    IF v_me IS NULL THEN RAISE EXCEPTION 'sem sessão'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.conversation_participant
                   WHERE conversation_id = p_conversation_id AND user_id = v_me AND active) THEN
        RAISE EXCEPTION 'não é participante da conversa';
    END IF;
    IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
        RAISE EXCEPTION 'mensagem vazia';
    END IF;

    IF p_client_token IS NOT NULL THEN
        SELECT * INTO v_row FROM public.message
         WHERE conversation_id = p_conversation_id
           AND sender_id = v_me
           AND metadata->>'client_token' = p_client_token
           AND created_at > now() - interval '5 minutes'
         LIMIT 1;
        IF FOUND THEN RETURN v_row; END IF;
    END IF;

    INSERT INTO public.message (conversation_id, sender_id, source, direction, content, status, metadata)
    VALUES (p_conversation_id, v_me, 'platform', 'outbound', p_content, 'sent',
            CASE WHEN p_client_token IS NULL THEN '{}'::jsonb
                 ELSE jsonb_build_object('client_token', p_client_token) END)
    RETURNING * INTO v_row;
    RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_msg_send_message(bigint, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_msg_send_message(bigint, text, text) TO auth_user;

CREATE OR REPLACE FUNCTION public.fn_msg_mark_read(
    p_conversation_id bigint,
    p_up_to_message_id bigint
) RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
    UPDATE public.conversation_participant
       SET last_read_message_id = greatest(last_read_message_id, coalesce(p_up_to_message_id, 0)),
           last_read_at = now()
     WHERE conversation_id = p_conversation_id
       AND user_id = auth.fun_auth_user_id();
$$;
REVOKE ALL ON FUNCTION public.fn_msg_mark_read(bigint, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_msg_mark_read(bigint, bigint) TO auth_user;

-- Lista de conversas do caller + last_message + unread_count + outro participante.
CREATE OR REPLACE FUNCTION public.fn_msg_list_conversations(
    p_limit  int DEFAULT 30,
    p_before timestamptz DEFAULT NULL
) RETURNS TABLE (
    id bigint, uid uuid, status text, context_type text, context_id text,
    last_message_at timestamptz, last_message_preview text, last_message_source text,
    unread_count bigint,
    other_uid uuid, other_name text, other_avatar text
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
    WITH me AS (SELECT auth.fun_auth_user_id() AS uid)
    SELECT c.id, c.uid, c.status, c.context_type, c.context_id,
           c.last_message_at, c.last_message_preview, c.last_message_source,
           (SELECT count(*) FROM public.message m
             WHERE m.conversation_id = c.id
               AND m.id > mp.last_read_message_id
               AND (m.sender_id IS DISTINCT FROM (SELECT uid FROM me))) AS unread_count,
           op.user_id AS other_uid,
           coalesce(ud.full_name, '') AS other_name,
           ud.avatar_url AS other_avatar
      FROM public.conversation c
      JOIN public.conversation_participant mp
        ON mp.conversation_id = c.id AND mp.user_id = (SELECT uid FROM me) AND mp.active
      LEFT JOIN public.conversation_participant op
        ON op.conversation_id = c.id AND op.user_id <> (SELECT uid FROM me)
      LEFT JOIN public.user_data ud ON ud.uid = op.user_id
     WHERE (p_before IS NULL OR c.last_message_at < p_before)
     ORDER BY c.last_message_at DESC NULLS LAST, c.id DESC
     LIMIT least(coalesce(p_limit, 30), 100);
$$;
REVOKE ALL ON FUNCTION public.fn_msg_list_conversations(int, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_msg_list_conversations(int, timestamptz) TO auth_user;

-- ============================================================================================
-- Registro do plugin + catálogo de permissão
-- ============================================================================================
INSERT INTO auth.permissions (resource, action, name)
VALUES ('messaging', 'manage', 'Ver e moderar todas as conversas de mensageria')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('messaging', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
