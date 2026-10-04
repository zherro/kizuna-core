-- plugins/ai_review/0001_ai_review.sql
-- Plugin: ai_review — revisão de textos de anúncios (services.description) por IA, com fila de
-- aprovação humana. Este arquivo é só banco: credenciais de provider, prompts versionados,
-- revisões propostas, execuções em lote e as RPCs de aprovar/rejeitar. Quem chama a IA e cifra a
-- chave é o servidor Node (service_role). Depende de `services` e `taxonomy`
-- (categories.ai_review, taxonomy 0004).
--
-- Idempotente, from-zero-safe (convenção de plugins/*/0001_*.sql). Registra as permissões
-- ai_review.manage e ai_review.review só no catálogo — nunca em auth.role_grants (root passa por
-- auth.fun_auth_has_perm).

-- =========================================================================
-- 1) ai_credentials — chaves de API dos providers (cifradas no Node, AES-256-GCM)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.ai_credentials (
  id          bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  provider    text NOT NULL CHECK (provider IN ('gemini', 'claude', 'openai')),
  label       text,
  key_cipher  text NOT NULL,
  key_last4   text,
  active      boolean NOT NULL DEFAULT true,
  created_by  uuid DEFAULT auth.fun_auth_user_id(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_credentials_provider_idx ON public.ai_credentials (provider) WHERE active;

ALTER TABLE public.ai_credentials ENABLE ROW LEVEL SECURITY;

-- auth_user nunca lê key_cipher: GRANT por coluna (REVOKE de tabela primeiro). A criação e a
-- troca da chave são do servidor (service_role); o gestor só lista, renomeia e ativa/desativa.
REVOKE ALL ON TABLE public.ai_credentials FROM anon, auth_user;
GRANT SELECT (id, provider, label, key_last4, active, created_by, created_at, updated_at)
  ON TABLE public.ai_credentials TO auth_user;
GRANT UPDATE (label, active, updated_at) ON TABLE public.ai_credentials TO auth_user;

DROP POLICY IF EXISTS ai_credentials_select ON public.ai_credentials;
CREATE POLICY ai_credentials_select ON public.ai_credentials FOR SELECT TO auth_user
  USING (auth.fun_auth_has_perm('ai_review', 'manage'));

DROP POLICY IF EXISTS ai_credentials_update ON public.ai_credentials;
CREATE POLICY ai_credentials_update ON public.ai_credentials FOR UPDATE TO auth_user
  USING (auth.fun_auth_has_perm('ai_review', 'manage'))
  WITH CHECK (auth.fun_auth_has_perm('ai_review', 'manage'));

-- =========================================================================
-- 2) ai_prompts — prompts versionados (override opcional por categoria)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.ai_prompts (
  id             bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  key            text NOT NULL,
  name           text NOT NULL,
  description    text,
  system_prompt  text NOT NULL,
  user_template  text NOT NULL,
  provider       text CHECK (provider IS NULL OR provider IN ('gemini', 'claude', 'openai')),
  model          text,
  temperature    numeric CHECK (temperature IS NULL OR (temperature >= 0 AND temperature <= 2)),
  version        integer NOT NULL DEFAULT 1,
  category_id    bigint REFERENCES public.categories(id) ON DELETE CASCADE,
  active         boolean NOT NULL DEFAULT true,
  created_by     uuid DEFAULT auth.fun_auth_user_id(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
-- `key` é único por escopo: um prompt global (category_id nulo) e, no máximo, um override por
-- categoria com a mesma key. (UNIQUE simples em key impediria o override.)
CREATE UNIQUE INDEX IF NOT EXISTS ai_prompts_key_scope_uniq
  ON public.ai_prompts (key, COALESCE(category_id, 0));

CREATE OR REPLACE FUNCTION public.fn_ai_prompts_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.system_prompt IS DISTINCT FROM OLD.system_prompt
     OR NEW.user_template IS DISTINCT FROM OLD.user_template THEN
    NEW.version := OLD.version + 1;
  ELSE
    NEW.version := OLD.version;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS ai_prompts_touch ON public.ai_prompts;
CREATE TRIGGER ai_prompts_touch BEFORE UPDATE ON public.ai_prompts
  FOR EACH ROW EXECUTE FUNCTION public.fn_ai_prompts_touch();

ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_prompts FROM anon, auth_user;
GRANT SELECT, INSERT, UPDATE ON TABLE public.ai_prompts TO auth_user;

DROP POLICY IF EXISTS ai_prompts_select ON public.ai_prompts;
CREATE POLICY ai_prompts_select ON public.ai_prompts FOR SELECT TO auth_user
  USING (auth.fun_auth_has_perm('ai_review', 'manage'));

DROP POLICY IF EXISTS ai_prompts_insert ON public.ai_prompts;
CREATE POLICY ai_prompts_insert ON public.ai_prompts FOR INSERT TO auth_user
  WITH CHECK (auth.fun_auth_has_perm('ai_review', 'manage'));

DROP POLICY IF EXISTS ai_prompts_update ON public.ai_prompts;
CREATE POLICY ai_prompts_update ON public.ai_prompts FOR UPDATE TO auth_user
  USING (auth.fun_auth_has_perm('ai_review', 'manage'))
  WITH CHECK (auth.fun_auth_has_perm('ai_review', 'manage'));

-- =========================================================================
-- 3) ai_review_runs — execuções em lote
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.ai_review_runs (
  id                bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  category_id       bigint REFERENCES public.categories(id) ON DELETE SET NULL,
  requested_limit   integer,
  include_reviewed  boolean NOT NULL DEFAULT false,
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'running', 'done', 'failed', 'cancelled')),
  total             integer NOT NULL DEFAULT 0,
  processed         integer NOT NULL DEFAULT 0,
  failed            integer NOT NULL DEFAULT 0,
  tokens_in         integer NOT NULL DEFAULT 0,
  tokens_out        integer NOT NULL DEFAULT 0,
  error             text,
  created_by        uuid DEFAULT auth.fun_auth_user_id(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  finished_at       timestamptz
);
CREATE INDEX IF NOT EXISTS ai_review_runs_status_idx ON public.ai_review_runs (status, created_at DESC);

ALTER TABLE public.ai_review_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_review_runs FROM anon, auth_user;
GRANT SELECT ON TABLE public.ai_review_runs TO auth_user;
-- O gestor só consegue cancelar (a policy limita o novo valor); o resto é do servidor.
GRANT UPDATE (status) ON TABLE public.ai_review_runs TO auth_user;

DROP POLICY IF EXISTS ai_review_runs_select ON public.ai_review_runs;
CREATE POLICY ai_review_runs_select ON public.ai_review_runs FOR SELECT TO auth_user
  USING (auth.fun_auth_has_perm('ai_review', 'manage') OR auth.fun_auth_has_perm('ai_review', 'review'));

DROP POLICY IF EXISTS ai_review_runs_cancel ON public.ai_review_runs;
CREATE POLICY ai_review_runs_cancel ON public.ai_review_runs FOR UPDATE TO auth_user
  USING (auth.fun_auth_has_perm('ai_review', 'manage') AND status IN ('pending', 'running'))
  WITH CHECK (auth.fun_auth_has_perm('ai_review', 'manage') AND status = 'cancelled');

-- =========================================================================
-- 4) service_text_revisions — texto original x proposto, pendente de aprovação
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.service_text_revisions (
  id              bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  service_id      bigint NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  field           text NOT NULL DEFAULT 'description',
  original_text   text,
  revised_text    text,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  origin          text NOT NULL DEFAULT 'ai',
  provider        text,
  model           text,
  prompt_version  integer,
  tokens_in       integer,
  tokens_out      integer,
  run_id          bigint REFERENCES public.ai_review_runs(id) ON DELETE SET NULL,
  reviewed_by     uuid,
  reviewed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- Nulo permitido: o servidor (service_role) não tem JWT e informa o tenant do anúncio.
  tenant_id       uuid DEFAULT auth.fun_auth_current_tenant_id()
);
CREATE INDEX IF NOT EXISTS service_text_revisions_service_status_idx
  ON public.service_text_revisions (service_id, status);
-- No máximo uma revisão pendente por anúncio/campo: fecha a corrida entre dois lotes simultâneos.
CREATE UNIQUE INDEX IF NOT EXISTS service_text_revisions_one_pending_uniq
  ON public.service_text_revisions (service_id, field) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS service_text_revisions_run_idx
  ON public.service_text_revisions (run_id) WHERE run_id IS NOT NULL;

ALTER TABLE public.service_text_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.service_text_revisions FROM anon, auth_user;
GRANT SELECT ON TABLE public.service_text_revisions TO auth_user;
-- O revisor só edita o texto proposto; aprovar/rejeitar passa pelas RPCs (que gravam status).
GRANT UPDATE (revised_text) ON TABLE public.service_text_revisions TO auth_user;

DROP POLICY IF EXISTS service_text_revisions_select ON public.service_text_revisions;
CREATE POLICY service_text_revisions_select ON public.service_text_revisions FOR SELECT TO auth_user
  USING (auth.fun_auth_has_perm('ai_review', 'review') OR auth.fun_auth_has_perm('ai_review', 'manage'));

DROP POLICY IF EXISTS service_text_revisions_update ON public.service_text_revisions;
CREATE POLICY service_text_revisions_update ON public.service_text_revisions FOR UPDATE TO auth_user
  USING ((auth.fun_auth_has_perm('ai_review', 'review') OR auth.fun_auth_has_perm('ai_review', 'manage'))
         AND status = 'pending')
  WITH CHECK (auth.fun_auth_has_perm('ai_review', 'review') OR auth.fun_auth_has_perm('ai_review', 'manage'));

-- =========================================================================
-- 5) RPCs — aprovar (aplica no anúncio) e rejeitar
-- =========================================================================
-- Allowlist de HTML da descrição (espelha findDisallowedMarkup do skill text_review): tags p, strong,
-- em, ul, ol, li, br sem atributos; <a href> só com http(s)/mailto/tel entre aspas; </a>. Remove o
-- que é permitido e rejeita se sobrar qualquer "<" que abra tag, comentário ou instrução. A
-- descrição é renderizada como HTML no detalhe do anúncio, então a RPC revalida o texto final.
CREATE OR REPLACE FUNCTION public.fn_ai_review_html_safe(p_text text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $function$
  SELECT p_text IS NOT NULL AND NOT (
    regexp_replace(
      regexp_replace(
        regexp_replace(p_text, '</?(p|strong|em|ul|ol|li|br)[[:space:]]*/?>', '', 'gi'),
        '<a[[:space:]]+href[[:space:]]*=[[:space:]]*("(https?:|mailto:|tel:)[^"<>]*"|''(https?:|mailto:|tel:)[^''<>]*'')[[:space:]]*>', '', 'gi'),
      '</a[[:space:]]*>', '', 'gi')
    ~ '<[a-zA-Z/!?]'
  );
