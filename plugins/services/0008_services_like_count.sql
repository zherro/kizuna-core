-- plugins/services/0008_services_like_count.sql
-- Contadores denormalizados de "gostei" e "favorito", mantidos por trigger no plugin `swipe`
-- (public.service_user_favorites, uma linha por usuário × serviço × kind). Sem o plugin swipe
-- as colunas ficam em 0. Idempotente.

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS favorite_count integer NOT NULL DEFAULT 0;

NOTIFY pgrst, 'reload schema';
