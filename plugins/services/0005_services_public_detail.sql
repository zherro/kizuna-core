-- plugins/services/0005_services_public_detail.sql
-- Duas RPCs públicas (SECURITY DEFINER) que a tela de detalhe de um anúncio (`/anuncios/[uid]`,
-- projeto consumidor) precisa e que nenhuma policy de `anon` cobre hoje:
--
--  * fn_get_service_provider(uid)              — perfil público do prestador dono do anúncio.
--  * fn_get_public_service_form_answers(uid)   — respostas dinâmicas por categoria (plugin forms).
--
-- Ambas só devolvem dado de um `services` ativo + `status = 'active'` (mesmo portão que a policy
-- de leitura anônima de `services` já usa) e uma lista fixa de colunas — nunca `tenant_id`,
-- `created_by`, `submitted_by`/`form_id` nem qualquer coluna privada de `user_data`.

-- fn_get_service_provider — o "prestador" de um anúncio, num app multi-tenant, é o TENANT do
-- serviço, não `services.created_by` (nullable — seeds, imports e anúncios criados por um admin em
-- nome de outra pessoa deixam null; e mesmo preenchido, é quem digitou o anúncio, não
-- necessariamente o dono do perfil). Resolve pelo mesmo LATERAL que `fn_search_services` (plugin
-- `search`) já usa pro card de busca, então "Quem atende" bate com o card.
DROP FUNCTION IF EXISTS public.fn_get_service_provider(uuid);

CREATE OR REPLACE FUNCTION public.fn_get_service_provider(p_service_uid uuid)
 RETURNS TABLE(
   user_id uuid,
   full_name character varying,
   display_name character varying,
   avatar_url character varying,
   bio text,
   city character varying,
   state character varying
 )
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT prov.user_id, prov.full_name, prov.display_name, prov.avatar_url,
         prov.bio, prov.city, prov.state
  FROM public.services s
  JOIN LATERAL (
    SELECT ud.user_id, ud.full_name, ud.display_name, ud.avatar_url, ud.bio, ud.city, ud.state
    FROM public.user_data ud
    WHERE ud.tenant_id = s.tenant_id
      AND ud.active = true
    ORDER BY ud.created_at
    LIMIT 1
  ) prov ON true
  WHERE s.uid = p_service_uid
    AND s.active = true
    AND s.status = 'active'
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_service_provider(uuid) TO anon, auth_user;

-- fn_get_public_service_form_answers — leitura pública das respostas dinâmicas por categoria (o
-- passo "dynamic-form" do wizard de serviços, plugin `forms`). `form_results` é genérica (não sabe
-- se a entidade que descreve é pública) — a regra "isso pode aparecer pra um visitante anônimo" é
-- de `services` (o mesmo portão da policy de leitura anônima), por isso a checagem mora aqui, não
-- em `forms`. `anon` não tem SELECT em `form_results` (plugin forms concede só a `auth_user`) —
-- esta função é a única fresta, e devolve só `answers` + `schema_snapshot`.
DROP FUNCTION IF EXISTS public.fn_get_public_service_form_answers(uuid);

CREATE OR REPLACE FUNCTION public.fn_get_public_service_form_answers(p_service_uid uuid)
 RETURNS TABLE(
   answers jsonb,
   schema_snapshot jsonb
 )
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT fr.answers, fr.schema_snapshot
  FROM public.services s
  JOIN public.form_results fr
    ON fr.tenant_id = s.tenant_id
   AND fr.domain = 'service'
   AND fr.reference_id = s.id::text
  WHERE s.uid = p_service_uid
    AND s.active = true
    AND s.status = 'active'
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_public_service_form_answers(uuid) TO anon, auth_user;

NOTIFY pgrst, 'reload schema';