$function$;

CREATE OR REPLACE FUNCTION public.fn_service_revision_apply(
  p_revision_id bigint,
  p_text        text DEFAULT NULL
) RETURNS public.service_text_revisions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_row     public.service_text_revisions;
  v_current text;
BEGIN
  IF NOT (auth.fun_auth_has_perm('ai_review', 'review') OR auth.fun_auth_has_perm('ai_review', 'manage')) THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- FOR UPDATE serializa duas aprovações simultâneas: a segunda espera e então vê status <> pending.
  SELECT * INTO v_row FROM public.service_text_revisions WHERE id = p_revision_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'revisão não encontrada' USING errcode = 'P0002';
  END IF;
  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'revisão já decidida (%)', v_row.status USING errcode = '22023';
  END IF;

  IF p_text IS NOT NULL THEN
    v_row.revised_text := p_text;
  END IF;
  IF v_row.revised_text IS NULL OR btrim(v_row.revised_text) = '' THEN
    RAISE EXCEPTION 'texto revisado vazio' USING errcode = '22023';
  END IF;

  IF char_length(v_row.revised_text) > 20000 THEN
    RAISE EXCEPTION 'texto revisado longo demais' USING errcode = '22023';
  END IF;
  IF NOT public.fn_ai_review_html_safe(v_row.revised_text) THEN
    RAISE EXCEPTION 'texto revisado com HTML não permitido' USING errcode = '22023';
  END IF;

  IF v_row.field = 'description' THEN
    -- Não sobrescreve edição feita pelo anunciante depois da sugestão.
    SELECT description INTO v_current FROM public.services WHERE id = v_row.service_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'anúncio não encontrado' USING errcode = 'P0002';
    END IF;
    IF v_current IS DISTINCT FROM v_row.original_text THEN
      RAISE EXCEPTION 'o anúncio foi alterado depois da sugestão; gere uma nova revisão' USING errcode = '22023';
    END IF;
    UPDATE public.services SET description = v_row.revised_text, updated_at = now()
     WHERE id = v_row.service_id;
  ELSE
    RAISE EXCEPTION 'campo não suportado: %', v_row.field USING errcode = '22023';
  END IF;

  UPDATE public.service_text_revisions
     SET revised_text = v_row.revised_text,
         status       = 'approved',
         reviewed_by  = auth.fun_auth_user_id(),
         reviewed_at  = now()
   WHERE id = p_revision_id
   RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_service_revision_reject(p_revision_id bigint)
