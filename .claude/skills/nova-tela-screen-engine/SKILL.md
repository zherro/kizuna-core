---
name: nova-tela-screen-engine
description: Use ao criar uma tela nova em /painel, ou ao estender uma tela existente do screen-engine (novo campo, novo bloco, nova ação) — antes de escrever qualquer resource/screen config ou componente novo.
---

# Nova Tela — Screen Engine

## Overview

Procedimento executável para criar (ou estender) uma tela de `/painel` sobre o motor de telas do
kizuna-core. Assume `padrao-de-projeto` já carregada. Referências, em ordem de profundidade:

1. **Esta skill** — o passo a passo.
2. `kizuna-core/docs/SCREEN-ENGINE.md` — regras, tabelas, "por quê", exemplos de ponta a ponta.

**Nunca pule direto para escrever componente novo sem passar pelo Passo 1.** A maior parte das
telas não precisa de componente novo nenhum — só config.

Onde os arquivos moram: `@kizuna/core/client/components/screen-engine/`. Um projeto consumidor
adiciona os seus `screens/*.ts` / `resources/*.ts` (no core se for genérico e reutilizável entre
projetos; no próprio projeto caso contrário — decida como em `criar-componente-core`).

## Passo 1 — Decida o formato

1. **É "formulário + lista com busca/paginação" contra UM `postgrestResource`?**
   → Sim: [Passo 2A](#passo-2a--crud-simples).
2. **Já existe um bloco registrado (`registry.ts`) que resolve esse formato com outro config?**
   → Prefira estender o config/tipo desse bloco a duplicá-lo.
3. **Nenhum dos dois** (árvore, dashboard, wizard, lógica própria de estado) → [Passo 2B](#passo-2b--bloco-bespoke).

Não force o 2A quando não cabe — o motor aceita componentes bespoke registrados lado a lado com
blocos genéricos. Fluxograma completo: `SCREEN-ENGINE.md` §2.1.

## Passo 2A — CRUD simples

1. Confirme que o recurso existe em `postgrestResources` — se não, é a skill `criar-recurso`.
2. Existe um `ResourceScreenConfig` para esse recurso em `screen-engine/resources/*.ts`?
   - Sim → importe.
   - Não → crie `resources/<recurso>.ts`:

   ```ts
   import type { ResourceScreenConfig } from '@kizuna/core/types';

   export const MEU_RECURSO: ResourceScreenConfig = {
     resource: 'nome_do_resource',
     entitySingular: 'singular minusculo',
     entityPlural: 'plural minusculo',
     orderBy: 'name',
     fields: [
       { name: 'name', label: 'Nome', type: 'text' },
       { name: 'active', label: 'Status', type: 'switch', defaultValue: true },
       // 'textarea' | 'relation' | 'select' — ver "Vocabulário de campo" no SCREEN-ENGINE.md
     ],
     list: { primaryField: 'name', statusField: 'active' },
   };
   ```

3. **No máximo um campo `type: 'relation'`** (limite estrutural — rules of hooks).
4. Crie `screens/<id-da-tela>.ts`:

   ```ts
   import type { ScreenConfig } from '@kizuna/core/types';
   import { MEU_RECURSO } from '../resources/<recurso>';

   export const MINHA_TELA_SCREEN: ScreenConfig = {
     id: '<id-da-tela>',
     blocks: [
       { component: 'page-header', props: { title: 'Titulo', backHref: '/painel' } },
       { component: 'resource-screen', props: { config: MEU_RECURSO } },
     ],
   };
   ```

5. → [Passo 3](#passo-3--o-gate-da-rota).

## Passo 2B — Bloco bespoke

1. Escreva o componente normalmente (segue `padrao-de-projeto`). Se usa `'use client'`/hooks,
   marque mentalmente.
2. Registre em `registry.ts`, nome único kebab-case:
   `'meu-bloco': { component: MeuComponente, serverSafe: false }` (`true` só se Server Component puro).
3. Componha em `screens/<id-da-tela>.ts` igual ao 2A.4 — o bloco entra na lista `blocks` com
   `props: {}` ou o que precisar (**sempre dado serializável — nunca função/JSX**).
4. → [Passo 3](#passo-3--o-gate-da-rota).

## Passo 3 — O gate da rota

**Essa tela é admin-only?**

- **Sim** → `app/painel/<caminho>/page.tsx`:

  ```tsx
  import { createScreenPage } from '@kizuna/core/client/components/screen-engine/screen-page';
  import { MINHA_TELA_SCREEN } from '.../screens/<id-da-tela>';
  export default createScreenPage(MINHA_TELA_SCREEN);
  ```

- **Não** (qualquer usuário logado, ou permissão específica) → `createScreenPage` NÃO serve (gate
  fixo `tenant_type === 'ADMIN'`). Escreva à mão:

  ```tsx
  import { redirect } from 'next/navigation';
  import { getSession } from '@kizuna/core/server';
  import { RenderScreen } from '@kizuna/core/client/components/screen-engine/render-screen';
  import { MINHA_TELA_SCREEN } from '.../screens/<id-da-tela>';

  export default async function MinhaTelaPage() {
    const session = await getSession();
    if (!session) redirect('/login');
    // check extra (hasPerm, etc.) aqui antes do redirect, se precisar
    return <RenderScreen config={MINHA_TELA_SCREEN} />;
  }
  ```

Errar essa decisão trava a tela pra quem deveria ver (ou abre pra quem não deveria).

## Passo 4 — Verificação (obrigatória antes de reportar "pronto")

1. **Confira `props` à mão** — o bloco espera `{ config: {...} }` ou props soltos? `tsc` NÃO pega
   isso — é o erro real mais comum deste motor.
2. `npx tsc --noEmit`
3. `npx eslint <arquivos tocados>` · `npx prettier --write <arquivos tocados>`
4. `npm run build` — confirme a rota nova na tabela de rotas.
5. Teste a rota de verdade — sem sessão, um `curl` deve dar redirect (302/307), nunca 500.

## Passo 5 — Documentação

Se este trabalho **descobriu ou criou uma possibilidade nova** do motor (tipo de campo, composição
nova, padrão de gate, erro novo) → `kizuna-core/docs/SCREEN-ENGINE.md` na seção certa (Parte 1
arquitetura, Parte 2 uso, Parte 3 limite, Parte 4 erro), e a versão curta na "Referência rápida"
do mesmo doc / na skill do projeto **só se muda o comportamento que uma IA deveria seguir por
padrão**.

## Quando NÃO usar

Bug isolado, typo, ajuste visual dentro de um bloco existente — vá direto ao ponto.
