import type { ScreenConfig } from '../../../../types/screen';
import { CATEGORIES_RESOURCE } from '../resources/categories';

export const CATEGORIAS_SCREEN: ScreenConfig = {
  id: 'categorias',
  blocks: [
    {
      component: 'page-header',
      props: {
        eyebrow: 'Painel administrativo',
        title: 'Cadastro de categorias',
        description:
          'CRUD padrao com listagem e formulario integrado a API local do Next. Depois a camada de API pode ser trocada pelo backend real sem mexer na tela.',
        backHref: '/painel',
      },
    },
    {
      component: 'resource-screen',
      props: { config: CATEGORIES_RESOURCE },
    },
  ],
};
