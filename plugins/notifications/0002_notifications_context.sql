-- plugins/notifications/0002_notifications_context.sql
-- Follow-up to 0001_notifications.sql. Adds context columns (link a notification back to the
-- entity it's about) + two helper functions: auth.fun_notify (push a notification as the
-- recipient's own tenant, callable from any other plugin's SECURITY DEFINER RPC) and
-- fn_notifications_mark_all_read (bulk mark-as-read for the bell icon). `notifications` also
-- moves from optional to a required dependency of the project going forward — see
-- kizuna.plugins.json (Task 5).

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS context_type text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS context_id text;

-- Pushes a notification to p_user_id, resolving THEIR tenant (not the caller's) — a caller acting
-- on behalf of another user (e.g. the other participant of a pedido) must never notify itself
-- into the recipient's tenant_id column by accident.
CREATE OR REPLACE FUNCTION auth.fun_notify(
  p_user_id      uuid,
  p_type         text,
  p_title        text,
  p_body         text DEFAULT NULL,
  p_context_type text DEFAULT NULL,
  p_context_id   text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT uid INTO v_tenant_id FROM auth.tenants WHERE owner_uid = p_user_id LIMIT 1;

  INSERT INTO public.notifications (user_id, tenant_id, type, title, body, context_type, context_id)
  VALUES (p_user_id, v_tenant_id, p_type, p_title, p_body, p_context_type, p_context_id);
END;
$function$;

-- SECURITY INVOKER is enough — the existing UPDATE policy already restricts to the caller's own
-- rows (user_id = auth.fun_auth_user_id()).
CREATE OR REPLACE FUNCTION public.fn_notifications_mark_all_read()
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, auth
AS $function$
  UPDATE public.notifications
     SET read_at = now()
   WHERE user_id = auth.fun_auth_user_id()
     AND read_at IS NULL;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_notifications_mark_all_read() TO auth_user;
-- auth.fun_notify is called ONLY from other SECURITY DEFINER functions (never directly by
-- auth_user) — no EXECUTE grant to auth_user, same reasoning as auth.fun_msg_is_participant.

NOTIFY pgrst, 'reload schema';
