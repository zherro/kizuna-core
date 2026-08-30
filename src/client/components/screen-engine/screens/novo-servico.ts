import type { ScreenConfig } from '../../../../types/screen';

export const NOVO_SERVICO_SCREEN: ScreenConfig = {
  id: 'novo-servico',
  maxWidth: 'narrow',
  blocks: [
    {
      component: 'page-header',
      props: {
        variant: 'admin-reader',
        eyebrow: 'Criar novo',
        title: 'Novo Serviço',
        description: 'Preencha as informações básicas para criar um novo serviço.',
        backHref: '/painel/meus-servicos',
        backLabel: 'Meus Serviços',
      },
    },
    {
      component: 'service-wizard',
      props: {
        resource: 'services',
        mode: 'create',
        redirectOnSuccess: '/painel/meus-servicos',
      },
    },
  ],
};
