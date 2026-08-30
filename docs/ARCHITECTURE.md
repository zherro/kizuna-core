# kizuna-core: Framework Configurável

## Visão Geral

Extrair do `foco-total` uma estrutura reutilizável onde **novos projetos montam UIs inteiras apenas com JSON**, sem escrever uma linha de código de componente ou rota CRUD.

**Hoje**: Foco Total tem resource-config, screen-engine, UI components espalhados.  
**Futuro**: kizuna-core é um pacote npm que exporta essa estrutura, schemas TypeScript/JSON, e guias para compor telas.

---

## 1. Estrutura do Core

```
@kizuna/core/
├── src/
│   ├── types/
│   │   ├── resource.ts          # ResourceConfig, RpcConfig
│   │   ├── screen.ts            # ScreenConfig, ScreenBlock, ScreenContext
│   │   ├── resource-screen.ts   # ResourceScreenConfig, ResourceScreenField
│   │   └── index.ts
│   ├── client/
│   │   ├── hooks/
│   │   │   ├── use-table.ts
│   │   │   ├── use-form.ts
│   │   │   ├── use-delete.ts
│   │   │   ├── use-resource-options.ts
│   │   │   └── use-toggle-active.ts
│   │   ├── components/
│   │   │   ├── render-screen.tsx
│   │   │   ├── resource-screen.tsx
│   │   │   ├── page-header-block.tsx
│   │   │   ├── list-block.tsx
│   │   │   ├── dynamic-field.tsx
│   │   │   ├── registry.tsx       # SCREEN_COMPONENT_REGISTRY
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── server/
│   │   ├── resource-config.ts     # Factory + tipos para ResourceConfig
│   │   ├── resource-crud.ts       # POST, PATCH, DELETE, LIST logic
│   │   ├── postrest-client.ts     # pgrstTable, pgrstRpc wrappers
│   │   └── index.ts
│   ├── utils/
│   │   ├── screen-context.ts      # resolveContextRefs
│   │   ├── field-validators.ts    # buildValidationSchema, defaultValueFor
│   │   └── index.ts
│   └── index.ts
├── schemas/
│   ├── resource.schema.json       # JSON Schema para ResourceConfig
│   ├── screen.schema.json         # JSON Schema para ScreenConfig
│   └── resource-screen.schema.json
├── docs/
│   ├── GETTING_STARTED.md
│   ├── RESOURCE_CONFIG.md
│   ├── SCREEN_CONFIG.md
│   ├── EXAMPLES.md
│   └── ARCHITECTURE.md
└── package.json
```

---

## 2. Schemas JSON

### 2.1 ResourceConfig Schema

Define **o quê** uma tabela expõe via HTTP.

```typescript
type ResourceConfig = {
  schema?: string; // "public" (default)
  table: string; // "services", "holidays", etc

  // Query
  select: string; // PostgREST select (com joins embutidos)
  primaryKey: string; // "id"
  defaultOrder?: string; // "created_at"
  searchableColumns: string[]; // ["title", "description"]

  // Validation
  requiredFields?: string[];
  maxPageSize?: number; // Override do 100-row default
  softDeleteField?: string; // "active", "is_deleted"

  // Transform
  mapInput?: (input) => transformed; // Código TS (não JSON)
  mapOutput?: (record) => formatted; // Código TS (não JSON)

  // Segurança
  listRequiresAuth?: boolean; // Requer JWT?
  returnRepresentation?: boolean; // Retorna registro após POST/PATCH?
};
```

### 2.2 ScreenConfig Schema

Define **como** uma página é montada a partir de blocos.

```typescript
type ScreenBlock = {
  component: string; // "page-header", "resource-screen", "list", etc
  props: Record<string, unknown>; // JSON-serializable props
};

type ScreenConfig = {
  id: string;
  maxWidth?: 'default' | 'narrow';
  blocks: ScreenBlock[];
};

type ScreenContext = {
  params: Record<string, string>;
  searchParams: Record<string, string | string[]>;
  session?: Record<string, string>; // { tenant_id, user_id, ... }
};
```

---

## 3. Como um Novo Projeto Usa kizuna-core

### 3.1 Setup Inicial

```bash
# Novo projeto Next.js
npx create-next-app meu-projeto --typescript --tailwind
cd meu-projeto

# Adiciona kizuna-core
npm install @kizuna/core
```

### 3.2 Estrutura do Projeto

```
meu-projeto/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── resources/[resource]/route.ts  # Generic proxy (3 linhas)
│   │   ├── painel/
│   │   │   ├── categorias/
│   │   │   │   └── page.tsx         # RenderScreen (5 linhas)
│   │   │   └── layout.tsx
│   ├── config/
│   │   ├── resources.ts             # Resource registry
│   │   └── screens.ts               # Screen registry
│   └── lib/
│       └── postrest-client.ts       # Wrapper init
└── config/
    ├── resources.json
    └── screens.json
```

### 3.3 Exemplo: Rota Genérica

**`src/app/api/resources/[resource]/route.ts`** (3 linhas):

```typescript
import { handleResourceRoute } from '@kizuna/core/server';
import { resources } from '@/config/resources';

export const { GET, POST, PATCH, DELETE } = handleResourceRoute(resources);
```

### 3.4 Exemplo: Página com RenderScreen

**`src/app/painel/categorias/page.tsx`** (10 linhas):

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
      context={{ params: {}, searchParams: {}, session }}
    />
  );
}
```

---

## 4. Decisões Arquiteturais

### Por que JSON?

- **Humanamente possível**: Não-programadores entendem a estrutura.
- **Versionável**: Telas são config, não código — diffs são limpos.
- **Reutilizável**: Novo projeto importa e estende, não copia-cola.

### Por que separar ResourceConfig de ScreenConfig?

- **Ortogonal**: Um resource pode ser usado por múltiplas telas.
- **Reutilização**: `resource: 'categories'` funciona em várias telas.

### Por que Context References (`$params`, `$session`)?

- **Dinâmico sem função**: A tela não precisa de lógica — resolve em render time.
- **Seguro**: Valores vêm do servidor (JWT), nunca do cliente.

---

## 5. Próximas Fases

1. **Extração** (4 semanas): Mover tipos, hooks, componentes para core
2. **Documentação**: Getting started + exemplos
3. **Release**: npm / template / skill
4. **Novo projeto**: Testar core com projeto exemplo
