import type { ListBlockConfig } from '../../list-block';
import type { ScreenConfig } from '../../../../types/screen';
import { TICKET_STATUS_LABEL, TICKET_TYPE_LABEL } from '../../tickets/types';

/**
 * `/painel/chamados` — `page-header` + `list` do recurso `tickets` (plugin tickets). Sem
 * `fixedFilters`: a RLS já decide o escopo (usuário vê os seus; staff `tickets.manage` vê todos),
 * então a mesma tela serve aos dois. Config é dado puro (cruza Server → Client).
 */
const listConfig: ListBlockConfig = {
  resource: 'tickets',
  title: 'Chamados',
  pageSize: 10,
  action: { label: 'Abrir', hrefBase: '/painel/chamados' },
  emptyState: {
    message: 'Nenhum chamado',
    description: 'Precisa de ajuda? Abra um chamado e a equipe responde por aqui.',
    ctaHref: '/painel/chamados/novo',
    ctaLabel: 'Abrir chamado',
  },
  displayConfig: {
    icon: 'ClipboardCheck',
    singularName: 'chamado',
    notFoundMessage: 'Nenhum chamado encontrado',
    fields: {
      status: {
        label: 'Status',
        format: {
          type: 'enum',
          labels: TICKET_STATUS_LABEL,
          tones: { open: 'warning', in_progress: 'info', resolved: 'success' },
        },
      },
      type: {
        label: 'Tipo',
        format: { type: 'enum', labels: TICKET_TYPE_LABEL },
      },
    },
    badgeFields: ['status'],
    visibleFields: ['type'],
  },
};

export const CHAMADOS_SCREEN: ScreenConfig = {
  id: 'chamados',
  maxWidth: 'narrow',
  blocks: [
    {
      component: 'page-header',
      props: {
        title: 'Chamados',
        description: 'Peça ajuda à equipe e acompanhe as respostas.',
        backHref: '/painel',
        backLabel: 'Painel',
        createAction: { href: '/painel/chamados/novo', label: 'Novo chamado' },
      },
    },
    { component: 'list', props: { config: listConfig } },
  ],
};
