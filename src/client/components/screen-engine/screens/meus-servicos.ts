import { SERVICE_LOCATION_LABEL, SERVICE_STATUS_LABEL } from '../../services/service-labels';
// side effect: registers the 'servicePrice' named formatter used below
import '../../services/register-formatters';
import type { ListBlockConfig } from '../../list-block';
import type { ScreenConfig } from '../../../../types/screen';

/**
 * `page-header` + `list` (generic, search/filter/paginate + "Editar" per row), config'd here with
 * the edit action/create button — same pattern `aprovacoes.ts` uses with a review action instead.
 * Editing a row opens `/painel/meus-servicos/[serviceId]/page.tsx` → `ServiceWizard`, NOT a
 * screen-engine block (see .claude/libs/screen-engine.md).
 *
 * `maxWidth: 'narrow'` + `page-header`'s back link opt this screen into the
 * /painel/agenda/feriados look (this app's page standard) — narrower single-column container,
 * bold title + back-arrow chip instead of the compact grid header most screens use. Both are
 * plain optional screen-config settings, not a one-off page.
 *
 * Not run through `createScreenPage` — that factory's gate is hardcoded to
 * `tenant_type === 'ADMIN'`, but this page is every logged-in user's own listing. See
 * `app/painel/meus-servicos/page.tsx`, which hand-rolls the session check and calls
 * `RenderScreen` directly instead.
 *
 * `fixedFilters.tenant_id: '$session.tenantId'` below is what actually makes this "my own"
 * listing rather than every tenant's — without it this is the same unscoped `services` list
 * `aprovacoes.ts` intentionally shows admins. `app/painel/meus-servicos/page.tsx` must pass
 * `context={{ ..., session: { tenantId: session.tenant_id } }}` to `RenderScreen` for this ref to
 * resolve; see `context.ts`.
 *
 * This module loads through `render-screen.tsx`, a Server Component — `listConfig` therefore
 * crosses a Server → Client boundary as `list`'s props and must stay plain data (no functions, no
 * component/icon references). `SERVICE_STATUS_LABEL`/`SERVICE_LOCATION_LABEL` are plain
 * `Record<string,string>` objects so they're fine to pass straight through; icons are `ICON_MAP`
 * keys and per-field formatting is a `FieldFormat` (see `list-block.tsx`), not a function.
 *
 * Hardcodes the `services` resource (plugin `services`) and its status/location enums.
 *
 * Todo texto que nomeia o item ("Novo serviço", "Nenhum serviço cadastrado"...) vem do vocabulário
 * do projeto via `"$vocab.<frase>"` (`shared/vocabulary`, resolvido em `screen-engine/context.ts`),
 * para o app chamar o item de "Publicação", "Serviço", "Anúncio"... sem mexer aqui. O vocabulário
 * também dita o gênero (Nova/Novo). Rotas e recursos continuam `meus-servicos`/`services`.
 */

const listConfig: ListBlockConfig = {
  resource: 'services',
  title: '$vocab.yours',
  pageSize: 8,
  action: { label: 'Editar', hrefBase: '/painel/meus-servicos', icon: 'edit' },
  statusFilter: {},
  fixedFilters: { tenant_id: '$session.tenantId' },
  // "Novo serviço" é ação do cabeçalho (page-header.createAction, abaixo), não da lista.
  // Gates "Novo servico"/the empty-state CTA behind onboarding completion — a service's detail
  // page shows the advertiser's own profile data, so there must be a completed profile to show.
  // Resolved from `context.session.userId` (see `app/painel/meus-servicos/page.tsx`) by
  // `resolveContextRefs`; see `list-block.tsx`'s `GatedCreateLink`.
  createGateUserId: '$session.userId',
  // Níveis de conta: quando o projeto expõe /api/account/level, vale o nível exigido por
  // 'service.create' (mapa de capacidades do projeto) em vez do check de onboarding acima.
  createGateAction: 'service.create',
  emptyState: {
    message: '$vocab.noneRegistered',
    description: '$vocab.registerFirstHint',
    ctaHref: '/painel/meus-servicos/novo',
    ctaLabel: '$vocab.createFirst',
  },
  displayConfig: {
    icon: 'Briefcase',
    singularName: '$vocab.singular',
    notFoundMessage: '$vocab.noneFound',
    fields: {
      categoryGroup: {
        label: 'Grupo de Categoria',
        format: { type: 'relationName', fallback: 'Sem grupo' },
      },
      category: {
        label: 'Categoria',
        format: { type: 'relationName', fallback: '—' },
      },
      startingPrice: {
        label: 'Preço Inicial',
        format: { type: 'named', name: 'servicePrice' },
      },
      status: {
        label: 'Status',
        format: {
          type: 'enum',
          labels: SERVICE_STATUS_LABEL,
          tones: {
            pending: 'warning',
            active: 'success',
            paused: 'info',
            archived: 'muted',
          },
        },
      },
      serviceLocation: {
        label: 'Localização',
        icon: 'MapPin',
        format: { type: 'enum', labels: SERVICE_LOCATION_LABEL, fallback: '—' },
      },
      urgentAvailable: {
        label: 'Urgência',
        icon: 'Zap',
        format: { type: 'boolean', trueLabel: 'Urgência' },
      },
      sponsored: {
        label: 'Patrocinado',
        icon: 'Sparkles',
        format: { type: 'boolean', trueLabel: 'Patrocinado' },
      },
    },
    badgeFields: ['status', 'sponsored', 'urgentAvailable'],
    visibleFields: ['categoryGroup', 'category', 'serviceLocation'],
    statField: 'startingPrice',
  },
};

export const MEUS_SERVICOS_SCREEN: ScreenConfig = {
  id: 'meus-servicos',
  maxWidth: 'narrow',
  blocks: [
    {
      component: 'page-header',
      props: {
        title: '$vocab.manage',
        description: '$vocab.manageDescription',
        backHref: '/painel',
        backLabel: 'Painel',
        createAction: {
          href: '/painel/meus-servicos/novo',
          label: '$vocab.new',
          gateUserId: '$session.userId',
          gateAction: 'service.create',
        },
      },
    },
    {
      component: 'list',
      props: {
        config: listConfig,
      },
    },
  ],
};
