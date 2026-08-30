# kizuna-core: Exemplos de Schemas

## 1. ResourceConfig - Definindo o que Persiste

### Exemplo 1: Tabela Simples (Categorias)

```typescript
export const resources = {
  categories: {
    table: 'categories',
    select: 'id, name, slug, icon, description, active, created_at',
    primaryKey: 'id',
    defaultOrder: 'name',
    searchableColumns: ['name', 'description'],
    requiredFields: ['name'],
    softDeleteField: 'active',
    maxPageSize: 500,
  },
};
```

### Exemplo 2: Tabela com Relação (Serviços)

```typescript
export const resources = {
  services: {
    table: 'services',
    select: `
      id,
      uid,
      title,
      category:categories(id, name, slug, icon),
      category_id,
      description,
      starting_price,
      price_unit,
      active,
      created_at
    `,
    primaryKey: 'id',
    defaultOrder: 'created_at.desc',
    searchableColumns: ['title', 'description'],
    requiredFields: ['title', 'category_id'],
    softDeleteField: 'active',

    mapInput: (input) => {
      const title = String(input.title ?? '').trim();
      const categoryId = Number(input.categoryId ?? input.category_id);

      if (!title) throw new Error('Título é obrigatório');
      if (!Number.isFinite(categoryId)) throw new Error('Categoria é obrigatória');

      return {
        title,
        category_id: categoryId,
        description: input.description ?? null,
        starting_price: Number(input.startingPrice ?? 0),
        price_unit: String(input.priceUnit ?? 'quote'),
        active: Boolean(input.active ?? true),
      };
    },

    mapOutput: (record) => {
      const category =
        record.category && typeof record.category === 'object' ? record.category : null;

      return {
        id: String(record.id ?? ''),
        title: String(record.title ?? ''),
        category,
        categoryId: category?.id ? String(category.id) : '',
        description: String(record.description ?? ''),
        startingPrice: record.starting_price ?? 0,
        priceUnit: String(record.price_unit ?? 'quote'),
        active: Boolean(record.active),
        createdAt: record.created_at,
      };
    },
  },
};
```

---

## 2. ScreenConfig - Definindo Como Renderizar

### Exemplo 1: CRUD Simples (Categorias)

```typescript
export const screens = {
  'admin/categories': {
    id: 'admin-categories',
    blocks: [
      {
        component: 'page-header',
        props: {
          title: 'Categorias de Serviços',
          subtitle: 'Organize as categorias disponíveis',
        },
      },
      {
        component: 'resource-screen',
        props: {
          resource: 'categories',
          entitySingular: 'categoria',
          entityPlural: 'categorias',
          pageSize: 20,

          fields: [
            {
              name: 'name',
              label: 'Nome da Categoria',
              type: 'text',
              required: true,
            },
            {
              name: 'slug',
              label: 'Slug',
              type: 'text',
            },
            {
              name: 'description',
              label: 'Descrição',
              type: 'textarea',
              rows: 3,
            },
            {
              name: 'active',
              label: 'Ativo',
              type: 'switch',
              defaultValue: true,
            },
          ],

          list: {
            primaryField: 'name',
            secondaryField: 'slug',
            statusField: 'active',
          },
        },
      },
    ],
  },
};
```

### Exemplo 2: Com Relacionamento (Serviços)

```typescript
export const screens = {
  'painel/meus-servicos': {
    id: 'my-services',
    blocks: [
      {
        component: 'page-header',
        props: {
          title: 'Meus Serviços',
          subtitle: 'Crie e gerencie os serviços que você oferece',
        },
      },
      {
        component: 'resource-screen',
        props: {
          resource: 'services',
          entitySingular: 'serviço',
          entityPlural: 'serviços',

          fields: [
            {
              name: 'title',
              label: 'Nome do Serviço',
              type: 'text',
              required: true,
            },
            {
              name: 'category_id',
              label: 'Categoria',
              type: 'relation',
              optionsResource: 'categories',
              optionsLabelField: 'name',
              required: true,
            },
            {
              name: 'description',
              label: 'Descrição',
              type: 'textarea',
              rows: 4,
            },
            {
              name: 'starting_price',
              label: 'Preço Inicial',
              type: 'text',
            },
            {
              name: 'active',
              label: 'Publicado',
              type: 'switch',
              defaultValue: true,
            },
          ],

          list: {
            primaryField: 'title',
            descriptionField: 'description',
            statusField: 'active',
            relationLabelPrefix: 'Categoria: ',
          },
        },
      },
    ],
  },
};
```

### Exemplo 3: Com Context References (Dinâmico)

```typescript
export const screens = {
  'search/filtrados': {
    id: 'search-by-category',
    blocks: [
      {
        component: 'page-header',
        props: {
          title: 'Serviços em $params.categoryName',
          subtitle: 'Veja todos os serviços desta categoria',
        },
      },
      {
        component: 'resource-screen',
        props: {
          resource: 'services',
          entitySingular: 'serviço',
          entityPlural: 'serviços',

          orderBy: '$searchParams.sortBy',
          orderDirection: '$searchParams.order',

          initialFilter: {
            category_id: '$params.categoryId',
          },

          fields: [
            // ... fields ...
          ],

          list: {
            primaryField: 'title',
            statusField: 'active',
          },
        },
      },
    ],
  },
};
```

---

## 3. Page Component - Uso Prático

### Exemplo: Página de Categoria

```typescript
import { RenderScreen } from '@kizuna/core/client';
import { screens } from '@/config/screens';
import { getSession } from '@/lib/auth';

export default async function CategoriesPage() {
  const session = await getSession();
  const screenConfig = screens['admin/categories'];

  return (
    <RenderScreen
      config={screenConfig}
      context={{
        params: {},
        searchParams: {},
        session: {
          tenant_id: session.tenant_id,
          user_id: session.user_id,
        },
      }}
    />
  );
}
```

---

## 4. Checklist: Implementar uma Nova Tela

- [ ] **Definir Resource** (se não existir)
  - [ ] Table name, columns
  - [ ] mapInput/mapOutput (se houver transform)
  - [ ] Adicionar a `src/config/resources.ts`

- [ ] **Definir ScreenConfig**
  - [ ] Blocos (page-header, resource-screen, etc)
  - [ ] Props para cada bloco
  - [ ] Campos do form
  - [ ] Config da lista
  - [ ] Adicionar a `src/config/screens.ts`

- [ ] **Criar Page Component**
  - [ ] Importar RenderScreen
  - [ ] Passar config + context
  - [ ] Adicionar auth check se necessário

- [ ] **Testar**
  - [ ] Criar registro
  - [ ] Editar registro
  - [ ] Deletar registro
  - [ ] Buscar por termo
  - [ ] Paginar

**Tempo estimado**: 15 minutos (sem componentes customizados).
