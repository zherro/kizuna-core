-- plugins/tickets/0003_tickets_view_permission.sql
-- `tickets/view`: permissão própria do menu "Chamados" (abrir e acompanhar os próprios chamados).
-- Antes o menu usava `default/view` e, na tela de papéis, aparecia misturado ao acesso básico do
-- painel — não dava para liberar o painel sem liberar chamados, nem o contrário.
--
-- Para ninguém perder acesso, todo papel que hoje tem `default/view` ganha `tickets/view`.
-- `tickets/manage` (ver todos, responder) continua separado. As policies de `tickets` não mudam:
-- o dono sempre vê os próprios chamados; esta permissão só controla o menu e a rota.

INSERT INTO auth.permissions (resource, action, name)
VALUES ('tickets', 'view', 'Abrir e acompanhar os próprios chamados')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO auth.role_grants (role_id, permission_id)
SELECT g.role_id, t.id
  FROM auth.role_grants g
  JOIN auth.permissions d ON d.id = g.permission_id AND d.resource = 'default' AND d.action = 'view'
 CROSS JOIN auth.permissions t
 WHERE t.resource = 'tickets' AND t.action = 'view'
ON CONFLICT DO NOTHING;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('tickets', '1.2.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
