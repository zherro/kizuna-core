-- 0006_services_account_facts.sql
-- Contagem de anúncios do usuário logado, para o nível de conta "Anunciante"
-- (requisito listing_published em src/shared/account-levels). Publicado = active ou paused
-- (passou pela aprovação); pendente = pending. SECURITY INVOKER: a RLS de services já limita
-- ao dono. Aditivo + idempotente.

CREATE OR REPLACE FUNCTION public.fun_services__my_listing_counts()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, auth
AS $$
  SELECT jsonb_build_object(
    'published', count(*) FILTER (WHERE s.status IN ('active', 'paused')),
    'pending',   count(*) FILTER (WHERE s.status = 'pending')
  )
  FROM public.services s
  WHERE s.active AND s.created_by = auth.fun_auth_user_id();
$$;

REVOKE ALL ON FUNCTION public.fun_services__my_listing_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fun_services__my_listing_counts() TO auth_user;

NOTIFY pgrst, 'reload schema';
