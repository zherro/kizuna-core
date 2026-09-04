---
name: novo-wizard
description: Use ao criar um wizard multi-step novo (passos sequenciais com persistência parcial contra UM recurso), ou ao adicionar/alterar um passo de um wizard existente — antes de escrever qualquer step component ou lógica de persist().
---

# Novo Wizard — Padrão de Persistência Multi-Step

## Overview

Wizard = formulário em passos sobre UM recurso genérico (`postgrestResources`), onde cada passo
salva via PATCH "parcial simulado" (read-merge-write), não via rota custom. Assume
`padrao-de-projeto` já carregada — é a extensão específica da regra 4 de lá. O passo dinâmico de
formulário (`DynamicStepForm` / `DynamicFormStep`) e o vocabulário de campo vêm do motor de telas
(`kizuna-core/docs/SCREEN-ENGINE.md` §1.8).

## Quando usar

- Fluxo de criação/edição em N passos onde o registro final é UM recurso (+ talvez tabelas N:N
  filhas, tipo "specialties"/"tags").
- Um passo intermediário precisa persistir sem esperar o formulário inteiro (passo 3 de 8 já grava).

## Quando NÃO usar

- Formulário de passo único → `useForm` normal.
- Passos que não persistem nada até o fim (só estado local + um POST final) → estado local +
  `submitResource` no fim resolve.

## Passo 1 — Modelagem do estado

1. O recurso final já existe em `postgrestResources`? Se não → skill `criar-recurso`.
2. Existe campo `NOT NULL` na tabela que só é preenchido num passo tardio (ex. `title`)? → os
   passos anteriores ficam **local-only**, sem persist, até alcançar esse passo.
3. Todo `useState` que alimenta um campo enum/`CHECK` começa em `''`? **Nunca** mande essa string
   vazia pro `mapInput` — normalize pra `null` antes de montar o payload (bug já documentado).

## Passo 2 — `persist()` com read-merge-write

O `mapInput` do recurso genérico reconstrói o registro inteiro. Nunca chame `submitResource`/PATCH
mandando só os campos do passo atual:

```ts
async function persist(overrides: Partial<FormShape>) {
  const payload = {
    ...toPayload(record),   // espalha o ÚLTIMO registro carregado/salvo
    ...overrides,           // sobrescreve só os campos deste passo
  };
  const result = await submitResource({ resource: 'coisas', values: payload, selectedId: id, /* … */ });
  if (result.ok) {
    setRecord(result.data.item);            // atualiza a baseline pro próximo persist()
    if (!id) setId(result.data.item.id);    // create → edit mode
  }
  return result;
}
```

Todo passo novo que grava um campo novo **precisa** estender o tipo de `overrides` e o `toPayload`
— esquecer isso reverte silenciosamente os campos dos outros passos ao salvar (bug já documentado).

## Passo 3 — Create → Edit mode

- `id == null` → create: passos antes do campo `NOT NULL` só atualizam estado local, zero rede. Ao
  alcançar o passo que preenche o campo obrigatório, o primeiro `persist()` adota o id retornado e
  o wizard vira edit.
- `id` já setado → edit: cada passo chama `persist()` imediatamente ao continuar.
- O rótulo do botão muda com o modo ("Continuar" vs "Salvar e continuar") — é o sinal de que aquele
  clique agora grava.

## Passo 4 — Tabelas N:N filhas

Sem endpoint em lote → diff contra o último estado sincronizado, uma requisição por linha mudada,
em `Promise.all`:

- Removida → `DELETE /api/resources/<tabela>/:id`; trate 404 como sucesso (já foi removida — não
  vire loop de retry).
- Nova → `POST /api/resources/<tabela>` via `submitResource`.

## Passo 5 — Passo dinâmico de formulário (opcional)

Se um passo precisa renderizar campos definidos em dado (ex.: perguntas por categoria vindas do
plugin `forms`) → use `DynamicStepForm` (`@kizuna/core/client/components/screen-engine/dynamic-step-form`)
ou `DynamicFormStep` (`@kizuna/core/client/components/forms`, ligado ao plugin `forms` via
`fn_form_result_upsert`). Mesmo limite de **um `relation` por form**. "Continuar" gated no
`validate()` do passo.

## Passo 6 — Verificação (obrigatória)

1. `npx tsc --noEmit`
2. Teste manual do fluxo completo create→edit — "compila" não é "funciona". Em especial: volte a
   um passo anterior já respondido e confirme que os campos dos passos seguintes não sumiram
   (regressão mais comum deste padrão).
3. Confirme que nenhum campo enum/`CHECK` recebe `''` em nenhum passo.

## Passo 7 — Documentação

Uma decisão nova de wizard (tipo de passo novo, exceção ao read-merge-write, padrão de sync N:N
novo) → doc de domínio do projeto consumidor (versão completa) e, só se muda o comportamento
padrão que uma IA deveria seguir, uma entrada curta na tabela de erros de `padrao-de-projeto`.
