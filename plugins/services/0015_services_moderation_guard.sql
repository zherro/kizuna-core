-- plugins/services/0015_services_moderation_guard.sql
-- Fecha a autopublicação: o GRANT de UPDATE em public.services é da tabela inteira e as policies só
-- conferem `created_by`, então o dono podia gravar `status = 'active'` e `sponsored = true` direto
-- (pela rota de recursos ou pelo PostgREST) e pular `fn_service_moderate`.
--
-- Trigger BEFORE INSERT OR UPDATE, para quem NÃO tem `services.moderate` e não é sessão de sistema:
--   INSERT: status vira 'pending' e sponsored vira false;
--   UPDATE: status só pode voltar para 'pending' (reenviar para moderação); qualquer outra troca
--           mantém o valor antigo. sponsored e tenant_id mantêm o valor antigo.
-- Silencioso (não dá erro) porque o wizard faz read-merge-write e reenvia esses campos.
-- `fn_service_moderate` é SECURITY DEFINER, mas o JWT do moderador continua na requisição, então
-- passa pela checagem de permissão. Sessão de sistema = mesma regra do 0012 (sem `user_id` no JWT e
-- papel diferente de anon/auth_user: importador, jobs, service_role).
-- Aditivo e idempotente.

CREATE OR REPLACE FUNCTION public.fn_services_moderation_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, auth
AS $function$
DECLARE
  v_claims text := nullif(current_setting('request.jwt.claims', true), '');
  v_uid    text;
BEGIN
  IF v_claims IS NOT NULL THEN
    BEGIN
      v_uid := v_claims::jsonb ->> 'user_id';
    EXCEPTION WHEN others THEN
      v_uid := NULL;
    END;
  END IF;
  IF v_uid IS NULL AND current_user NOT IN ('anon', 'auth_user') THEN
    RETURN NEW;
  END IF;

  IF auth.fun_auth_has_perm('services', 'moderate') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.sponsored := false;
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'pending' THEN
      NEW.status := OLD.status;
    END IF;
    NEW.sponsored := OLD.sponsored;
    NEW.tenant_id := OLD.tenant_id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_services_moderation_guard ON public.services;
CREATE TRIGGER trg_services_moderation_guard
  BEFORE INSERT OR UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.fn_services_moderation_guard();
