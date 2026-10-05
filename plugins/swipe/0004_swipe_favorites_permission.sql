-- plugins/swipe/0004_swipe_favorites_permission.sql
-- `favorites/view`: permissão própria do menu "Favoritos" do painel. Ninguém perde acesso:
-- todo papel com `default/view` ganha `favorites/view`.

INSERT INTO auth.permissions (resource, action, name)
VALUES ('favorites', 'view', 'Ver e gerenciar os próprios favoritos')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO auth.role_grants (role_id, permission_id)
SELECT g.role_id, f.id
  FROM auth.role_grants g
  JOIN auth.permissions d ON d.id = g.permission_id AND d.resource = 'default' AND d.action = 'view'
 CROSS JOIN auth.permissions f
 WHERE f.resource = 'favorites' AND f.action = 'view'
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
