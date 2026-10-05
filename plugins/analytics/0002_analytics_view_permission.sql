-- plugins/analytics/0002_analytics_view_permission.sql
-- `analytics/view`: permissão própria do menu "Métricas" do painel, para liberá-lo por papel na tela
-- de papéis. Só entra no catálogo — nenhum papel recebe por padrão (root passa sempre); quem for
-- liberar concede em /painel/root/papeis. As policies das tabelas de analytics não mudam.

INSERT INTO auth.permissions (resource, action, name)
VALUES ('analytics', 'view', 'Ver as métricas das próprias publicações')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('analytics', '2.1.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
