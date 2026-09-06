-- plugins/reviews/0001_reviews.sql
-- Plugin: reviews — infraestrutura genérica de avaliações da plataforma. Escopada por
-- `domain` + `reference_id` (SEM FK para a entidade avaliada), no mesmo molde de
-- forms/form_results: leitura aberta, escrita pela RPC. Primeiro consumidor: serviços
-- (`domain = 'service'`), mas o mecanismo já serve provider/product/company no futuro sem
-- reescrita.
--
-- Idempotente, from-zero-safe — mesma convenção de kizuna-core/plugins/*/0001_*.sql (ver
-- kizuna-core/plugins/README.md): CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE,
-- DROP POLICY IF EXISTS antes de CREATE POLICY, REVOKE DELETE (soft-delete só), GRANT de
-- sequência bigserial explícito, self-register em auth.plugin_registry, registra as permissões
-- `reviews`/`moderate` e `reviews`/`manage_tags` catálogo-only (sem grant automático — root passa
-- por auth.fun_auth_has_perm), NOTIFY pgrst no fim.
--
-- Este plugin NÃO faz ALTER em nenhuma tabela do projeto consumidor — é seguro listar em
-- kizuna.plugins.json incondicionalmente (como `forms`).
--
-- Design completo: foco-total/docs/superpowers/specs/2026-09-06-plugin-avaliacoes-design.md
--
-- EXCEÇÃO documentada à convenção "tenant_id sempre vem do JWT": `reviews.tenant_id` e
-- `review_moderation_requests.tenant_id` guardam o tenant DA ENTIDADE AVALIADA (o prestador),
-- não o do avaliador — o marketplace é cross-tenant (o avaliador está noutro tenant). Por isso
-- `reviews.tenant_id` NÃO tem DEFAULT: quem escreve é a RPC fn_review_create, que resolve o
-- tenant a partir do serviço. Um INSERT direto sem tenant falha (NOT NULL) de propósito.

-- =============================================================================================
-- 0) Funções de config (STABLE, sem dependência de tabela do plugin) — definidas antes das
--    policies que as referenciam.
-- =============================================================================================

-- Modo de moderação: 'post' (default) => nova avaliação nasce 'published'; 'pre' => 'pending'.
CREATE OR REPLACE FUNCTION public.fn_review_default_status()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT CASE
    WHEN (SELECT value #>> '{}' FROM auth.system_config WHERE key = 'reviews.moderation_mode') = 'pre'
    THEN 'pending'
    ELSE 'published'
  END;
$function$;

-- Janela de edição do autor, em dias (auth.system_config chave 'reviews.edit_window_days').
CREATE OR REPLACE FUNCTION public.fn_review_edit_window_days()
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  SELECT COALESCE(
    NULLIF((SELECT value #>> '{}' FROM auth.system_config WHERE key = 'reviews.edit_window_days'), '')::integer,
    7
  );
$function$;

-- =============================================================================================
-- 1) public.reviews — a avaliação
-- =============================================================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id            bigserial PRIMARY KEY,
  uid           uuid NOT NULL DEFAULT gen_random_uuid(),
  domain        text NOT NULL,
  reference_id  text NOT NULL,
  id_customer   uuid NOT NULL DEFAULT auth.fun_auth_user_id() REFERENCES auth.users(uid) ON DELETE RESTRICT,
  tenant_id     uuid NOT NULL REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
  rating        smallint NOT NULL,
  comment       text,
  status        text NOT NULL DEFAULT 'published',
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reviews_uid_unique UNIQUE (uid),
  CONSTRAINT reviews_one_per_customer UNIQUE (domain, reference_id, id_customer),
  CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT reviews_status_chk CHECK (status IN ('pending','published','hidden','rejected'))
);

CREATE INDEX IF NOT EXISTS reviews_lookup       ON public.reviews (domain, reference_id, status) WHERE active;
CREATE INDEX IF NOT EXISTS reviews_customer     ON public.reviews (id_customer);
CREATE INDEX IF NOT EXISTS reviews_tenant       ON public.reviews (tenant_id, status);
CREATE INDEX IF NOT EXISTS reviews_moderation_q ON public.reviews (status, created_at) WHERE status IN ('pending','hidden');

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.reviews TO auth_user;
GRANT SELECT ON TABLE public.reviews TO anon;
REVOKE DELETE ON TABLE public.reviews FROM auth_user, anon;
GRANT USAGE, SELECT ON SEQUENCE public.reviews_id_seq TO auth_user;

-- SELECT: qualquer um vê avaliação publicada+ativa. auth_user vê também a própria (qualquer
-- status) e, se tiver `reviews.moderate`, vê todas.
DROP POLICY IF EXISTS reviews_select_anon ON public.reviews;
CREATE POLICY reviews_select_anon ON public.reviews FOR SELECT TO anon
USING (status = 'published' AND active);

DROP POLICY IF EXISTS reviews_select_auth ON public.reviews;
CREATE POLICY reviews_select_auth ON public.reviews FOR SELECT TO auth_user
USING (
  (status = 'published' AND active)
  OR id_customer = auth.fun_auth_user_id()
  OR auth.fun_auth_has_perm('reviews', 'moderate')
);

-- INSERT: só a própria linha (a RPC fn_review_create roda como invoker e passa por aqui).
DROP POLICY IF EXISTS reviews_insert_auth ON public.reviews;
CREATE POLICY reviews_insert_auth ON public.reviews FOR INSERT TO auth_user
WITH CHECK (id_customer = auth.fun_auth_user_id());

-- UPDATE: o autor edita rating/comment dentro da janela (reviews.edit_window_days, default 7)
-- enquanto não estiver rejeitada; quem tem `reviews.moderate` edita qualquer uma (status).
DROP POLICY IF EXISTS reviews_update_auth ON public.reviews;
CREATE POLICY reviews_update_auth ON public.reviews FOR UPDATE TO auth_user
USING (
  auth.fun_auth_has_perm('reviews', 'moderate')
  OR (
    id_customer = auth.fun_auth_user_id()
    AND status <> 'rejected'
    AND created_at > now() - (public.fn_review_edit_window_days() || ' days')::interval
  )
)
WITH CHECK (
  auth.fun_auth_has_perm('reviews', 'moderate')
  OR (
    id_customer = auth.fun_auth_user_id()
    AND status <> 'rejected'
  )
);

-- =============================================================================================
-- 2) public.review_tags — catálogo de tags configurável pela administração
-- =============================================================================================
CREATE TABLE IF NOT EXISTS public.review_tags (
  id           bigserial PRIMARY KEY,
  uid          uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
  domain       text,                                  -- NULL = vale para todos os domínios
  slug         text NOT NULL,
  label        text NOT NULL,
  sort_order   integer NOT NULL DEFAULT 0,
  selectable   boolean NOT NULL DEFAULT true,
  active       boolean NOT NULL DEFAULT true,
  created_by   uuid NOT NULL DEFAULT auth.fun_auth_user_id(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_tags_uid_unique UNIQUE (uid),
  CONSTRAINT review_tags_tenant_domain_slug_unique UNIQUE (tenant_id, domain, slug)
);

CREATE INDEX IF NOT EXISTS review_tags_catalog ON public.review_tags (domain, active, sort_order);

ALTER TABLE public.review_tags ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.review_tags TO auth_user;
GRANT SELECT ON TABLE public.review_tags TO anon;
REVOKE DELETE ON TABLE public.review_tags FROM auth_user, anon;
GRANT USAGE, SELECT ON SEQUENCE public.review_tags_id_seq TO auth_user;

DROP POLICY IF EXISTS review_tags_select_all ON public.review_tags;
CREATE POLICY review_tags_select_all ON public.review_tags FOR SELECT TO anon, auth_user
USING (active);

DROP POLICY IF EXISTS review_tags_insert ON public.review_tags;
CREATE POLICY review_tags_insert ON public.review_tags FOR INSERT TO auth_user
WITH CHECK (auth.fun_auth_has_perm('reviews', 'manage_tags'));

DROP POLICY IF EXISTS review_tags_update ON public.review_tags;
CREATE POLICY review_tags_update ON public.review_tags FOR UPDATE TO auth_user
USING (auth.fun_auth_has_perm('reviews', 'manage_tags'))
WITH CHECK (auth.fun_auth_has_perm('reviews', 'manage_tags'));

-- =============================================================================================
-- 3) public.review_tag_links — join review <-> tag, com snapshot do texto (histórico)
-- =============================================================================================
CREATE TABLE IF NOT EXISTS public.review_tag_links (
  id                 bigserial PRIMARY KEY,
  review_id          bigint NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  tag_id             bigint REFERENCES public.review_tags(id) ON DELETE SET NULL,
  tag_slug_snapshot  text NOT NULL,
  tag_label_snapshot text NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_tag_links_unique UNIQUE (review_id, tag_slug_snapshot)
);

CREATE INDEX IF NOT EXISTS review_tag_links_review ON public.review_tag_links (review_id);

ALTER TABLE public.review_tag_links ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON TABLE public.review_tag_links TO auth_user;
GRANT SELECT ON TABLE public.review_tag_links TO anon;
REVOKE UPDATE, DELETE ON TABLE public.review_tag_links FROM auth_user, anon;
GRANT USAGE, SELECT ON SEQUENCE public.review_tag_links_id_seq TO auth_user;

-- SELECT liberado: o snapshot só contém o texto da tag, que já é público na avaliação.
DROP POLICY IF EXISTS review_tag_links_select_all ON public.review_tag_links;
CREATE POLICY review_tag_links_select_all ON public.review_tag_links FOR SELECT TO anon, auth_user
USING (true);

-- INSERT: só via fn_review_create (invoker) — a review referida tem que ser do próprio caller.
DROP POLICY IF EXISTS review_tag_links_insert ON public.review_tag_links;
CREATE POLICY review_tag_links_insert ON public.review_tag_links FOR INSERT TO auth_user
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.reviews r
    WHERE r.id = review_id AND r.id_customer = auth.fun_auth_user_id()
  )
);

-- =============================================================================================
-- 4) public.review_moderation_requests — "solicitar revisão" pelo dono da entidade avaliada
-- =============================================================================================
CREATE TABLE IF NOT EXISTS public.review_moderation_requests (
  id                bigserial PRIMARY KEY,
  uid               uuid NOT NULL DEFAULT gen_random_uuid(),
  review_id         bigint NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  tenant_id         uuid NOT NULL REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
  requester_user_id uuid NOT NULL DEFAULT auth.fun_auth_user_id() REFERENCES auth.users(uid) ON DELETE RESTRICT,
  reason            text NOT NULL,
  status            text NOT NULL DEFAULT 'pending',
  moderator_id      uuid REFERENCES auth.users(uid) ON DELETE SET NULL,
  moderator_comment text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  resolved_at       timestamptz,
  CONSTRAINT review_moderation_requests_uid_unique UNIQUE (uid),
  CONSTRAINT review_moderation_requests_status_chk
    CHECK (status IN ('pending','approved','rejected','cancelled'))
);

-- No máximo UMA solicitação aberta por avaliação.
CREATE UNIQUE INDEX IF NOT EXISTS review_moderation_requests_one_open
  ON public.review_moderation_requests (review_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS review_moderation_requests_queue
  ON public.review_moderation_requests (status, created_at);

ALTER TABLE public.review_moderation_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.review_moderation_requests TO auth_user;
REVOKE DELETE ON TABLE public.review_moderation_requests FROM auth_user;
GRANT USAGE, SELECT ON SEQUENCE public.review_moderation_requests_id_seq TO auth_user;

DROP POLICY IF EXISTS review_moderation_requests_select ON public.review_moderation_requests;
CREATE POLICY review_moderation_requests_select ON public.review_moderation_requests FOR SELECT TO auth_user
USING (
  requester_user_id = auth.fun_auth_user_id()
  OR auth.fun_auth_has_perm('reviews', 'moderate')
);

-- INSERT: só a própria (a RPC fn_review_moderation_request roda como invoker e valida o dono).
DROP POLICY IF EXISTS review_moderation_requests_insert ON public.review_moderation_requests;
CREATE POLICY review_moderation_requests_insert ON public.review_moderation_requests FOR INSERT TO auth_user
WITH CHECK (requester_user_id = auth.fun_auth_user_id());

-- UPDATE: moderador resolve; requester só cancela a própria enquanto pendente.
DROP POLICY IF EXISTS review_moderation_requests_update ON public.review_moderation_requests;
CREATE POLICY review_moderation_requests_update ON public.review_moderation_requests FOR UPDATE TO auth_user
USING (
  auth.fun_auth_has_perm('reviews', 'moderate')
  OR (requester_user_id = auth.fun_auth_user_id() AND status = 'pending')
)
WITH CHECK (
  auth.fun_auth_has_perm('reviews', 'moderate')
  OR (requester_user_id = auth.fun_auth_user_id() AND status = 'cancelled')
);

-- =============================================================================================
-- 5) public.review_moderation_events — trilha de auditoria append-only (idioma do `ad_reviews`)
-- =============================================================================================
CREATE TABLE IF NOT EXISTS public.review_moderation_events (
  id             bigserial PRIMARY KEY,
  review_id      bigint NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  actor_user_id  uuid NOT NULL,
  action         text NOT NULL,
  from_status    text,
  to_status      text,
  note           text,
  request_id     bigint REFERENCES public.review_moderation_requests(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS review_moderation_events_review
  ON public.review_moderation_events (review_id, created_at);

ALTER TABLE public.review_moderation_events ENABLE ROW LEVEL SECURITY;
-- Sem GRANT de INSERT — só fn_review_moderate (SECURITY DEFINER) escreve aqui, como `notifications`.
GRANT SELECT ON TABLE public.review_moderation_events TO auth_user;
DROP POLICY IF EXISTS review_moderation_events_select ON public.review_moderation_events;
CREATE POLICY review_moderation_events_select ON public.review_moderation_events FOR SELECT TO auth_user
USING (auth.fun_auth_has_perm('reviews', 'moderate'));

-- =============================================================================================
-- 6) public.review_stats — agregado mantido por trigger (resumo O(1), público)
-- =============================================================================================
CREATE TABLE IF NOT EXISTS public.review_stats (
  domain         text NOT NULL,
  reference_id   text NOT NULL,
  tenant_id      uuid,
  total_reviews  integer NOT NULL DEFAULT 0,
  average_rating numeric(3,2) NOT NULL DEFAULT 0,
  dist           jsonb NOT NULL DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0}'::jsonb,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (domain, reference_id)
);

ALTER TABLE public.review_stats ENABLE ROW LEVEL SECURITY;
-- Sem GRANT de escrita — só o trigger (SECURITY DEFINER) mantém.
GRANT SELECT ON TABLE public.review_stats TO anon, auth_user;
DROP POLICY IF EXISTS review_stats_select_all ON public.review_stats;
CREATE POLICY review_stats_select_all ON public.review_stats FOR SELECT TO anon, auth_user
USING (true);

-- =============================================================================================
-- 7) Funções auxiliares
-- =============================================================================================

-- Recalcula review_stats para uma chave (domain, reference_id). Recompute completo por chave —
-- barato dado o índice reviews_lookup; a mitigação incremental está documentada na spec (§20).
-- SECURITY DEFINER: chamado pelo trigger no contexto de um auth_user que não tem grant em
-- review_stats.
CREATE OR REPLACE FUNCTION public.fn_review_stats_recompute(p_domain text, p_reference_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.review_stats AS s (domain, reference_id, tenant_id, total_reviews, average_rating, dist, updated_at)
  SELECT
    p_domain,
    p_reference_id,
    (SELECT r0.tenant_id FROM public.reviews r0
      WHERE r0.domain = p_domain AND r0.reference_id = p_reference_id
      ORDER BY r0.created_at LIMIT 1),
    COALESCE(count(*) FILTER (WHERE r.status = 'published' AND r.active), 0),
    COALESCE(round(avg(r.rating) FILTER (WHERE r.status = 'published' AND r.active), 2), 0),
    jsonb_build_object(
      '1', count(*) FILTER (WHERE r.status = 'published' AND r.active AND r.rating = 1),
      '2', count(*) FILTER (WHERE r.status = 'published' AND r.active AND r.rating = 2),
      '3', count(*) FILTER (WHERE r.status = 'published' AND r.active AND r.rating = 3),
      '4', count(*) FILTER (WHERE r.status = 'published' AND r.active AND r.rating = 4),
      '5', count(*) FILTER (WHERE r.status = 'published' AND r.active AND r.rating = 5)
    ),
    now()
  FROM public.reviews r
  WHERE r.domain = p_domain AND r.reference_id = p_reference_id
  ON CONFLICT (domain, reference_id) DO UPDATE SET
    tenant_id      = COALESCE(EXCLUDED.tenant_id, s.tenant_id),
    total_reviews  = EXCLUDED.total_reviews,
    average_rating = EXCLUDED.average_rating,
    dist           = EXCLUDED.dist,
    updated_at     = now();
END;
$function$;

-- touch updated_at
CREATE OR REPLACE FUNCTION public.fn_reviews_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

-- trigger de stats
CREATE OR REPLACE FUNCTION public.fn_reviews_stats_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.fn_review_stats_recompute(OLD.domain, OLD.reference_id);
    RETURN OLD;
  END IF;
  PERFORM public.fn_review_stats_recompute(NEW.domain, NEW.reference_id);
  IF TG_OP = 'UPDATE' AND (OLD.domain, OLD.reference_id) IS DISTINCT FROM (NEW.domain, NEW.reference_id) THEN
    PERFORM public.fn_review_stats_recompute(OLD.domain, OLD.reference_id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_reviews_touch_updated_at ON public.reviews;
CREATE TRIGGER trg_reviews_touch_updated_at BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.fn_reviews_touch_updated_at();

DROP TRIGGER IF EXISTS trg_review_tags_touch_updated_at ON public.review_tags;
CREATE TRIGGER trg_review_tags_touch_updated_at BEFORE UPDATE ON public.review_tags
FOR EACH ROW EXECUTE FUNCTION public.fn_reviews_touch_updated_at();

DROP TRIGGER IF EXISTS trg_review_moderation_requests_touch_updated_at ON public.review_moderation_requests;
CREATE TRIGGER trg_review_moderation_requests_touch_updated_at BEFORE UPDATE ON public.review_moderation_requests
FOR EACH ROW EXECUTE FUNCTION public.fn_reviews_touch_updated_at();

DROP TRIGGER IF EXISTS trg_reviews_stats ON public.reviews;
CREATE TRIGGER trg_reviews_stats AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.fn_reviews_stats_trigger();

-- =============================================================================================
-- 8) RPCs
-- =============================================================================================

-- 8.1 fn_review_create — SECURITY INVOKER (RLS escopa; a tabela services é lida sob a policy do
--     próprio caller, que já pode ver serviços ativos). Cross-tenant: seta reviews.tenant_id com
--     o tenant do serviço.
CREATE OR REPLACE FUNCTION public.fn_review_create(
  p_domain       text,
  p_reference_id text,
  p_rating       smallint,
  p_comment      text DEFAULT NULL,
  p_tag_ids      bigint[] DEFAULT '{}'
)
 RETURNS public.reviews
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_uid     uuid := auth.fun_auth_user_id();
  v_tenant  uuid;
  v_owner   uuid;
  v_status  text;
  v_review  public.reviews%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_domain <> 'service' THEN
    RAISE EXCEPTION 'Domínio de avaliação não suportado: %', p_domain USING ERRCODE = 'check_violation';
  END IF;

  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'A nota precisa estar entre 1 e 5.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT s.tenant_id, s.created_by
    INTO v_tenant, v_owner
    FROM public.services s
   WHERE s.id = p_reference_id::bigint
     AND s.active = true
     AND s.status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Serviço não encontrado ou indisponível.' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_owner = v_uid THEN
    RAISE EXCEPTION 'Você não pode avaliar o próprio serviço.' USING ERRCODE = 'check_violation';
  END IF;

  v_status := public.fn_review_default_status();

  BEGIN
    INSERT INTO public.reviews (domain, reference_id, id_customer, tenant_id, rating, comment, status)
    VALUES (p_domain, p_reference_id, v_uid, v_tenant, p_rating, NULLIF(btrim(p_comment), ''), v_status)
    RETURNING * INTO v_review;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Você já avaliou este serviço.' USING ERRCODE = 'unique_violation';
  END;

  IF p_tag_ids IS NOT NULL AND array_length(p_tag_ids, 1) IS NOT NULL THEN
    INSERT INTO public.review_tag_links (review_id, tag_id, tag_slug_snapshot, tag_label_snapshot)
    SELECT v_review.id, t.id, t.slug, t.label
      FROM public.review_tags t
     WHERE t.id = ANY (p_tag_ids)
       AND t.active
       AND t.selectable
       AND (t.domain IS NULL OR t.domain = p_domain)
    ON CONFLICT (review_id, tag_slug_snapshot) DO NOTHING;
  END IF;

  RETURN v_review;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_review_create(text, text, smallint, text, bigint[]) TO auth_user;

-- 8.2 fn_review_moderation_request — SECURITY INVOKER. Valida que o caller é dono do serviço
--     avaliado (não confia em nada do front). 403 se não for.
CREATE OR REPLACE FUNCTION public.fn_review_moderation_request(
  p_review_id bigint,
  p_reason    text
)
 RETURNS public.review_moderation_requests
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_uid     uuid := auth.fun_auth_user_id();
  v_review  public.reviews%ROWTYPE;
  v_is_owner boolean := false;
  v_request public.review_moderation_requests%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF btrim(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'Descreva o motivo da solicitação.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_review FROM public.reviews WHERE id = p_review_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Avaliação não encontrada.' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_review.domain = 'service' THEN
    SELECT true INTO v_is_owner
      FROM public.services s
     WHERE s.id = v_review.reference_id::bigint
       AND s.created_by = v_uid;
  END IF;

  IF NOT COALESCE(v_is_owner, false) THEN
    RAISE EXCEPTION 'Apenas o dono do anúncio pode solicitar revisão.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  BEGIN
    INSERT INTO public.review_moderation_requests (review_id, tenant_id, requester_user_id, reason, status)
    VALUES (p_review_id, v_review.tenant_id, v_uid, btrim(p_reason), 'pending')
    RETURNING * INTO v_request;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Já existe uma solicitação em análise para esta avaliação.' USING ERRCODE = 'unique_violation';
  END;

  RETURN v_request;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_review_moderation_request(bigint, text) TO auth_user;

-- 8.3 fn_review_moderate — SECURITY DEFINER (escreve review_moderation_events, sem grant a
--     auth_user). Autorização real: exige reviews.moderate (is_root passa por dentro).
CREATE OR REPLACE FUNCTION public.fn_review_moderate(
  p_review_id   bigint,
  p_to_status   text,
  p_note        text DEFAULT NULL,
  p_soft_delete boolean DEFAULT NULL,
  p_request_id  bigint DEFAULT NULL
)
 RETURNS public.reviews
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_uid      uuid := auth.fun_auth_user_id();
  v_review   public.reviews%ROWTYPE;
  v_from     text;
  v_action   text;
  v_new_active boolean;
BEGIN
  IF NOT auth.fun_auth_has_perm('reviews', 'moderate') THEN
    RAISE EXCEPTION 'Sem permissão para moderar avaliações.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_to_status NOT IN ('pending','published','hidden','rejected') THEN
    RAISE EXCEPTION 'Status inválido: %', p_to_status USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_review FROM public.reviews WHERE id = p_review_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Avaliação não encontrada.' USING ERRCODE = 'no_data_found';
  END IF;

  v_from := v_review.status;
  v_new_active := CASE
    WHEN p_soft_delete IS TRUE THEN false
    WHEN p_soft_delete IS FALSE THEN true
    ELSE v_review.active
  END;

  UPDATE public.reviews
     SET status = p_to_status,
         active = v_new_active
   WHERE id = p_review_id
  RETURNING * INTO v_review;

  IF p_request_id IS NOT NULL THEN
    UPDATE public.review_moderation_requests
       SET status = CASE WHEN p_to_status IN ('hidden','rejected') OR p_soft_delete IS TRUE
                         THEN 'approved' ELSE 'rejected' END,
           moderator_id = v_uid,
           moderator_comment = p_note,
           resolved_at = now()
     WHERE id = p_request_id AND status = 'pending';
  END IF;

  v_action := CASE
    WHEN p_soft_delete IS TRUE THEN 'removed'
    WHEN p_to_status = 'published' THEN 'published'
    WHEN p_to_status = 'hidden' THEN 'hidden'
    WHEN p_to_status = 'rejected' THEN 'rejected'
    WHEN p_to_status = 'pending' THEN 'reopened'
    ELSE 'updated'
  END;
  IF p_request_id IS NOT NULL AND p_to_status = v_from AND p_soft_delete IS NOT TRUE THEN
    v_action := 'request_reviewed';
  END IF;

  INSERT INTO public.review_moderation_events
    (review_id, actor_user_id, action, from_status, to_status, note, request_id)
  VALUES (p_review_id, v_uid, v_action, v_from, p_to_status, p_note, p_request_id);

  RETURN v_review;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_review_moderate(bigint, text, text, boolean, bigint) TO auth_user;

-- =============================================================================================
-- 9) RBAC + registro do plugin (ver kizuna-core/plugins/README.md)
-- =============================================================================================
INSERT INTO auth.permissions (resource, action, name) VALUES
  ('reviews', 'moderate',    'Moderar avaliações'),
  ('reviews', 'manage_tags', 'Gerenciar tags de avaliação')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('reviews', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
