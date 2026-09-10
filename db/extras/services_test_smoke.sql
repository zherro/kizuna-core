-- Roda: docker exec -i postgres_local psql -U myuser -d foco_total_db < kizuna-core/db/extras/services_test_smoke.sql
-- Espera: todos os SELECT '...OK' aparecerem, sem ERROR, e ROLLBACK no fim.
BEGIN;
SET LOCAL request.jwt.claims TO '{"role":"auth_user","sub":"c0e7f2e2-955c-4d90-9f61-e998fa082553","user_id":"c0e7f2e2-955c-4d90-9f61-e998fa082553","tenant_id":"da1035c7-9e0c-44ee-a092-38c3cf07793d"}';

-- 1) tabelas existem
SELECT 'services table OK' WHERE to_regclass('public.services') IS NOT NULL;
SELECT 'service_categories_sub table OK' WHERE to_regclass('public.service_categories_sub') IS NOT NULL;
SELECT 'service_moderations table OK' WHERE to_regclass('public.service_moderations') IS NOT NULL;

-- 2) enums existem
SELECT 'price_unit enum OK' WHERE EXISTS (SELECT 1 FROM pg_type WHERE typname = 'price_unit');
SELECT 'service_status enum OK' WHERE EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_status');

-- 3) permissão registrada
SELECT 'perm OK' FROM auth.permissions WHERE resource = 'services' AND action = 'moderate';

-- 4) plugin registrado
SELECT 'registry OK' FROM auth.plugin_registry WHERE name = 'services';

-- 5) fn_service_moderate deriva o status (root — is_root passa por dentro do perm check)
SET LOCAL request.jwt.claims TO '{"role":"auth_user","sub":"7a19ff79-cf27-4b61-8197-9f7985fb3c76","user_id":"7a19ff79-cf27-4b61-8197-9f7985fb3c76","tenant_id":"da1035c7-9e0c-44ee-a092-38c3cf07793d","is_root":true}';
DO $$
DECLARE v_grp bigint; v_cat bigint; v_svc bigint; v_mod public.service_moderations;
BEGIN
  SELECT id INTO v_grp FROM public.categories_group WHERE active LIMIT 1;
  SELECT id INTO v_cat FROM public.categories WHERE active LIMIT 1;
  INSERT INTO public.services (title, category_group_id, category_id, status)
    VALUES ('Smoke svc', v_grp, v_cat, 'pending') RETURNING id INTO v_svc;

  v_mod := public.fn_service_moderate(v_svc, 'approved', 'ok', NULL);
  ASSERT (SELECT status FROM public.services WHERE id = v_svc) = 'active', 'approved -> active';

  v_mod := public.fn_service_moderate(v_svc, 'rejected', 'no', 'incomplete');
  ASSERT (SELECT status FROM public.services WHERE id = v_svc) = 'archived', 'rejected -> archived';

  v_mod := public.fn_service_moderate(v_svc, 'escalated', NULL, NULL);
  ASSERT (SELECT status FROM public.services WHERE id = v_svc) = 'pending', 'escalated -> pending';

  ASSERT (SELECT count(*) FROM public.service_moderations WHERE service_id = v_svc) = 3, '3 moderations';
  RAISE NOTICE 'fn_service_moderate OK';
END $$;

-- 6) RLS negativo: caller sem services.moderate -> forbidden / insufficient_privilege
SET LOCAL request.jwt.claims TO '{"role":"auth_user","sub":"c0e7f2e2-955c-4d90-9f61-e998fa082553","user_id":"c0e7f2e2-955c-4d90-9f61-e998fa082553","tenant_id":"da1035c7-9e0c-44ee-a092-38c3cf07793d"}';
DO $$
BEGIN
  PERFORM public.fn_service_moderate(1, 'approved', NULL, NULL);
  RAISE EXCEPTION 'esperava forbidden, mas a RPC não levantou';
EXCEPTION
  WHEN insufficient_privilege THEN RAISE NOTICE 'rls deny OK';
END $$;

-- 7) auth_user tem grant de DELETE em service_categories_sub (remoção de especialidade em edição)
--    Nota: a distinção owner/não-owner é via RLS policy (scs_owner_write) e não dá para
--    exercitar aqui — este script roda como superuser (BYPASSRLS) e só seta jwt.claims,
--    sem SET ROLE. Aqui verificamos apenas que o privilégio de tabela existe.
SELECT 'scs DELETE grant OK' WHERE has_table_privilege('auth_user', 'public.service_categories_sub', 'DELETE');

ROLLBACK;
