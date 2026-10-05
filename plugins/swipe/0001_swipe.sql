-- plugins/swipe/0001_swipe.sql
-- Optional. Swipe (curtir/passar) sobre os itens da busca, página /descobrir + /curtidos.
-- Depende de (aplique DEPOIS): `search` (fn_search_services), `services`, `system_config`.
--
--  * `service_user_favorites`: 1 linha por (usuário, item, kind). `kind` é o enum
--    `service_reaction_kind` (`like` = gostei/curtido, `favorite` = favorito, `skip` = passou no
--    swipe). Nunca DELETE físico — remover curtida/favorito vira `active = false`. Os totais
--    ficam em `services.like_count` / `services.favorite_count`, mantidos por trigger.
--    "Descurtir" no swipe (`fn_swipe_record(..., 'unlike')`) desativa o `like` e grava `skip`
--    (o item volta ao deck depois do TTL). Um `skip` nunca mexe no `like`.
--  * `fn_swipe_deck`: embrulha `fn_search_services` (mesmos filtros, página 0, até 1000
--    candidatos) e tira: curtidos, passados há menos de `swipe.skip_ttl_days` e `p_exclude`
--    (cards que o cliente já tem no buffer). Sempre página 0: o que já foi
--    decidido sai pelo anti-join, então offset não é necessário (e daria pulos/repetições).
--    `p_price_min/p_price_max` aplicam a faixa de preço que o /busca filtra no cliente.
--  * Usuário vem da sessão (`auth.fun_auth_user_id()`, NULL para anon), nunca de parâmetro.

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'service_reaction_kind'
  ) THEN
    CREATE TYPE public.service_reaction_kind AS ENUM ('like', 'favorite', 'skip');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.service_user_favorites (
    uid          uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL DEFAULT auth.fun_auth_user_id() REFERENCES auth.users(uid) ON DELETE RESTRICT,
    service_uid  uuid NOT NULL REFERENCES public.services(uid) ON DELETE RESTRICT,
    kind         public.service_reaction_kind NOT NULL,
    active       boolean NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT service_user_favorites_pkey PRIMARY KEY (user_id, service_uid, kind)
);

-- Migração do formato antigo (1 linha por usuário × serviço, `action` like|skip + `favorite`
-- boolean) para 1 linha por usuário × serviço × kind. Roda uma vez: só quando `action` existe.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'service_user_favorites' AND column_name = 'action'
  ) THEN
    DROP TRIGGER IF EXISTS service_user_favorites_like_count ON public.service_user_favorites;
    ALTER TABLE public.service_user_favorites
      DROP CONSTRAINT IF EXISTS service_user_favorites_fav_implies_like,
      DROP CONSTRAINT IF EXISTS service_user_favorites_pkey,
      ADD COLUMN IF NOT EXISTS uid uuid NOT NULL DEFAULT gen_random_uuid(),
      ADD COLUMN IF NOT EXISTS favorite boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS kind public.service_reaction_kind,
      ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
    DROP INDEX IF EXISTS public.service_user_favorites_uid_key;
    DROP INDEX IF EXISTS public.service_user_favorites_liked_idx;
    DROP INDEX IF EXISTS public.service_user_favorites_fav_idx;

    UPDATE public.service_user_favorites SET kind = action::public.service_reaction_kind, created_at = updated_at;
    INSERT INTO public.service_user_favorites (user_id, service_uid, action, kind, active, created_at, updated_at)
    SELECT user_id, service_uid, action, 'favorite', true, updated_at, updated_at
    FROM public.service_user_favorites
    WHERE favorite;

    ALTER TABLE public.service_user_favorites
      DROP COLUMN action,
      DROP COLUMN favorite,
      ALTER COLUMN kind SET NOT NULL,
      ALTER COLUMN user_id SET DEFAULT auth.fun_auth_user_id(),
      ADD CONSTRAINT service_user_favorites_pkey PRIMARY KEY (user_id, service_uid, kind);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS service_user_favorites_uid_key ON public.service_user_favorites (uid);
-- reações ativas do usuário, mais recentes primeiro (/curtidos, deck)
CREATE INDEX IF NOT EXISTS service_user_favorites_user_idx
  ON public.service_user_favorites (user_id, updated_at DESC) WHERE active;
-- quem reagiu a um anúncio (rastreio por usuário / analytics)
CREATE INDEX IF NOT EXISTS service_user_favorites_service_idx
  ON public.service_user_favorites (service_uid, kind) WHERE active;

