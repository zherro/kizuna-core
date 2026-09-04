# Showcase wiring for the `pages` plugin

The parent session wires the 3 shared showcase files. Register **one** section:

## `showcase/showcase-sections.ts`

- Add `'pages-admin'` to the `ShowcaseSectionId` union.
- Append this entry to `SHOWCASE_SECTIONS`:

```ts
{
  id: 'pages-admin',
  groupId: 'ui-better-soft',
  label: 'Pages Admin',
  description:
    'Gestao master/detail das paginas institucionais do plugin `pages` (Markdown, slug automatico, publicar/rascunho, exclusao suave). Salva em /api/resources/pages.',
  usageCode: `import { PagesAdmin } from '@kizuna/core/client/components/pages';

export function PaginasAdminPage() {
  // reservedSlugs = os nomes de rota de topo do app consumidor
  return <PagesAdmin reservedSlugs={['painel', 'busca', 'anuncios', 'login']} />;
}`,
}
```

## `showcase/showcase-section-page.tsx`

- Import: `import { PagesAdminShowcaseDemo } from '../pages/showcase-demo';`
- Render `<PagesAdminShowcaseDemo />` for `sectionId === 'pages-admin'`.

## Lucide icon

`FileText` (used for the nav/section icon, consistent with the admin list rows).

## Notes

- `PageView` is a **server component** and cannot be imported into the `'use client'` showcase
  page, so the demo is `PagesAdmin`. In the showcase there is no `/api/resources/pages`
  backend, so it renders its empty/error state — still a useful preview of the chrome.
