---
name: criar-recurso
description: Use ao expor uma tabela nova pela rota genérica /api/resources/[resource] — ao escrever um ResourceConfig e registrá-lo, seja no projeto consumidor ou como recurso de um plugin do core.
---

# Criar um Recurso — `ResourceConfig`

## Overview

A rota genérica `/api/resources/[resource]` (CRUD + list paginada + busca) é dirigida por um
registro de `ResourceConfig` por nome. Esta skill é o passo a passo de autorar um e plugá-lo.
Tipo canônico e comportamento (o PATCH que reconstrói o registro inteiro, os params de list, as
shapes de resposta): `kizuna-core/docs/API.md` §3. Assume `padrao-de-projeto` carregada.

**Duas casas possíveis para o config — decida primeiro:**

| A tabela é... | O `ResourceConfig` vai em... |
| --- | --- |
| específica do app (só faz sentido pra este projeto) | um `resource-<dominio>.ts` no `src/lib/server/resources/` do projeto, spread no `index.ts` local |
| de um **plugin do core** (a tabela vem de `plugins/<x>/`, e componentes do core já esperam o recurso) | `kizuna-core/src/client/components/screen-engine/resources/<x>.ts`, exportado pra o projeto só importar + spread |

Regra: nada específico de um app entra no core (igual `criar-plugin` / `criar-componente-core`).
Na dúvida, deixe no projeto — promover depois é barato.

## Passo 1 — A tabela existe?

O `ResourceConfig` não cria tabela. Se a tabela é nova:
- app-específica → migração própria do projeto (`db/migrations/` do consumidor).
- genérica e independente → é um **plugin** (`criar-plugin`), não uma tabela solta.

Confirme colunas, `primaryKey`, e os defaults de coluna que resolvem `tenant_id`/`created_by`/
`uid` a partir do JWT (`auth.fun_auth_current_tenant_id()` etc.) — o client **nunca** manda esses.

## Passo 2 — Escreva o config

```ts
import type { ResourceConfig } from './resource-types';        // projeto
// ou: import type { ResourceConfig } from '../types/resource-config';  // recurso de plugin no core

export const resourceCoisas: Record<string, ResourceConfig> = {
  coisas: {
    schema: 'public',
    table: 'coisas',
    select: 'id,uid,name,slug,description,active,created_at,updated_at',
    primaryKey: 'id',
    defaultOrder: 'name',                 // string: 'name' ou 'created_at.desc'
    searchableColumns: ['name', 'description'],
    requiredFields: ['name'],             // validado depois do mapInput → 400 se vazio
    softDeleteField: 'active_deleted',    // opcional — só se a flag é TRUTHY quando apagado
    listRequiresAuth: false,              // só se a leitura é pública (RLS abre pra anon)
    maxPageSize: 500,                     // só pra tabela de referência pequena que uma tela carrega inteira
    mapInput: (input) => {
      const name = String(input.name ?? '').trim();
      if (!name) throw new Error('Nome é obrigatório');
      return {
        name,
        slug: makeSlug(name),
        description: String(input.description ?? '').trim() || null,
        active: parseActive(input.active),
      };
    },
    mapOutput: (record) => ({
      id: String(record.id ?? ''),
      name: String(record.name ?? ''),
      slug: String(record.slug ?? ''),
      description: String(record.description ?? ''),
      active: Boolean(record.active),
      createdAt: record.created_at,
    }),
  },
};
```

`parseActive` / `makeSlug`: `@kizuna/core/types` (projeto) ou `../utils/resource-utils` (recurso
de plugin). Exemplos reais completos: `resources/forms.ts`, `resources/pages.ts`,
`resources/taxonomy.ts` no core.

### mapInput — o que não esquecer

- `mapInput` roda no **create E no update**, e o update **regrava o registro inteiro**. Se um
  campo pode ser omitido num PATCH parcial (wizard salvando por passo), ou (a) o config faz
  `if (input.x !== undefined)` pra só incluir o que veio (padrão de `pages.ts`), ou (b) o chamador
  faz read-merge-write (padrão `novo-wizard`). Escolha um e documente qual.
- Nunca deixe `''` chegar num campo enum/`CHECK` — normalize pra `null`.
- Não confie no client pra `tenant_id`/`created_by` — nem os inclua no `mapInput`.

## Passo 3 — Registre

**Projeto consumidor** (`src/lib/server/resources/index.ts`):

```ts
import { resourceCoisas } from './resource-coisas';
export const postgrestResources = {
  ...resourceHolidays,
  ...(resourceForms as Record<string, ResourceConfig>),   // plugins do core: importa + spread
  ...resourceCoisas,                                       // recurso do app
};
```

Nunca inline um config direto no `index.ts` — sempre num `resource-<dominio>.ts` e spread.

**RPC** em vez de tabela → `postgrestRpcs` no mesmo `index.ts`:
`fn_x: { schema: 'public', requiresAuth: false }`. O POST `/api/resources/fn_x` vira
`executeRpcResource` automaticamente (via `isRpcResource`).

**Recurso de plugin no core**: exporte de `screen-engine/resources/<x>.ts` e adicione à lista de
exports em `STATUS.md` (`@kizuna/core/client/components/screen-engine/resources/*`). O projeto só
importa e faz spread.

## Passo 4 — Verificação

1. `npx tsc --noEmit`
2. `GET /api/resources/coisas?page=1&pageSize=5` → `{ items, page, pageSize, total, totalPages }`.
3. `POST` com corpo mínimo → 201 `{ item }`; confira `mapOutput` (camelCase) na resposta.
4. `PATCH /api/resources/coisas/:id` com um campo → confirme que os outros não voltaram ao default
   (se voltaram, o `mapInput` precisa do padrão `if (input.x !== undefined)` ou o chamador do
   read-merge-write).
5. Se `softDeleteField`: `DELETE` vira PATCH da flag e a list passa a excluir a linha.

## Passo 5 — Documentação

Recurso de plugin → linha em `docs/PLUGINS.md` + `STATUS.md`. Recurso do app → a doc de domínio do
projeto (qual `mapInput` usa, se é read-merge-write ou `if undefined`, quais embeds no `select`).
