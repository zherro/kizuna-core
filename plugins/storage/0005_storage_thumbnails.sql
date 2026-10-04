-- plugins/storage/0005_storage_thumbnails.sql
-- Miniatura das imagens, na mesma linha do arquivo: `content` continua sendo a versão grande
-- (detalhe do anúncio, lightbox, swipe) e `thumb_content` guarda uma versão pequena (WebP, até
-- 640px no maior lado, proporção mantida) para cards, busca, carrosséis e galeria do painel.
-- O `id` é o mesmo — nenhuma referência (`extras.images`, `cover_file_id`, avatar…) muda; quem
-- quer a miniatura pede `/content?size=thumb`. Sem miniatura (imagem já pequena, arquivo que não
-- é imagem, ou gravado antes desta migration) a rota devolve `content` mesmo.
--
-- Preenchido no upload (`storage-service.ts` → `optimizeImageWithThumbnail`). O que já existia ou
-- foi gravado direto no banco (ex.: importação por robô) fica sem miniatura até ser reotimizado.

ALTER TABLE public.files ADD COLUMN IF NOT EXISTS thumb_content bytea;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS thumb_size_bytes int;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS thumb_width int;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS thumb_height int;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('storage', '1.4.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
