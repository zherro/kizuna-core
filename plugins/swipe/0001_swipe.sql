-- plugins/swipe/0001_swipe.sql
-- Optional. Swipe (curtir/passar) sobre os itens da busca, página /descobrir + /curtidos.
-- Depende de (aplique DEPOIS): `search` (fn_search_services), `services`, `system_config`.
--
--  * `service_user_favorites`: 1 linha por (usuário, item), gravada por upsert pelo resource
--    `service_reactions` (RLS por dono); nunca DELETE físico — "descurtir" grava `skip`.
--  * O deck é a busca (`fn_search_services`) menos o que o usuário já decidiu, montado no cliente;
--    os curtidos vêm do resource `liked_services` (esta tabela com o anúncio embutido).

DO $$
BEGIN
  IF to_regclass('public.service_swipes') IS NOT NULL
     AND to_regclass('public.service_user_favorites') IS NULL THEN
    ALTER TABLE public.service_swipes RENAME TO service_user_favorites;
    ALTER INDEX IF EXISTS public.service_swipes_liked_idx RENAME TO service_user_favorites_liked_idx;
    ALTER TABLE public.service_user_favorites RENAME CONSTRAINT service_swipes_pkey TO service_user_favorites_pkey;
    DROP POLICY IF EXISTS service_swipes_owner ON public.service_user_favorites;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.service_user_favorites (
    user_id      uuid NOT NULL REFERENCES auth.users(uid) ON DELETE RESTRICT,
    service_uid  uuid NOT NULL REFERENCES public.services(uid) ON DELETE RESTRICT,
    action       text NOT NULL CHECK (action IN ('like', 'skip')),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT service_user_favorites_pkey PRIMARY KEY (user_id, service_uid)
);

ALTER TABLE public.service_user_favorites
  ADD COLUMN IF NOT EXISTS uid uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS favorite boolean NOT NULL DEFAULT false;
ALTER TABLE public.service_user_favorites ALTER COLUMN user_id SET DEFAULT auth.fun_auth_user_id();
CREATE UNIQUE INDEX IF NOT EXISTS service_user_favorites_uid_key ON public.service_user_favorites (uid);
ALTER TABLE public.service_user_favorites DROP CONSTRAINT IF EXISTS service_user_favorites_fav_implies_like;
ALTER TABLE public.service_user_favorites
  ADD CONSTRAINT service_user_favorites_fav_implies_like CHECK (NOT favorite OR action = 'like');
CREATE INDEX IF NOT EXISTS service_user_favorites_fav_idx
  ON public.service_user_favorites (user_id, updated_at DESC) WHERE favorite;

-- curtidos do usuário, mais recentes primeiro
CREATE INDEX IF NOT EXISTS service_user_favorites_liked_idx
  ON public.service_user_favorites (user_id, updated_at DESC) WHERE action = 'like';

ALTER TABLE public.service_user_favorites ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.service_user_favorites TO auth_user;
DROP POLICY IF EXISTS service_user_favorites_owner ON public.service_user_favorites;
CREATE POLICY service_user_favorites_owner ON public.service_user_favorites FOR ALL TO auth_user
USING (user_id = auth.fun_auth_user_id())
WITH CHECK (user_id = auth.fun_auth_user_id());

INSERT INTO auth.system_config (key, value)
VALUES ('swipe.skip_ttl_days', '7'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Deck, gravação e curtidos são feitos por resources (service_reactions / liked_services) e pela
-- busca (fn_search_services) — sem funções próprias do swipe. Ver 0003_swipe_drop_functions.sql.

-- Contador denormalizado services.like_count (coluna vem de services/0008). SECURITY DEFINER:
-- auth_user não pode dar UPDATE em services de terceiros; função de trigger, não exposta na API.
CREATE OR REPLACE FUNCTION public.trg_service_like_count() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d integer := 0; v_uid uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_uid := NEW.service_uid; d := CASE WHEN NEW.action = 'like' THEN 1 ELSE 0 END;
  ELSIF TG_OP = 'DELETE' THEN
    v_uid := OLD.service_uid; d := CASE WHEN OLD.action = 'like' THEN -1 ELSE 0 END;
  ELSE
    v_uid := NEW.service_uid;
    d := (CASE WHEN NEW.action = 'like' THEN 1 ELSE 0 END) - (CASE WHEN OLD.action = 'like' THEN 1 ELSE 0 END);
  END IF;
  IF d <> 0 THEN
    UPDATE public.services SET like_count = GREATEST(like_count + d, 0) WHERE uid = v_uid;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS service_user_favorites_like_count ON public.service_user_favorites;
CREATE TRIGGER service_user_favorites_like_count
  AFTER INSERT OR UPDATE OF action OR DELETE ON public.service_user_favorites
  FOR EACH ROW EXECUTE FUNCTION public.trg_service_like_count();

UPDATE public.services s SET like_count = c.n
FROM (SELECT service_uid, count(*)::int AS n FROM public.service_user_favorites WHERE action = 'like' GROUP BY 1) c
WHERE s.uid = c.service_uid AND s.like_count <> c.n;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('swipe', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
