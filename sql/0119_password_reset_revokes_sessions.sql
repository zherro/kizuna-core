-- sql/0119_password_reset_revokes_sessions.sql
-- Redefinir a senha agora revoga as sessões abertas (`auth.users.sessions_revoked_at`, criada no
-- 0113 e checada pelo proxy em account/session-revocation.ts). Antes, quem tinha invadido a conta
-- continuava logado até o JWT expirar (7 dias). Só redefine a função; GRANTs do 0112 continuam.

CREATE OR REPLACE FUNCTION auth.fun_auth__password_reset_confirm(
  p_token_hash text,
  p_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_token_id bigint;
  v_uid uuid;
BEGIN
  PERFORM auth.fun_auth__password_reset_assert_purpose();

  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'password_too_short' USING ERRCODE = '22023';
  END IF;

  SELECT t.id, t.user_uid
    INTO v_token_id, v_uid
  FROM auth.password_reset_tokens t
  JOIN auth.users u ON u.uid = t.user_uid
  WHERE t.token_hash = p_token_hash
    AND t.used_at IS NULL
    AND t.expires_at > now()
    AND COALESCE(u.is_active, false)
    AND u.deleted_at IS NULL
  FOR UPDATE OF t;

  IF v_token_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE auth.users
     SET password = auth.crypt(p_password, auth.gen_salt('bf', 10)),
         -- Derruba as sessões já emitidas (JWT de 7 dias): quem invadiu a conta sai junto.
         -- Truncado ao segundo porque o `iat` do JWT é em segundos — um login logo depois
         -- do reset, no mesmo segundo, não pode cair na revogação.
         sessions_revoked_at = date_trunc('second', now())
   WHERE uid = v_uid;

  -- Queima este token e qualquer outro pendente do mesmo usuário.
  UPDATE auth.password_reset_tokens
     SET used_at = now()
   WHERE user_uid = v_uid
     AND used_at IS NULL;

  RETURN true;
END;
$$;

NOTIFY pgrst, 'reload schema';
