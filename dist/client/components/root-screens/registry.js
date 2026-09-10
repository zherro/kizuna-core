import { RolesManagerScreen } from '../rbac/roles-manager';
import { PluginsScreen } from './plugins-screen';
import { RootAccessLogScreen } from './root-access-log-screen';
/**
 * Every ROOT-only administration screen a project can route to via the catch-all routes
 * `/painel/root/[slug]` (group `root`) and `/painel/security/[slug]` (group `security`) — see
 * `resolver.tsx`. Adding a screen here never means writing a new `page.tsx` by hand in a
 * consuming project: the catch-all route already resolves any slug registered here (or, for a
 * slot, any slug the project itself supplies a component for).
 */
export const ROOT_SCREEN_REGISTRY = {
    plugins: { title: 'Plugins instalados', group: 'root', component: PluginsScreen },
    papeis: { title: 'Papéis e permissões', group: 'root', component: RolesManagerScreen },
    configuracoes: { title: 'Configurações', group: 'root', component: null },
    'root-access-log': {
        title: 'Log de acesso root',
        group: 'security',
        component: RootAccessLogScreen,
    },
};
//# sourceMappingURL=registry.js.map