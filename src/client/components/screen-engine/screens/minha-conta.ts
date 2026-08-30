import type { ScreenConfig } from '../../../../types/screen';

/**
 * `page-header` + the bespoke `account-form` block — same composition pattern as
 * `meus-servicos.ts` (`page-header` + `list`), just with a form instead of a list. The form
 * itself is genuinely bespoke (Passo 2B of `.claude/skills/nova-tela-screen-engine/SKILL.md`):
 * avatar upload, document mask/validation, email/phone verification badges and the onboarding
 * step side-effect aren't a plain CRUD form `resource-screen` could express as config — but the
 * page it lives on now shares the same `page-header` + `maxWidth: 'narrow'` shell every other
 * `/painel` screen uses instead of a hand-rolled header, per padrao-de-projeto.
 *
 * Not run through `createScreenPage` — that factory's gate is hardcoded to `tenant_type ===
 * 'ADMIN'`, but this is every logged-in user's own account page. See
 * `app/painel/minha-conta/page.tsx`, which hand-rolls the session check and calls `RenderScreen`
 * directly, same as `meus-servicos/page.tsx`.
 */
export const MINHA_CONTA_SCREEN: ScreenConfig = {
  id: 'minha-conta',
  maxWidth: 'narrow',
  blocks: [
    {
      component: 'page-header',
      props: {
        variant: 'admin-reader',
        eyebrow: 'Minha conta',
        title: 'Dados do usuário',
        description: 'Mantenha seu perfil atualizado com suas informações pessoais.',
        backHref: '/painel',
        backLabel: 'Painel',
      },
    },
    {
      component: 'account-form',
      props: {},
    },
  ],
};
