-- plugins/services/0012_services_links_guard.sql
-- Código e vínculos do anúncio: `services.extras.codigo`, `extras.tags` e `extras.vinculosTitulo`.
-- Quem pode escrever: só quem tem a permissão `services.link` (root passa por padrão; a permissão
-- não é concedida a nenhum papel aqui — o dono concede depois pelo RBAC). Sessões de sistema
-- (importação/robô como superusuário, sem JWT) passam.
--
-- Aditivo e idempotente:
--   1) permissão `services.link` em auth.permissions;
--   2) função + trigger BEFORE INSERT OR UPDATE OF extras em public.services:
--      a) VALIDAÇÃO (para todos, inclusive root e sistema), só do valor que mudou:
--         codigo ^[a-z0-9][a-z0-9._-]{0,59}$; tags = array de até 10 strings
--         ^[a-z0-9][a-z0-9:._-]{0,59}$; vinculosTitulo = string de até 60 caracteres → 22023;
--      b) PERMISSÃO: se alguma das três chaves mudou (ausente, null, '' e [] contam como vazio),
--         exige `services.link` ou sessão de sistema → senão 42501. Reenviar os mesmos valores
--         (read-merge-write do wizard) e editar outras colunas/chaves passa;
--   3) índice UNIQUE parcial GLOBAL de `extras->>'codigo'` entre anúncios ativos e não arquivados,
--      criado só se não houver duplicata (senão WARNING e segue, sem abortar a migração; depois de
--      corrigir é preciso executar este arquivo de novo, `db migrate` não o reexecuta).
-- Sessão de sistema = sem `user_id` no JWT e papel diferente de `anon`/`auth_user` (superusuário do
-- importador, jobs SECURITY DEFINER, service_role). `anon`/`auth_user` sem usuário NÃO passam.

INSERT INTO auth.permissions (resource, action, name) VALUES
  ('services', 'link', 'Definir código e vínculos do anúncio')
ON CONFLICT (resource, action) DO NOTHING;

CREATE OR REPLACE FUNCTION public.fn_services_extras_links_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, auth
AS $function$
DECLARE
  v_key     text;
  v_new     jsonb;
  v_old     jsonb;
  v_el      jsonb;
  v_changed boolean := false;
  v_claims  text := nullif(current_setting('request.jwt.claims', true), '');
  v_uid     text;
BEGIN
  FOREACH v_key IN ARRAY ARRAY['codigo', 'tags', 'vinculosTitulo'] LOOP
    v_new := NEW.extras -> v_key;
    v_old := CASE WHEN TG_OP = 'UPDATE' THEN OLD.extras -> v_key END;
    -- ausente, null, '' e [] são "vazio"
    IF v_new IS NOT NULL AND (v_new = 'null'::jsonb OR v_new = '""'::jsonb OR v_new = '[]'::jsonb) THEN
      v_new := NULL;
    END IF;
    IF v_old IS NOT NULL AND (v_old = 'null'::jsonb OR v_old = '""'::jsonb OR v_old = '[]'::jsonb) THEN
      v_old := NULL;
    END IF;
    CONTINUE WHEN v_new IS NOT DISTINCT FROM v_old;
    v_changed := true;
    CONTINUE WHEN v_new IS NULL;  -- limpar o campo não precisa validar formato

    IF v_key = 'codigo' THEN
      IF jsonb_typeof(v_new) <> 'string' OR (v_new #>> '{}') !~ '^[a-z0-9][a-z0-9._-]{0,59}$' THEN
        RAISE EXCEPTION 'código inválido: use minúsculas, números, ponto, hífen ou sublinhado (até 60 caracteres)'
          USING ERRCODE = '22023';
      END IF;
    ELSIF v_key = 'tags' THEN
      IF jsonb_typeof(v_new) <> 'array' OR jsonb_array_length(v_new) > 10 THEN
        RAISE EXCEPTION 'tags inválidas: lista de até 10 itens' USING ERRCODE = '22023';
      END IF;
      FOR v_el IN SELECT value FROM jsonb_array_elements(v_new) LOOP
        IF jsonb_typeof(v_el) <> 'string' OR (v_el #>> '{}') !~ '^[a-z0-9][a-z0-9:._-]{0,59}$' THEN
          RAISE EXCEPTION 'tag inválida: use minúsculas, números, dois-pontos, ponto, hífen ou sublinhado (até 60 caracteres)'
            USING ERRCODE = '22023';
        END IF;
      END LOOP;
    ELSE
      IF jsonb_typeof(v_new) <> 'string' OR char_length(v_new #>> '{}') > 60 THEN
        RAISE EXCEPTION 'título dos vinculados inválido: texto de até 60 caracteres' USING ERRCODE = '22023';
      END IF;
    END IF;
  END LOOP;

  IF NOT v_changed THEN
    RETURN NEW;
  END IF;

  -- sessão de sistema: sem usuário no JWT e papel que não é de requisição pública
  IF v_claims IS NOT NULL THEN
    BEGIN
      v_uid := v_claims::jsonb ->> 'user_id';
    EXCEPTION WHEN others THEN
      v_uid := NULL;
    END;
  END IF;
  IF v_uid IS NULL AND current_user NOT IN ('anon', 'auth_user') THEN
    RETURN NEW;
  END IF;

  IF auth.fun_auth_has_perm('services', 'link') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'sem permissão para definir código/vínculos do anúncio' USING ERRCODE = '42501';
END;
$function$;

DROP TRIGGER IF EXISTS trg_services_extras_links_guard ON public.services;
CREATE TRIGGER trg_services_extras_links_guard
  BEFORE INSERT OR UPDATE OF extras ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.fn_services_extras_links_guard();

-- Unicidade GLOBAL do código entre anúncios não arquivados (a busca do organizador e o carrossel de
-- vinculados não filtram por tenant, então o índice também não). Não aborta a migração se já houver
-- duplicata: emite WARNING e pula. Uma versão antiga deste índice (por tenant) é substituída.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public' AND indexname = 'services_extras_codigo_uniq'
       AND indexdef LIKE '%tenant_id%'
  ) THEN
    DROP INDEX public.services_extras_codigo_uniq;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.services
     WHERE active AND status <> 'archived' AND (extras ->> 'codigo') IS NOT NULL
     GROUP BY (extras ->> 'codigo')
    HAVING count(*) > 1
  ) THEN
    RAISE WARNING 'services_extras_codigo_uniq NAO foi criado: ha extras.codigo repetido entre anuncios ativos nao arquivados. Liste com: SELECT extras->>''codigo'' AS codigo, count(*), array_agg(uid) FROM public.services WHERE active AND status <> ''archived'' AND (extras->>''codigo'') IS NOT NULL GROUP BY 1 HAVING count(*) > 1;  Corrija (troque o codigo ou arquive os repetidos) e EXECUTE ESTE ARQUIVO DE NOVO (plugins/services/0012_services_links_guard.sql ou db/extras/pendentes_services_tags.sql). `db migrate` NAO o reexecuta: a versao do plugin services ja foi atualizada.';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS services_extras_codigo_uniq
      ON public.services ((extras ->> 'codigo'))
      WHERE active AND status <> 'archived' AND (extras ->> 'codigo') IS NOT NULL;
  END IF;
END
$$;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('services', '1.7.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
