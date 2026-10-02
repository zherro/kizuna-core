-- plugins/tickets/0001_tickets.sql
-- Chamados. O usuário abre (type 'support') e comenta os seus; a equipe (permissão tickets.manage
-- — root sempre) vê todos, muda status e responde. O sistema (service_role, no servidor) abre
-- tickets automáticos (ex.: 'account_recreated', created_by NULL — só a equipe vê).
--
-- Sem funções, views ou triggers: tudo é RLS + GRANT de coluna. Por isso são três tabelas:
--   tickets          — o chamado;
--   ticket_comments  — comentários do USUÁRIO;
--   ticket_replies   — respostas da EQUIPE e registros de troca de status.
-- A regra "o usuário edita/apaga (lógico, deleted_at) o próprio comentário enquanto a equipe não
-- respondeu depois" consulta ticket_replies. Se as respostas ficassem em ticket_comments, a
-- política consultaria a própria tabela — o Postgres recusa ("infinite recursion detected in
-- policy") e só daria para contornar com função SECURITY DEFINER.
-- Mudança de status = UPDATE em tickets + resposta kind 'status_change' (duas escritas, pela tela).
-- Idempotente.

CREATE TABLE IF NOT EXISTS public.tickets (
  id               bigserial PRIMARY KEY,
  uid              uuid NOT NULL DEFAULT gen_random_uuid(),
  type             text NOT NULL DEFAULT 'support'
                   CHECK (type IN ('support', 'account_recreated')),
  title            text NOT NULL CHECK (length(btrim(title)) BETWEEN 3 AND 160),
  description      text,
  status           text NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_by       uuid DEFAULT auth.fun_auth_user_id()
                   REFERENCES auth.users(uid) ON DELETE RESTRICT,
  subject_user_id  uuid REFERENCES auth.users(uid) ON DELETE RESTRICT,
  related_user_id  uuid REFERENCES auth.users(uid) ON DELETE RESTRICT,
  payload          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  resolved_at      timestamptz,
  CONSTRAINT tickets_uid_unique UNIQUE (uid)
);

CREATE INDEX IF NOT EXISTS tickets_created_by_idx ON public.tickets (created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS tickets_status_idx ON public.tickets (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id          bigserial PRIMARY KEY,
  uid         uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id   bigint NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL DEFAULT auth.fun_auth_user_id()
              REFERENCES auth.users(uid) ON DELETE RESTRICT,
  body        text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 4000),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  CONSTRAINT ticket_comments_uid_unique UNIQUE (uid)
);

CREATE INDEX IF NOT EXISTS ticket_comments_ticket_idx
  ON public.ticket_comments (ticket_id, created_at);

CREATE TABLE IF NOT EXISTS public.ticket_replies (
  id          bigserial PRIMARY KEY,
  uid         uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id   bigint NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL DEFAULT auth.fun_auth_user_id()
              REFERENCES auth.users(uid) ON DELETE RESTRICT,
  kind        text NOT NULL DEFAULT 'reply' CHECK (kind IN ('reply', 'status_change')),
  body        text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 4000),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ticket_replies_uid_unique UNIQUE (uid)
);

CREATE INDEX IF NOT EXISTS ticket_replies_ticket_idx
  ON public.ticket_replies (ticket_id, created_at);

-- tickets -------------------------------------------------------------------------------------
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.tickets TO auth_user;
GRANT INSERT (type, title, description) ON TABLE public.tickets TO auth_user;
GRANT UPDATE (status, resolved_at, updated_at) ON TABLE public.tickets TO auth_user;
GRANT USAGE, SELECT ON SEQUENCE public.tickets_id_seq TO auth_user;

DROP POLICY IF EXISTS tickets_select ON public.tickets;
CREATE POLICY tickets_select ON public.tickets FOR SELECT TO auth_user
USING (created_by = auth.fun_auth_user_id() OR auth.fun_auth_has_perm('tickets', 'manage'));

DROP POLICY IF EXISTS tickets_insert ON public.tickets;
CREATE POLICY tickets_insert ON public.tickets FOR INSERT TO auth_user
WITH CHECK (
  created_by = auth.fun_auth_user_id()
  AND status = 'open'
  AND (type = 'support' OR auth.fun_auth_has_perm('tickets', 'manage'))
);

