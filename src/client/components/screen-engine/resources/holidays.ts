import type { ResourceScreenConfig } from '../../../../types/resource-screen';

/**
 * `ResourceScreenConfig` for the `holidays` postgrestResource (master
 * holiday catalog, ADMIN-managed).
 *
 * NOT wired into any `screens/*.ts` yet — `/painel/administracao/feriados`
 * (+ `/novo`, `/[id]`) still runs on hand-rolled `HolidaysTable`/
 * `HolidaysForm` (`src/components/agenda/holidays-*.tsx`), not this config.
 * This file exists purely as the documented field/label shape of the
 * `holidays` resource, so a future UI builder (or a real migration to
 * `resource-screen`) has a source of truth to read instead of re-deriving
 * it from the legacy components.
 *
 * Two gaps block wiring this into `resource-screen` today (see
 * `.claude/libs/screen-engine.md`, "Erros que já aconteceram aqui" / manual
 * §3.4):
 * - `scope` drives conditional fields in the real form (`stateCode` only
 *   for state/city, `cityIbge` only for city) — `ResourceScreenField` has
 *   no `visibleWhen` yet, so below they're modeled as always-visible.
 * - `stateCode` is a `select` populated from `/api/agenda/ufs` (a fixed
 *   BR-UF list), not a `postgrestResource` — `relation` can only load from
 *   `postgrestResources`, so it can't express that endpoint. Modeled as
 *   free `text` here instead.
 */
export const HOLIDAYS_RESOURCE: ResourceScreenConfig = {
  resource: 'holidays',
  entitySingular: 'feriado',
  entityPlural: 'feriados',
  orderBy: 'date',
  orderDirection: 'asc',
  pageSize: 20,
  searchPlaceholder: 'Buscar feriado por nome, descricao ou UF',
  fields: [
    { name: 'name', label: 'Nome do feriado', type: 'text', placeholder: 'Ex.: Natal' },
    {
      name: 'description',
      label: 'Descricao',
      type: 'textarea',
      placeholder: 'Ex.: Feriado municipal com servicos reduzidos',
      maxLength: 280,
    },
    // No `date` field type in ResourceScreenField yet — modeled as `text`
    // (real form uses `<input type="date">`, out of scope for this vocabulary today).
    { name: 'date', label: 'Data', type: 'text', placeholder: 'AAAA-MM-DD' },
    {
      name: 'scope',
      label: 'Escopo',
      type: 'select',
      options: [
        { value: 'national', label: 'Nacional' },
        { value: 'state', label: 'Estadual' },
        { value: 'city', label: 'Municipal' },
      ],
    },
    // Real form only shows this when scope is 'state' or 'city' — see file header.
    { name: 'stateCode', label: 'UF', type: 'text', placeholder: 'Ex.: SP', required: false },
    // Real form only shows this when scope is 'city' — see file header.
    {
      name: 'cityIbge',
      label: 'Codigo IBGE da cidade',
      type: 'text',
      placeholder: 'Ex.: 3550308',
      required: false,
    },
    {
      name: 'recurring',
      label: 'Recorrente (repete todo ano)',
      type: 'switch',
      defaultValue: true,
    },
    { name: 'active', label: 'Ativo', type: 'switch', defaultValue: true },
  ],
  list: {
    primaryField: 'name',
    secondaryField: 'scope',
    statusField: 'active',
    descriptionField: 'description',
  },
  messages: {
    saveError: 'Nao foi possivel salvar feriado.',
    saveSuccess: 'Feriado salvo com sucesso.',
    connectionError: 'Erro de conexao com a API de feriados.',
    deleteError: 'Nao foi possivel remover o feriado.',
    deleteSuccess: 'Feriado removido com sucesso.',
  },
};
