-- plugins/forms/0001_forms.sql
-- Plugin: forms — generic, reusable form definitions (`forms`) plus their captured answers
-- (`form_results`). The authoring/rendering engine (FormBuilder / FormRenderer / validate) is
-- the separate `form-builder` engine shipped as kizuna-core TS only — this plugin owns just the
-- persistence + management slice.
--
-- Idempotent, from-zero-safe — same convention as kizuna-core/plugins/*/0001_*.sql
-- (see kizuna-core/plugins/README.md): CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE,
-- DROP POLICY IF EXISTS before CREATE POLICY, REVOKE DELETE (soft-delete only), sequence grants,
-- self-registers in auth.plugin_registry, registers a `forms`/`manage` permission catalog-only
-- (no automatic grant — root passes via auth.fun_auth_has_perm's is_root bypass), NOTIFY pgrst.
--
-- This plugin does NOT ALTER any consuming-project table, so it is safe to list in
-- kizuna.plugins.json unconditionally (unlike `taxonomy`).

-- ---------------------------------------------------------------------------------------------
-- 1) public.forms — the form config (a FormSchema + metadata), keyed for consumers by form_key.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.forms (
  id           bigserial PRIMARY KEY,
  uid          uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
  form_key     text NOT NULL,
  title        text NOT NULL,
  description  text,
  schema       jsonb NOT NULL DEFAULT '{}'::jsonb,
  version      integer NOT NULL DEFAULT 1,
  is_reusable  boolean NOT NULL DEFAULT true,
  active       boolean NOT NULL DEFAULT true,
  created_by   uuid NOT NULL DEFAULT auth.fun_auth_user_id(),
  created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT forms_uid_unique UNIQUE (uid),
  CONSTRAINT forms_tenant_form_key_unique UNIQUE (tenant_id, form_key)
);

ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.forms TO auth_user;
GRANT SELECT ON TABLE public.forms TO anon;
-- No DELETE — soft-delete only (`active = false`), covered by the UPDATE grant/policy. The
-- REVOKE strips DELETE back off an install from before this line existed.
REVOKE DELETE ON TABLE public.forms FROM auth_user, anon;
GRANT USAGE, SELECT ON SEQUENCE public.forms_id_seq TO auth_user;

-- SELECT: any active form is readable by an auth_user AND by anon (a form may render on a public
-- page in a later feature — mirrors storage's anon-readable approach).
DROP POLICY IF EXISTS forms_select_policy ON public.forms;
CREATE POLICY forms_select_policy ON public.forms FOR SELECT TO auth_user
USING (active = true);
DROP POLICY IF EXISTS forms_select_anon_policy ON public.forms;
CREATE POLICY forms_select_anon_policy ON public.forms FOR SELECT TO anon
USING (active = true);

-- INSERT / UPDATE gated on the forms.manage permission (registered below, granted to nobody by
-- default; root passes through auth.fun_auth_has_perm's is_root bypass).
DROP POLICY IF EXISTS forms_insert_policy ON public.forms;
CREATE POLICY forms_insert_policy ON public.forms FOR INSERT TO auth_user
WITH CHECK (auth.fun_auth_has_perm('forms', 'manage'));
DROP POLICY IF EXISTS forms_update_policy ON public.forms;
CREATE POLICY forms_update_policy ON public.forms FOR UPDATE TO auth_user
USING (auth.fun_auth_has_perm('forms', 'manage'))
WITH CHECK (auth.fun_auth_has_perm('forms', 'manage'));

-- Version bump — server-side and unavoidable. Any change to `schema` increments `version` and
-- refreshes `updated_at`; other column edits leave `version` alone.
CREATE OR REPLACE FUNCTION public.fn_forms_bump_version()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.schema IS DISTINCT FROM OLD.schema THEN
    NEW.version := OLD.version + 1;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_forms_bump_version ON public.forms;
CREATE TRIGGER trg_forms_bump_version
BEFORE UPDATE ON public.forms
FOR EACH ROW EXECUTE FUNCTION public.fn_forms_bump_version();

-- ---------------------------------------------------------------------------------------------
-- 2) public.form_results — captured answers. Singleton: one current answer-set per
--    (tenant_id, domain, reference_id). Writes go through fn_form_result_upsert (below).
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.form_results (
  id               bigserial PRIMARY KEY,
  uid              uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
  form_id          bigint NOT NULL REFERENCES public.forms(id) ON DELETE RESTRICT,
  form_key         text NOT NULL,
  reference_id     text NOT NULL,
  domain           text NOT NULL,
  version          integer NOT NULL,
  schema_snapshot  jsonb NOT NULL,
  answers          jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_by     uuid NOT NULL DEFAULT auth.fun_auth_user_id(),
  created_at       timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT form_results_uid_unique UNIQUE (uid),
  CONSTRAINT form_results_singleton_unique UNIQUE (tenant_id, domain, reference_id)
);

CREATE INDEX IF NOT EXISTS form_results_answers_gin
  ON public.form_results USING gin (answers jsonb_path_ops);
CREATE INDEX IF NOT EXISTS form_results_lookup
  ON public.form_results (tenant_id, domain, reference_id);

ALTER TABLE public.form_results ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.form_results TO auth_user;
REVOKE DELETE ON TABLE public.form_results FROM auth_user;
GRANT USAGE, SELECT ON SEQUENCE public.form_results_id_seq TO auth_user;

-- SELECT: owners see their own captures, forms.manage holders (and root) see all.
DROP POLICY IF EXISTS form_results_select_policy ON public.form_results;
CREATE POLICY form_results_select_policy ON public.form_results FOR SELECT TO auth_user
USING (submitted_by = auth.fun_auth_user_id() OR auth.fun_auth_has_perm('forms', 'manage'));

-- INSERT / UPDATE: the invoker may only write their own rows. The RPC below runs as the invoker
-- (NOT SECURITY DEFINER), so these policies apply to it too.
DROP POLICY IF EXISTS form_results_insert_policy ON public.form_results;
CREATE POLICY form_results_insert_policy ON public.form_results FOR INSERT TO auth_user
WITH CHECK (submitted_by = auth.fun_auth_user_id());
DROP POLICY IF EXISTS form_results_update_policy ON public.form_results;
CREATE POLICY form_results_update_policy ON public.form_results FOR UPDATE TO auth_user
USING (submitted_by = auth.fun_auth_user_id())
WITH CHECK (submitted_by = auth.fun_auth_user_id());

-- ---------------------------------------------------------------------------------------------
-- 3) fn_form_result_upsert — the sanctioned write path for answers. A composite-key upsert does
--    not fit the generic PATCH /api/resources/:resource/:id flow (no id known at capture time),
--    so this RPC (exposed via the existing /api/postgrest/rpc proxy) is the way in. Not
--    SECURITY DEFINER — RLS on both tables already scopes it for the invoker.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_form_result_upsert(
  p_form_key     text,
  p_domain       text,
  p_reference_id text,
  p_answers      jsonb
)
 RETURNS public.form_results
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_tenant_id uuid := auth.fun_auth_current_tenant_id();
  v_form      public.forms%ROWTYPE;
  v_result    public.form_results%ROWTYPE;
BEGIN
  SELECT * INTO v_form
  FROM public.forms
  WHERE tenant_id = v_tenant_id
    AND form_key = p_form_key
    AND active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nenhum formulario ativo para form_key=%', p_form_key
      USING ERRCODE = 'no_data_found';
  END IF;

  INSERT INTO public.form_results (
    form_id, form_key, reference_id, domain, version, schema_snapshot, answers
  )
  VALUES (
    v_form.id, v_form.form_key, p_reference_id, p_domain, v_form.version, v_form.schema,
    COALESCE(p_answers, '{}'::jsonb)
  )
  ON CONFLICT (tenant_id, domain, reference_id) DO UPDATE SET
    answers          = EXCLUDED.answers,
    version          = EXCLUDED.version,
    schema_snapshot  = EXCLUDED.schema_snapshot,
    form_id          = EXCLUDED.form_id,
    form_key         = EXCLUDED.form_key,
    updated_at       = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_form_result_upsert(text, text, text, jsonb) TO auth_user;

-- ---------------------------------------------------------------------------------------------
-- 4) RBAC wiring + plugin registration (see kizuna-core/plugins/README.md convention).
-- ---------------------------------------------------------------------------------------------
INSERT INTO auth.permissions (resource, action, name)
VALUES ('forms', 'manage', 'Gerenciar formularios')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('forms', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
