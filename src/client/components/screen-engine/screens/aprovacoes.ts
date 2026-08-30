import { SERVICE_LOCATION_LABEL, SERVICE_STATUS_LABEL } from '@/components/services/service-type';
import type { ListBlockConfig } from '../../list-block';
import type { ScreenConfig } from '../../../../types/screen';

/**
 * `page-header` (`admin-reader` variant) + `list` (generic, search/filter/paginate + "Iniciar
 * revisão"), config'd here with the review action/status filter — same pattern `meus-servicos.ts`
 * uses with an edit action instead. Reviewing a row opens `screens/aprovacoes/[id]/page.tsx` →
 * `ServiceWizard` in review mode, NOT a screen-engine block — editing an existing multi-step
 * entity is the wizard's job, not this engine's (see .claude/libs/screen-engine.md).
 *
 * `maxWidth: 'narrow'` + `page-header`'s `variant: 'admin-reader'` match this screen to
 * /painel/agenda/feriados and /painel/meus-servicos — this app's page layout standard.
 *
 * `statusFilter.defaultValue: 'pending'` sets the initial filter to pending services.
 *
 * This module loads through `render-screen.tsx`, a Server Component — `listConfig` therefore
 * crosses a Server → Client boundary as `list`'s props and must stay plain data (no functions, no
 * component/icon references). `SERVICE_STATUS_LABEL`/`SERVICE_LOCATION_LABEL` are plain
 * `Record<string,string>` objects so they're fine to pass straight through; icons are `ICON_MAP`
 * keys and per-field formatting is a `FieldFormat` (see `list-block.tsx`), not a function.
 */

const listConfig: ListBlockConfig = {
  resource: 'services',
  pageSize: 10,
  action: {
    label: 'Iniciar revisao',
    hrefBase: '/painel/administracao/aprovacoes',
    icon: 'review',
  },
  statusFilter: { defaultValue: 'pending' },
  displayConfig: {
    icon: 'Briefcase',
    singularName: 'Serviço',
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
          tones: { pending: 'warning', active: 'success', paused: 'info', archived: 'muted' },
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

export const APROVACOES_SCREEN: ScreenConfig = {
  id: 'aprovacoes',
  maxWidth: 'narrow',
  blocks: [
    {
      component: 'page-header',
      props: {
        variant: 'admin-reader',
        eyebrow: 'Painel administrativo',
        title: 'Revisao de servicos',
        description:
          'Acompanhe os servicos publicados e inicie uma revisao para aprovar, pausar ou arquivar.',
        backHref: '/painel',
        backLabel: 'Painel',
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
