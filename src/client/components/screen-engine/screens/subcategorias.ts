import type { ScreenConfig } from '../../../../types/screen';
import { SUBCATEGORIES_RESOURCE } from '../resources/subcategories';

export const SUBCATEGORIAS_SCREEN: ScreenConfig = {
  id: 'subcategorias',
  blocks: [
    {
      component: 'page-header',
      props: {
        eyebrow: 'Painel administrativo',
        title: 'Cadastro de subcategorias',
        description:
          'Cadastre subcategorias vinculadas a uma categoria principal para organizar melhor sua estrutura.',
        backHref: '/painel',
      },
    },
    {
      component: 'resource-screen',
      props: { config: SUBCATEGORIES_RESOURCE },
    },
  ],
};
