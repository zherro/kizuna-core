-- plugins/services/0009_services_view_permission.sql
-- `services/view`: permissão própria do menu "Publicações" (criar e gerenciar os próprios anúncios).
-- Antes usava `default/view` e não dava para liberar o painel sem liberar publicações.
-- Ninguém perde acesso: todo papel com `default/view` ganha `services/view`.

INSERT INTO auth.permissions (resource, action, name)
VALUES ('services', 'view', 'Criar e gerenciar os próprios anúncios')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO auth.role_grants (role_id, permission_id)
SELECT g.role_id, s.id
  FROM auth.role_grants g
  JOIN auth.permissions d ON d.id = g.permission_id AND d.resource = 'default' AND d.action = 'view'
 CROSS JOIN auth.permissions s
 WHERE s.resource = 'services' AND s.action = 'view'
ON CONFLICT DO NOTHING;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('services', '1.4.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
