import type { ResourceScreenConfig } from '../../../../types/resource-screen';

/**
 * `ResourceScreenConfig` for the `categories` postgrestResource — reusable
 * across any screen that wants to compose a `resource-screen` block for it,
 * not tied to the `/painel/categorias` route. Keyed by resource name (like
 * `postgrestResources`), not by route/screen id — see
 * `.claude/libs/screen-engine.md`, "resources/ vs screens/".
 */
export const CATEGORIES_RESOURCE: ResourceScreenConfig = {
  resource: 'categories',
  entitySingular: 'categoria',
  entityPlural: 'categorias',
  orderBy: 'name',
  orderDirection: 'asc',
  pageSize: 8,
  searchPlaceholder: 'Buscar categoria por nome, descricao ou slug',
  fields: [
    { name: 'name', label: 'Nome', type: 'text', placeholder: 'Ex.: Atendimento Premium' },
    {
      name: 'description',
      label: 'Descricao',
      type: 'textarea',
      placeholder: 'Descreva rapidamente a finalidade da categoria',
      maxLength: 240,
    },
    { name: 'active', label: 'Status', type: 'switch', defaultValue: true },
  ],
  list: {
    primaryField: 'name',
    secondaryField: 'slug',
    statusField: 'active',
    descriptionField: 'description',
  },
  messages: {
    saveError: 'Nao foi possivel salvar a categoria.',
    saveSuccess: 'Categoria salva com sucesso.',
    connectionError: 'Erro de conexao com a API de categorias.',
    deleteError: 'Nao foi possivel remover a categoria.',
    deleteSuccess: 'Categoria removida com sucesso.',
  },
};
