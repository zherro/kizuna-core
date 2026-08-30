import type { ResourceScreenConfig } from '../../../../types/resource-screen';

/**
 * `ResourceScreenConfig` for the `subcategories` postgrestResource. See
 * `resources/categories.ts` for why this lives apart from
 * `screens/subcategorias.ts`.
 */
export const SUBCATEGORIES_RESOURCE: ResourceScreenConfig = {
  resource: 'subcategories',
  entitySingular: 'subcategoria',
  entityPlural: 'subcategorias',
  orderBy: 'name',
  orderDirection: 'asc',
  pageSize: 8,
  searchPlaceholder: 'Buscar por nome, descricao ou slug',
  requireRelationToCreate: true,
  fields: [
    { name: 'name', label: 'Nome', type: 'text', placeholder: 'Ex.: Cirurgia cardiaca' },
    {
      name: 'categoryId',
      label: 'Categoria',
      type: 'relation',
      optionsResource: 'categories',
      optionsFilter: { active: true },
      placeholder: 'Selecione uma categoria',
    },
    {
      name: 'description',
      label: 'Descricao',
      type: 'textarea',
      placeholder: 'Descreva rapidamente a finalidade da subcategoria',
      maxLength: 240,
    },
    { name: 'active', label: 'Status', type: 'switch', defaultValue: true },
  ],
  list: {
    primaryField: 'name',
    secondaryField: 'slug',
    statusField: 'active',
    descriptionField: 'description',
    relationLabelPrefix: 'Categoria: ',
  },
  messages: {
    saveError: 'Nao foi possivel salvar a subcategoria.',
    saveSuccess: 'Subcategoria salva com sucesso.',
    connectionError: 'Erro de conexao com a API de subcategorias.',
    deleteError: 'Nao foi possivel remover a subcategoria.',
    deleteSuccess: 'Subcategoria removida com sucesso.',
  },
};
