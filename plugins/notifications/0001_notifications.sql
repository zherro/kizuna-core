-- plugins/notifications/0001_notifications.sql
-- Optional. Generic in-app notification feed ("bell icon" list). INSERT is deliberately NOT
-- granted to auth_user — notifications are pushed by trusted backend code (service role or a
-- SECURITY DEFINER function), never self-inserted by the recipient.

CREATE TABLE IF NOT EXISTS public.notifications (
    id           bigserial PRIMARY KEY,
    uid          uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES auth.users(uid) ON DELETE RESTRICT,
    tenant_id    uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
    type         text NOT NULL,
    title        text NOT NULL,
    body         text,
    read_at      timestamptz,
    created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notifications_uid_unique UNIQUE (uid)
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON TABLE public.notifications TO auth_user;
DROP POLICY IF EXISTS notifications_select_policy ON public.notifications;
CREATE POLICY notifications_select_policy ON public.notifications FOR SELECT TO auth_user
USING (user_id = auth.fun_auth_user_id());
DROP POLICY IF EXISTS notifications_update_policy ON public.notifications;
CREATE POLICY notifications_update_policy ON public.notifications FOR UPDATE TO auth_user
USING (user_id = auth.fun_auth_user_id())
WITH CHECK (user_id = auth.fun_auth_user_id());

NOTIFY pgrst, 'reload schema';
