-- plugins/tickets/rls-check.sql — roteiro MANUAL de verificação das RLS (não é migration).
-- Uso: psql "$DATABASE_URL" -v usr=<uid de um usuário comum> -v root=<uid de um root>
--        -v ON_ERROR_STOP=1 -f kizuna-core/plugins/tickets/rls-check.sql
-- Roda numa transação com ROLLBACK: nada fica gravado. Cada SELECT final mostra o valor obtido e
-- o esperado; a última linha diz se tudo bateu.

BEGIN;

CREATE TEMP TABLE rls_result (check_name text, got text, expected text) ON COMMIT DROP;
GRANT ALL ON rls_result TO auth_user;

-- Ticket do sistema (como o servidor faria, sem RLS).
INSERT INTO public.tickets (type, title, created_by, subject_user_id)
VALUES ('account_recreated', 'Conta recriada: teste', NULL, :'usr');

-- ---------- usuário ----------
SET LOCAL ROLE auth_user;
SELECT set_config('request.jwt.claims',
  json_build_object('user_id', :'usr', 'role', 'auth_user')::text, true);

INSERT INTO public.tickets (title, description) VALUES ('Meu chamado', 'teste');
INSERT INTO rls_result SELECT 'usuario ve so o proprio ticket', count(*)::text, '1' FROM public.tickets;

UPDATE public.tickets SET status = 'resolved';
INSERT INTO rls_result SELECT 'usuario nao muda status', count(*)::text, '0'
FROM public.tickets WHERE status = 'resolved';

INSERT INTO public.ticket_comments (ticket_id, body)
SELECT id, 'primeiro' FROM public.tickets WHERE title = 'Meu chamado';
UPDATE public.ticket_comments SET body = 'primeiro (editado)', updated_at = now();
INSERT INTO rls_result SELECT 'usuario edita antes da resposta', body, 'primeiro (editado)'
FROM public.ticket_comments;

-- ---------- equipe responde (pela RLS, como root) ----------
SELECT set_config('request.jwt.claims',
  json_build_object('user_id', :'root', 'role', 'auth_user', 'is_root', true)::text, true);
INSERT INTO rls_result SELECT 'equipe ve ticket do sistema', count(*)::text, '2' FROM public.tickets;
INSERT INTO public.ticket_replies (ticket_id, body)
SELECT id, 'resposta da equipe' FROM public.tickets WHERE title = 'Meu chamado';
-- Numa transação now() é fixo: põe a resposta depois do "primeiro" comentário.
RESET ROLE;
UPDATE public.ticket_replies SET created_at = now() + interval '1 second';
SET LOCAL ROLE auth_user;
UPDATE public.tickets SET status = 'in_progress', updated_at = now() WHERE title = 'Meu chamado';
INSERT INTO rls_result SELECT 'equipe muda status', status, 'in_progress'
FROM public.tickets WHERE title = 'Meu chamado';

-- ---------- usuário depois da resposta ----------
SELECT set_config('request.jwt.claims',
  json_build_object('user_id', :'usr', 'role', 'auth_user')::text, true);
INSERT INTO rls_result SELECT 'usuario ve a resposta', count(*)::text, '1' FROM public.ticket_replies;
UPDATE public.ticket_comments SET deleted_at = now();
INSERT INTO rls_result SELECT 'usuario nao apaga apos resposta', count(*)::text, '0'
FROM public.ticket_comments WHERE deleted_at IS NOT NULL;

-- comentário novo (depois da resposta) pode ser apagado
INSERT INTO public.ticket_comments (ticket_id, body)
SELECT id, 'segundo' FROM public.tickets WHERE title = 'Meu chamado';
RESET ROLE; -- o "segundo" fica depois da resposta (que está em now() + 1s)
UPDATE public.ticket_comments SET created_at = now() + interval '2 seconds' WHERE body = 'segundo';
SET LOCAL ROLE auth_user;
SELECT set_config('request.jwt.claims',
  json_build_object('user_id', :'usr', 'role', 'auth_user')::text, true);
UPDATE public.ticket_comments SET deleted_at = now() WHERE body = 'segundo';
INSERT INTO rls_result SELECT 'usuario apaga antes da resposta', count(*)::text, '1'
FROM public.ticket_comments WHERE deleted_at IS NOT NULL;
UPDATE public.ticket_comments SET deleted_at = NULL WHERE body = 'segundo';
INSERT INTO rls_result SELECT 'apagado nao volta', count(*)::text, '1'
FROM public.ticket_comments WHERE deleted_at IS NOT NULL;

-- ---------- equipe vê o apagado ----------
SELECT set_config('request.jwt.claims',
  json_build_object('user_id', :'root', 'role', 'auth_user', 'is_root', true)::text, true);
INSERT INTO rls_result SELECT 'equipe ve o apagado', count(*)::text, '2' FROM public.ticket_comments;

RESET ROLE;
SELECT check_name, got, expected, CASE WHEN got = expected THEN 'ok' ELSE 'FALHOU' END AS status
FROM rls_result;
SELECT CASE WHEN bool_and(got = expected) THEN 'TUDO OK' ELSE 'HA FALHAS' END AS resultado
FROM rls_result;

ROLLBACK;
