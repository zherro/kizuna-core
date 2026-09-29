-- 0116_default_panel_permission.sql
-- `default/view` é a permissão de entrada do painel: os itens base do menu (Painel, Minha conta,
-- Meu conteúdo) exigem `permResource: 'default'`, e o PanelShell manda pra notFound() quando a rota
-- não bate com nenhum item acessível. Até aqui ela só existia se o banco trouxesse dados legados em
-- auth.role_permissions (backfill do 0103) — num banco novo ninguém além do root entrava no /painel.

INSERT INTO auth.permissions (resource, action, name)
VALUES ('default', 'view', 'Acessar o painel')
ON CONFLICT (resource, action) DO NOTHING;

-- ADMIN (role_id=2): papel com que todo usuário nasce (fun_auth__signup_bootstrap). USER (3)
-- continua sem role_grants por desenho (0103).
INSERT INTO auth.role_grants (role_id, permission_id)
SELECT 2, id FROM auth.permissions WHERE resource = 'default' AND action = 'view'
ON CONFLICT DO NOTHING;
