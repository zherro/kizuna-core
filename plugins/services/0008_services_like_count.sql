-- plugins/services/0008_services_like_count.sql
-- Contador denormalizado de "gostei", mantido por trigger no plugin `swipe`
-- (public.service_user_favorites). Sem o plugin swipe a coluna fica em 0. Idempotente.

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;

NOTIFY pgrst, 'reload schema';
