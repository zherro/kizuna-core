import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { RenderScreen } from './render-screen';
import { TAXONOMIA_SCREEN_GROUP } from './screens/taxonomia-group';
import { MINHA_CONTA_SCREEN } from './screens/minha-conta';
import { FormsAdmin } from '../forms';
import { PagesAdmin } from '../pages/PagesAdmin';
import { DEFAULT_RESERVED_SLUGS } from '../pages/reserved-slugs';
import { PageContainerWrapper } from '../wrappers/page-container-wrapper';
import { PageHeaderWrapper } from '../wrappers/page-header-wrapper';
import { AgendaConfigPage } from '../agenda-config/agenda-config-page';
import { UserAccessManagerScreen } from '../rbac/user-access-manager';
import { RpcTester } from '../rpc-tester';
// Envolve um ScreenConfig do screen-engine num componente pronto pra render.
function screenComponent(config) {
    const C = () => _jsx(RenderScreen, { config: config });
    C.displayName = `KizunaScreen(${config.id})`;
    return C;
}
function FormulariosScreen() {
    return (_jsxs(PageContainerWrapper, { children: [_jsx(PageHeaderWrapper, { title: "Formul\u00E1rios", description: "Defini\u00E7\u00F5es de formul\u00E1rio reutiliz\u00E1veis e as respostas capturadas." }), _jsx(FormsAdmin, {})] }));
}
function PaginasScreen() {
    return (_jsxs(PageContainerWrapper, { children: [_jsx(PageHeaderWrapper, { title: "P\u00E1ginas", description: "Conte\u00FAdo institucional em Markdown, servido por /[slug]." }), _jsx(PagesAdmin, { reservedSlugs: DEFAULT_RESERVED_SLUGS })] }));
}
/**
 * Telas de painel que o kizuna-core já entrega. A rota `/painel/[...kizuna]` do
 * template resolve qualquer chave aqui. Cada tela ainda é gateada por RLS no
 * banco; `permResource`/`adminOnly` só controlam o acesso à rota.
 *
 * As tabelas/RPCs que essas telas usam vêm das migrations dos plugins
 * (`node kizuna-core/cli db install`). Sem elas a tela abre mas as chamadas
 * de API falham.
 */
export const KIZUNA_SCREEN_REGISTRY = {
    // plugin `taxonomy`
    'taxonomia/arvore': {
        title: 'Árvore de categorias',
        component: screenComponent(TAXONOMIA_SCREEN_GROUP.arvore),
        adminOnly: true,
    },
    'taxonomia/categorias': {
        title: 'Categorias',
        component: screenComponent(TAXONOMIA_SCREEN_GROUP.categorias),
        adminOnly: true,
    },
    'taxonomia/subcategorias': {
        title: 'Subcategorias',
        component: screenComponent(TAXONOMIA_SCREEN_GROUP.subcategorias),
        adminOnly: true,
    },
    // plugin `forms`
    'administracao/formularios': {
        title: 'Formulários',
        component: FormulariosScreen,
        permResource: 'forms',
    },
    // plugin `pages`
    'administracao/paginas': { title: 'Páginas', component: PaginasScreen, permResource: 'pages' },
    // plugin `agenda`
    agenda: { title: 'Agenda', component: AgendaConfigPage },
    // core — RBAC / acessos
    'administracao/acessos': {
        title: 'Acessos dos usuários',
        component: UserAccessManagerScreen,
        permResource: 'tenant_member',
    },
    // core — testador de RPC (dev)
    funcoes: {
        title: 'Teste de funções',
        component: () => _jsx(RpcTester, { backHref: "/painel", backLabel: "Voltar ao painel" }),
    },
    // core — conta do usuário logado
    'minha-conta': { title: 'Minha conta', component: screenComponent(MINHA_CONTA_SCREEN) },
};
//# sourceMappingURL=kizuna-screen-registry.js.map