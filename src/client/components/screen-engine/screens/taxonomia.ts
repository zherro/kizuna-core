import type { ScreenConfig } from '../../../../types/screen';

/**
 * `taxonomy-manager` is NOT a generic `resource-screen` — it's the existing
 * bespoke group→category→subcategory→tag tree editor
 * (`kizuna-core/src/client/components/taxonomy/taxonomy-manager.tsx`), registered as-is. This is
 * the other half of the validation: the engine composes a page from a mix
 * of generic blocks (`page-header`) and one-off registered blocks
 * (`taxonomy-manager`) side by side — it doesn't force every screen into
 * the flat CRUD shape. Only the page-level layout moved into JSON; the
 * tree's own logic was intentionally left untouched.
 */
export const TAXONOMIA_SCREEN: ScreenConfig = {
  id: 'taxonomia',
  blocks: [
    {
      component: 'page-header',
      props: {
        eyebrow: 'Painel administrativo',
        title: 'Taxonomia de servicos',
        description:
          'Grupo → Categoria → Especialidade → Tags em uma unica arvore. Clique em "Editar" em qualquer nivel, ou use os botoes "+" para adicionar um item novo.',
        backHref: '/painel',
      },
    },
    {
      component: 'taxonomy-manager',
      props: {},
    },
  ],
};
