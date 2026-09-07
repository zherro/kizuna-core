import type { ComponentType } from 'react';
import type { ScreenConfig } from '../../../types/screen';
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

/**
 * Uma tela do painel resolvida pela rota catch-all `/painel/[...kizuna]`.
 * A chave é o path relativo a `/painel` com os segmentos unidos por `/`
 * (ex.: `agenda`, `taxonomia/categorias`).
 */
export type KizunaScreenEntry = {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any> | null;
  /** Se setado, exige `session.perms[permResource].view` (ou is_root). */
  permResource?: string;
  /** Se true, exige tenant ADMIN ou is_root (padrão das telas de catálogo). */
  adminOnly?: boolean;
};

// Envolve um ScreenConfig do screen-engine num componente pronto pra render.
function screenComponent(config: ScreenConfig): ComponentType {
  const C = () => <RenderScreen config={config} />;
  C.displayName = `KizunaScreen(${config.id})`;
  return C;
}

function FormulariosScreen() {
  return (
    <PageContainerWrapper>
      <PageHeaderWrapper
        title="Formulários"
        description="Definições de formulário reutilizáveis e as respostas capturadas."
      />
      <FormsAdmin />
    </PageContainerWrapper>
  );
}

function PaginasScreen() {
  return (
    <PageContainerWrapper>
      <PageHeaderWrapper
        title="Páginas"
        description="Conteúdo institucional em Markdown, servido por /[slug]."
      />
      <PagesAdmin reservedSlugs={DEFAULT_RESERVED_SLUGS} />
    </PageContainerWrapper>
  );
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
export const KIZUNA_SCREEN_REGISTRY: Record<string, KizunaScreenEntry> = {
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
    component: () => <RpcTester backHref="/painel" backLabel="Voltar ao painel" />,
  },

  // core — conta do usuário logado
  'minha-conta': { title: 'Minha conta', component: screenComponent(MINHA_CONTA_SCREEN) },
};
