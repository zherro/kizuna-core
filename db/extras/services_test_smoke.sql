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
ROLLBACK;
