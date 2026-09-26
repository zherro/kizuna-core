-- 0115_account_facts.sql
-- Fatos sobre a conta do usuário logado, para os níveis de conta progressivos
-- (src/shared/account-levels). A REGRA de cada nível mora em código; aqui só se lê o estado:
-- verificações (auth.users) + campos do perfil (public.user_data, se o plugin estiver instalado).
--
-- Email verificado conta por qualquer um dos caminhos: auth.users.email_verified_at (login social,
-- 0113) ou public.user_data.email_verified (fluxo de código por email do plugin user_data).
-- Telefone só conta por auth.users.phone_verified_at (OTP, 0114) — user_data.phone_verified é um
-- campo que nenhum fluxo verificado preenche.
--
-- Sem sessão (fun_auth_user_id() nulo) → {authenticated: false}. Tudo no schema auth.
-- Aditivo + idempotente.

CREATE OR REPLACE FUNCTION auth.fun_auth__account_facts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_uid uuid := auth.fun_auth_user_id();
  v_email_verified boolean := false;
  v_phone_verified boolean := false;
  v_profile jsonb := '{}'::jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('authenticated', false);
  END IF;

  SELECT u.email_verified_at IS NOT NULL, u.phone_verified_at IS NOT NULL
    INTO v_email_verified, v_phone_verified
  FROM auth.users u
  WHERE u.uid = v_uid AND u.deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('authenticated', false);
  END IF;

  IF to_regclass('public.user_data') IS NOT NULL THEN
    EXECUTE $q$
      SELECT jsonb_build_object(
               'full_name', d.full_name,
               'avatar_url', d.avatar_url,
               'document_type', d.document_type,
               'document_number', d.document_number,
               'state', d.state,
               'city', d.city,
               'zip_code', d.zip_code,
               'email_verified', d.email_verified
             )
      FROM public.user_data d
      WHERE d.user_id = $1
      LIMIT 1
    $q$
    INTO v_profile
    USING v_uid;
  END IF;

  v_profile := COALESCE(v_profile, '{}'::jsonb);

  RETURN jsonb_build_object(
    'authenticated', true,
    'email_verified', v_email_verified OR COALESCE((v_profile ->> 'email_verified')::boolean, false),
    'phone_verified', v_phone_verified,
    -- Porta para a verificação de identidade (documento + selfie com IA). Sem fonte na v1.
    'identity_verified', false,
    'profile', v_profile - 'email_verified'
  );
END;
$$;

REVOKE ALL ON FUNCTION auth.fun_auth__account_facts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth.fun_auth__account_facts() TO auth_user;

NOTIFY pgrst, 'reload schema';