ALTER TABLE public.service_user_favorites ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.service_user_favorites TO auth_user;
DROP POLICY IF EXISTS service_user_favorites_owner ON public.service_user_favorites;
CREATE POLICY service_user_favorites_owner ON public.service_user_favorites FOR ALL TO auth_user
USING (user_id = auth.fun_auth_user_id())
WITH CHECK (user_id = auth.fun_auth_user_id());

INSERT INTO auth.system_config (key, value)
VALUES ('swipe.skip_ttl_days', '7'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- fn_swipe_deck e fn_swipe_liked vivem em 0002/0003 (assinaturas atuais); aqui só some com as
-- assinaturas antigas.
DROP FUNCTION IF EXISTS public.fn_swipe_deck(character varying, integer, character varying, bigint, jsonb, text, double precision, integer, text, uuid[]);
DROP FUNCTION IF EXISTS public.fn_swipe_liked(integer, integer);

DROP FUNCTION IF EXISTS public.fn_swipe_record(uuid[], text);

-- like   → linha `like` ativa (não mexe no `skip`).
-- skip   → linha `skip` ativa com updated_at = now() (TTL do deck). Nunca toca no `like`.
-- unlike → `like` inativo + `skip` novo (o item volta ao deck depois do TTL).
CREATE OR REPLACE FUNCTION public.fn_swipe_record(p_service_uids uuid[], p_action text)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_user uuid := auth.fun_auth_user_id();
  v_count integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'login necessario' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('like', 'skip', 'unlike') THEN
    RAISE EXCEPTION 'action invalida: %', p_action USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_action = 'unlike' THEN
    UPDATE public.service_user_favorites
       SET active = false, updated_at = now()
     WHERE user_id = v_user AND service_uid = ANY(p_service_uids) AND kind = 'like' AND active;
  END IF;

  INSERT INTO public.service_user_favorites (user_id, service_uid, kind, active, updated_at)
  SELECT v_user, s.uid,
         (CASE WHEN p_action = 'like' THEN 'like' ELSE 'skip' END)::public.service_reaction_kind,
         true, now()
  FROM public.services s
  WHERE s.uid = ANY(p_service_uids)
  ON CONFLICT (user_id, service_uid, kind)
  DO UPDATE SET active = true, updated_at = EXCLUDED.updated_at;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_swipe_record(uuid[], text) TO auth_user;

-- Contadores denormalizados services.like_count / favorite_count (colunas de services/0008).
-- Só linhas ativas contam; desativar (remover curtida/favorito) decrementa. SECURITY DEFINER:
-- auth_user não pode dar UPDATE em services de terceiros; função de trigger, não exposta na API.
DROP TRIGGER IF EXISTS service_user_favorites_like_count ON public.service_user_favorites;
DROP FUNCTION IF EXISTS public.trg_service_like_count();

CREATE OR REPLACE FUNCTION public.trg_service_reaction_count() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old integer := 0;
  v_new integer := 0;
  v_kind public.service_reaction_kind;
  v_uid uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    v_old := CASE WHEN OLD.active THEN 1 ELSE 0 END; v_kind := OLD.kind; v_uid := OLD.service_uid;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    v_new := CASE WHEN NEW.active THEN 1 ELSE 0 END; v_kind := NEW.kind; v_uid := NEW.service_uid;
  END IF;
  IF v_new = v_old THEN
    RETURN NULL;
  END IF;
  IF v_kind = 'like' THEN
    UPDATE public.services SET like_count = GREATEST(like_count + v_new - v_old, 0) WHERE uid = v_uid;
  ELSIF v_kind = 'favorite' THEN
    UPDATE public.services SET favorite_count = GREATEST(favorite_count + v_new - v_old, 0) WHERE uid = v_uid;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS service_user_favorites_count ON public.service_user_favorites;
CREATE TRIGGER service_user_favorites_count
  AFTER INSERT OR UPDATE OF active OR DELETE ON public.service_user_favorites
  FOR EACH ROW EXECUTE FUNCTION public.trg_service_reaction_count();

-- Recalcula os contadores (idempotente; corrige qualquer deriva e a migração do formato antigo).
UPDATE public.services s
   SET like_count = COALESCE(c.likes, 0), favorite_count = COALESCE(c.favs, 0)
  FROM public.services s2
  LEFT JOIN (
    SELECT service_uid,
           count(*) FILTER (WHERE kind = 'like')::int     AS likes,
           count(*) FILTER (WHERE kind = 'favorite')::int AS favs
    FROM public.service_user_favorites
    WHERE active
    GROUP BY 1
  ) c ON c.service_uid = s2.uid
 WHERE s.id = s2.id
   AND (s.like_count <> COALESCE(c.likes, 0) OR s.favorite_count <> COALESCE(c.favs, 0));

INSERT INTO auth.plugin_registry (name, version)
VALUES ('swipe', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
