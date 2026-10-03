-- plugins/tickets/0002_tickets_owner_email_attachments.sql
-- 1) Dono do chamado = E-MAIL. `tickets.owner_email` guarda o login (e-mail) de quem abriu e é a
--    chave que liga o chamado ao usuário dono: a RLS compara com a claim `login` do JWT da sessão
--    (assinada pelo servidor), não com o uid. Assim quem recria a conta com o mesmo e-mail volta a
--    ver os próprios chamados. Chamados do sistema (service_role) ficam com owner_email NULL —
--    só a equipe os vê. `created_by` continua gravado, só como auditoria.
-- 2) Anexos: até 3 imagens (ids de public.files, purpose 'ticket_attachment') no chamado, em cada
--    comentário do usuário e em cada resposta da equipe — coluna `image_ids uuid[]` + CHECK.
-- Sem função/view/trigger novos: a claim é lida inline com current_setting. Idempotente.

-- E-mail (login) da sessão, normalizado. Mesma expressão no DEFAULT e nas políticas.
-- lower(nullif(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'login', ''))

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS owner_email text
  DEFAULT lower(nullif(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'login', ''));
ALTER TABLE public.tickets
  ALTER COLUMN owner_email
  SET DEFAULT lower(nullif(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'login', ''));

-- Chamados anteriores: o e-mail do autor (conta excluída guarda o original em deleted_login).
UPDATE public.tickets t
SET owner_email = lower(coalesce(u.deleted_login, u.login))
FROM auth.users u
WHERE t.owner_email IS NULL AND t.created_by IS NOT NULL AND u.uid = t.created_by;

-- 3) Contato público: o visitante (sem login) abre chamado pela página /contato. O servidor grava
--    com service_role: type 'contact', created_by NULL, owner_email = e-mail informado, mais nome
--    e telefone. Quem entrar depois com esse e-mail passa a ver o chamado (a chave é o e-mail).
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS contact_phone text;

ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_type_check;
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_type_check CHECK (type IN ('support', 'account_recreated', 'contact'));

-- 4) SLA: prazo da primeira resposta (3 dias úteis; denúncia 1), calculado pelo servidor na criação
--    (sem função/trigger no banco) e gravado aqui. Chamados antigos: criação + 3 dias corridos.
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_due_at timestamptz;
UPDATE public.tickets SET sla_due_at = created_at + interval '3 days'
WHERE sla_due_at IS NULL AND type <> 'account_recreated';
GRANT INSERT (sla_due_at) ON TABLE public.tickets TO auth_user;

CREATE INDEX IF NOT EXISTS tickets_owner_email_idx ON public.tickets (owner_email, created_at DESC);

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS image_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.ticket_comments ADD COLUMN IF NOT EXISTS image_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.ticket_replies ADD COLUMN IF NOT EXISTS image_ids uuid[] NOT NULL DEFAULT '{}';

ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_image_ids_max3;
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_image_ids_max3 CHECK (cardinality(image_ids) <= 3);
ALTER TABLE public.ticket_comments DROP CONSTRAINT IF EXISTS ticket_comments_image_ids_max3;
ALTER TABLE public.ticket_comments
  ADD CONSTRAINT ticket_comments_image_ids_max3 CHECK (cardinality(image_ids) <= 3);
ALTER TABLE public.ticket_replies DROP CONSTRAINT IF EXISTS ticket_replies_image_ids_max3;
ALTER TABLE public.ticket_replies
  ADD CONSTRAINT ticket_replies_image_ids_max3 CHECK (cardinality(image_ids) <= 3);

-- Só no INSERT: anexo não é editado depois (UPDATE continua só em body/status...).
GRANT INSERT (image_ids) ON TABLE public.tickets TO auth_user;
GRANT INSERT (image_ids) ON TABLE public.ticket_comments TO auth_user;
GRANT INSERT (image_ids) ON TABLE public.ticket_replies TO auth_user;

-- Dono = e-mail da sessão (ou equipe). As políticas de comentários/respostas consultam `tickets`
-- ("ticket visível"), então herdam a regra sem mudança.
DROP POLICY IF EXISTS tickets_select ON public.tickets;
CREATE POLICY tickets_select ON public.tickets FOR SELECT TO auth_user
USING (
  owner_email = lower(nullif(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'login', ''))
  OR auth.fun_auth_has_perm('tickets', 'manage')
);

-- Quem abre grava o PRÓPRIO e-mail (default da sessão); não dá para abrir chamado em nome de outro.
DROP POLICY IF EXISTS tickets_insert ON public.tickets;
CREATE POLICY tickets_insert ON public.tickets FOR INSERT TO auth_user
WITH CHECK (
  created_by = auth.fun_auth_user_id()
  AND owner_email = lower(nullif(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'login', ''))
  AND status = 'open'
  AND (type = 'support' OR auth.fun_auth_has_perm('tickets', 'manage'))
);

-- service_role (servidor) abre o chamado do contato público (já tem INSERT/SELECT desde a 0001).
-- Visitante (anon) nunca escreve direto: só pela rota /api/contact, que valida e limita.

INSERT INTO auth.plugin_registry (name, version)
VALUES ('tickets', '1.1.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