RETURNS public.service_text_revisions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_row public.service_text_revisions;
BEGIN
  IF NOT (auth.fun_auth_has_perm('ai_review', 'review') OR auth.fun_auth_has_perm('ai_review', 'manage')) THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  UPDATE public.service_text_revisions
     SET status      = 'rejected',
         reviewed_by = auth.fun_auth_user_id(),
         reviewed_at = now()
   WHERE id = p_revision_id AND status = 'pending'
   RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'revisão inexistente ou já decidida' USING errcode = 'P0002';
  END IF;

  RETURN v_row;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.fn_ai_review_html_safe(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_ai_review_html_safe(text) TO auth_user, service_role;
REVOKE EXECUTE ON FUNCTION public.fn_service_revision_apply(bigint, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_service_revision_reject(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_service_revision_apply(bigint, text) TO auth_user;
GRANT EXECUTE ON FUNCTION public.fn_service_revision_reject(bigint) TO auth_user;

-- =========================================================================
-- 6) service_role (servidor): chama a IA, grava revisões e acompanha runs. BYPASSRLS; só GRANTs.
-- =========================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE public.ai_credentials TO service_role;
    GRANT SELECT, INSERT, UPDATE ON TABLE public.ai_prompts TO service_role;
    GRANT SELECT, INSERT, UPDATE ON TABLE public.service_text_revisions TO service_role;
    GRANT SELECT, INSERT, UPDATE ON TABLE public.ai_review_runs TO service_role;
    -- Contexto do prompt (categoria, grupo, subcategorias, campos do formulário).
    GRANT SELECT ON TABLE public.categories, public.categories_group, public.categories_sub,
      public.service_categories_sub, public.forms TO service_role;
    GRANT SELECT, UPDATE ON TABLE public.services TO service_role;
  END IF;
END
$$;

-- =========================================================================
-- 7) Seed — prompt service_description_review (global). Só insere se ainda não existir; edições
--    feitas pelo gestor na tela não são sobrescritas no re-apply.
-- =========================================================================
INSERT INTO public.ai_prompts (key, name, description, system_prompt, user_template, temperature)
SELECT
  'service_description_review',
  'Revisão de descrição de anúncio',
  'Reescreve a descrição de um anúncio com texto natural e fiel aos fatos. Retorna JSON com o campo revised.',
  $sp$Você revisa descrições de anúncios de um portal local de Cuiabá e região (MT). Quem lê são moradores procurando um serviço, comércio ou lugar perto de casa.

Sua tarefa: reescrever o texto original em português do Brasil natural, como uma pessoa daqui explicaria o negócio para um vizinho. Tom humano, direto e útil.

Regras de conteúdo (as mais importantes):
- Não invente nada. Preço, horário, endereço, telefone, promoção, tempo de experiência, certificação, formas de pagamento e qualquer outro fato só entram se estiverem no texto original ou no contexto recebido. Na dúvida, deixe de fora.
- Não tire informação útil que estava no original (o que faz, para quem, onde, como contratar).
- Escreva com palavras próprias. Não copie frases do texto original nem de nenhuma fonte; reformule a ideia, mantendo o sentido.
- Mantenha tamanho parecido com o do original (varie no máximo uns 20%). Não encha linguiça e não resuma demais.
- Use o contexto da categoria (nome, grupo, subcategorias e campos do formulário) só para entender o tipo de negócio e escolher o vocabulário certo. Não repita o contexto como se fosse informação do anúncio.

Regras de estilo:
- Nada de cara de texto gerado por IA. Evite clichês como "descubra", "mergulhe", "experiência única", "venha conhecer", "qualidade e excelência", "o melhor da região", "solução completa", "sob medida", "para todos os gostos".
- Sem listas de adjetivos vazios. Prefira dizer o que a pessoa faz de concreto.
- Pouco travessão, pouca exclamação, nenhum emoji. Frases de tamanhos variados, sem repetir a mesma estrutura em todo parágrafo.
- Não fale de si mesmo nem do processo de revisão. Mantenha a pessoa do original (primeira pessoa se o original usa "eu/nós", terceira se descreve o negócio).
- Corrija ortografia, pontuação e acentuação. Não use caixa alta para gritar.

Formato:
- O original pode ter HTML. Preserve apenas estas tags: p, strong, em, ul, li, br. Mantenha a estrutura de parágrafos e listas; não adicione outras tags, atributos, estilos nem links.
- Se o original é texto puro, devolva texto puro.
- Se o texto original estiver vazio, sem sentido ou sem informação suficiente para revisar, devolva-o sem alterações.

Responda somente com um objeto JSON válido, sem comentários e sem blocos de código, no formato {"revised": "texto revisado"}. Escape aspas e quebras de linha conforme o padrão JSON.$sp$,
  $ut$Categoria: {{category}}
Grupo: {{group}}
Subcategorias: {{subcategories}}
Campos do formulário da categoria: {{fields}}

Título do anúncio: {{title}}

Texto original:
{{original}}$ut$,
  0.6
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_prompts WHERE key = 'service_description_review' AND category_id IS NULL
);

-- =========================================================================
-- 8) RBAC (só catálogo) + registro do plugin
-- =========================================================================
INSERT INTO auth.permissions (resource, action, name) VALUES
  ('ai_review', 'manage', 'Gerenciar a revisão por IA (credenciais, prompts, execuções)'),
  ('ai_review', 'review', 'Revisar e aprovar textos propostos pela IA')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('ai_review', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