DROP POLICY IF EXISTS tickets_update ON public.tickets;
CREATE POLICY tickets_update ON public.tickets FOR UPDATE TO auth_user
USING (auth.fun_auth_has_perm('tickets', 'manage'))
WITH CHECK (auth.fun_auth_has_perm('tickets', 'manage'));

-- ticket_replies (equipe) ---------------------------------------------------------------------
-- "Ticket visível" = passa na RLS de tickets para quem consulta.
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.ticket_replies TO auth_user;
GRANT INSERT (ticket_id, kind, body) ON TABLE public.ticket_replies TO auth_user;
GRANT UPDATE (body, updated_at) ON TABLE public.ticket_replies TO auth_user;
GRANT USAGE, SELECT ON SEQUENCE public.ticket_replies_id_seq TO auth_user;

DROP POLICY IF EXISTS ticket_replies_select ON public.ticket_replies;
CREATE POLICY ticket_replies_select ON public.ticket_replies FOR SELECT TO auth_user
USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id));

DROP POLICY IF EXISTS ticket_replies_insert ON public.ticket_replies;
CREATE POLICY ticket_replies_insert ON public.ticket_replies FOR INSERT TO auth_user
WITH CHECK (
  auth.fun_auth_has_perm('tickets', 'manage')
  AND author_id = auth.fun_auth_user_id()
  AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id)
);

DROP POLICY IF EXISTS ticket_replies_update ON public.ticket_replies;
CREATE POLICY ticket_replies_update ON public.ticket_replies FOR UPDATE TO auth_user
USING (auth.fun_auth_has_perm('tickets', 'manage') AND author_id = auth.fun_auth_user_id())
WITH CHECK (author_id = auth.fun_auth_user_id());

-- ticket_comments (usuário) -------------------------------------------------------------------
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.ticket_comments TO auth_user;
GRANT INSERT (ticket_id, body) ON TABLE public.ticket_comments TO auth_user;
GRANT UPDATE (body, updated_at, deleted_at) ON TABLE public.ticket_comments TO auth_user;
GRANT USAGE, SELECT ON SEQUENCE public.ticket_comments_id_seq TO auth_user;

-- Apagados: a equipe vê (a tela marca "comentário excluído"); o autor ainda enxerga o PRÓPRIO
-- pela API — o Postgres exige que a linha resultante do UPDATE (o soft delete) passe na política
-- de SELECT — e a tela esconde. Ninguém mais vê.
DROP POLICY IF EXISTS ticket_comments_select ON public.ticket_comments;
CREATE POLICY ticket_comments_select ON public.ticket_comments FOR SELECT TO auth_user
USING (
  EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id)
  AND (
    deleted_at IS NULL
    OR author_id = auth.fun_auth_user_id()
    OR auth.fun_auth_has_perm('tickets', 'manage')
  )
);

-- A equipe responde em ticket_replies — assim "a equipe respondeu" é sempre uma linha lá.
DROP POLICY IF EXISTS ticket_comments_insert ON public.ticket_comments;
CREATE POLICY ticket_comments_insert ON public.ticket_comments FOR INSERT TO auth_user
WITH CHECK (
  NOT auth.fun_auth_has_perm('tickets', 'manage')
  AND author_id = auth.fun_auth_user_id()
  AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id)
);

-- Edita/apaga (lógico) o próprio, não apagado, enquanto não houver resposta da equipe posterior.
DROP POLICY IF EXISTS ticket_comments_update ON public.ticket_comments;
CREATE POLICY ticket_comments_update ON public.ticket_comments FOR UPDATE TO auth_user
USING (
  author_id = auth.fun_auth_user_id()
  AND deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.ticket_replies r
    WHERE r.ticket_id = ticket_comments.ticket_id
      AND r.created_at > ticket_comments.created_at
  )
)
WITH CHECK (author_id = auth.fun_auth_user_id());

-- service_role (servidor): abre tickets do sistema. BYPASSRLS; só GRANTs.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT, INSERT ON TABLE public.tickets TO service_role;
    GRANT USAGE, SELECT ON SEQUENCE public.tickets_id_seq TO service_role;
  END IF;
END
$$;

-- Catálogo de permissão (quem recebe é decisão do projeto; root sempre passa).
INSERT INTO auth.permissions (resource, action, name)
VALUES ('tickets', 'manage', 'Gerenciar chamados (ver todos, mudar status, responder)')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('tickets', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
