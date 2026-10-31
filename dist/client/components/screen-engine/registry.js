import dynamic from 'next/dynamic';
import { PageHeaderBlock } from '../page-header-block';
// Blocos client pesados (editor markdown/quill em `account-form`, tabelas em `list`/`resource-screen`,
// etc.) entram por `next/dynamic` — cada um vira seu próprio chunk, carregado só quando uma tela
// realmente referencia o bloco. Sem isto toda página do screen-engine puxa o registry inteiro.
// `page-header` fica com import estático: é leve, `serverSafe`, e serve pra streamar HTML na hora.
const ResourceScreen = dynamic(() => import('../resource-screen').then((m) => m.ResourceScreen));
const ListBlock = dynamic(() => import('../list-block').then((m) => m.ListBlock));
const TaxonomyManager = dynamic(() => import('../taxonomy/taxonomy-manager').then((m) => m.TaxonomyManager));
const AccountForm = dynamic(() => import('../onboarding/user-data-form').then((m) => m.AccountForm));
const ReviewModerationTable = dynamic(() => import('../reviews').then((m) => m.ReviewModerationTable));
/**
 * Every component a screen config can reference by name. Adding a screen
 * never means writing a one-off page component — it means either reusing a
 * block already here, or registering a new one once so every future screen
 * can reuse it too.
 *
 * `serverSafe` is metadata for humans/AI composing a screen, not something
 * this file enforces — Next.js already lets a Server Component
 * (`render-screen.tsx`) render a Client Component as a child natively, so a
 * `serverSafe: false` entry works here too. It's there so a screen author
 * knows which blocks stream real HTML immediately (`page-header`) and which
 * ones wait for hydration (`resource-screen`, `taxonomy-manager`).
 */
export const SCREEN_COMPONENT_REGISTRY = {
    'page-header': { component: PageHeaderBlock, serverSafe: true },
    'resource-screen': { component: ResourceScreen, serverSafe: false },
    'taxonomy-manager': { component: TaxonomyManager, serverSafe: false },
    list: { component: ListBlock, serverSafe: false },
    'account-form': { component: AccountForm, serverSafe: false },
    'review-moderation': { component: ReviewModerationTable, serverSafe: false },
};
//# sourceMappingURL=registry.js.map