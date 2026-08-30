import type { ResourceScreenConfig } from '../../../../types/resource-screen';

/**
 * `ResourceScreenConfig` for the `holidays_tenant_custom_days_off`
 * postgrestResource (tenant-owned custom days off, full CRUD).
 *
 * NOT wired into any `screens/*.ts` yet — this is one of two tabs on
 * `/painel/agenda/feriados` (`CustomDaysOffTab` in
 * `src/app/painel/agenda/feriados/page.tsx`), which stays hand-rolled
 * (`useForm`/`useTenantResource`) because the page as a whole crosses two
 * other resources (`holidays` + `holidays_tenant`) in its second tab — a
 * shape the engine doesn't compose today (one `resource-screen`/`list` per
 * resource; see `.claude/libs/screen-engine.md`, same category as
 * `taxonomia`). This file documents just this tab's CRUD shape, in
 * isolation, as a source of truth for a future UI builder.
 *
 * Two gaps vs. the real form (see file header of `resources/holidays.ts`
 * for the shared rationale):
 * - `date_interval` conditionally reveals `date_interval_end` in the real
 *   form — no `visibleWhen` yet, modeled as always-visible below.
 * - No `date` field type — `date` and `date_interval_end` modeled as `text`.
 */
export const HOLIDAYS_CUSTOM_DAYS_OFF_RESOURCE: ResourceScreenConfig = {
  resource: 'holidays_tenant_custom_days_off',
  entitySingular: 'folga personalizada',
  entityPlural: 'folgas personalizadas',
  orderBy: 'date',
  orderDirection: 'asc',
  pageSize: 20,
  searchPlaceholder: 'Buscar folga por nome ou descricao',
  fields: [
    {
      name: 'name',
      label: 'Nome',
      type: 'text',
      placeholder: 'Ex.: Folga de aniversario',
    },
    { name: 'date', label: 'Data', type: 'text', placeholder: 'AAAA-MM-DD' },
    {
      name: 'date_interval',
      label: 'Usar intervalo de datas',
      type: 'switch',
      defaultValue: false,
    },
    // Real form only shows this when date_interval is true — see file header.
    {
      name: 'date_interval_end',
      label: 'Ate',
      type: 'text',
      placeholder: 'AAAA-MM-DD',
      required: false,
    },
    {
      name: 'recurring',
      label: 'Recorrente (repete todo ano)',
      type: 'switch',
      defaultValue: false,
    },
    {
      name: 'description',
      label: 'Observacao',
      type: 'textarea',
      placeholder: 'Detalhes sobre esta folga',
      maxLength: 280,
      required: false,
    },
    { name: 'active', label: 'Ativo/Inativo', type: 'switch', defaultValue: true },
  ],
  list: {
    primaryField: 'name',
    secondaryField: 'date',
    statusField: 'active',
    descriptionField: 'description',
  },
  messages: {
    saveError: 'Nao foi possivel salvar a folga personalizada.',
    saveSuccess: 'Folga personalizada salva com sucesso.',
    connectionError: 'Erro de conexao com a API de folgas.',
    deleteError: 'Nao foi possivel remover a folga personalizada.',
    deleteSuccess: 'Folga personalizada removida.',
  },
};
