-- plugins/taxonomy/0005_categories_seq_grant.sql
-- O 0001 dá INSERT em public.categories para auth_user, mas não o USAGE na sequência do id
-- (supunha que a tabela vinha do projeto). Sem isso, criar categoria pelo painel falha com
-- "permission denied for sequence categories_id_seq". As demais tabelas do plugin já têm o grant.
-- Idempotente; resolve o nome real da sequência (projeto pode ter criado a tabela por conta própria).

DO $$
DECLARE
  seq text := pg_get_serial_sequence('public.categories', 'id');
BEGIN
  IF seq IS NOT NULL THEN
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO auth_user', seq);
  END IF;
END
$$;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('taxonomy', '1.5.1')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
