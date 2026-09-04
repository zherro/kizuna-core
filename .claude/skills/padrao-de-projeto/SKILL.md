---
name: padrao-de-projeto
description: Use ao criar ou estender qualquer funcionalidade num projeto sobre o kizuna-core — novo recurso, novo wizard, nova tela administrativa, nova rota de API — antes de escrever código.
---

# Padrão de Projeto — kizuna-core

## Overview

Next.js App Router + TypeScript sobre **PostgREST puro via HTTP** (sem Supabase SDK, sem ORM). A
camada de dados é orientada a configuração (`postgrestResources` + rota genérica
`/api/resources/[resource]`). Auth (JWT + RBAC), multi-tenancy, UI kit, motor de telas e um
conjunto de plugins vêm do `kizuna-core` (submódulo, alias `@kizuna/core/*`). Esta skill é a
base; `nova-tela-screen-engine`, `novo-wizard`, `criar-recurso` e `criar-plugin` partem dela.

## As regras sem exceção

1. **Nunca importe um client Supabase / nunca escreva SQL de query na aplicação.** Toda
   leitura/escrita passa por `pgrstTable`/`pgrstRpc` (`@kizuna/core/server`) ou pelos hooks
   genéricos (`@kizuna/core/client`) → rota `/api/resources/[resource]`.
2. **`tenant_id` / `created_by` / `uid` vêm só do JWT** (defaults de coluna no banco:
   `auth.fun_auth_current_tenant_id()` etc.), nunca do corpo da requisição. Ver `kizuna-core/docs/AUTH.md`.
3. **Recurso novo primeiro tenta a rota genérica.** Antes de escrever uma rota `/api/xxx/*` à
   mão, veja se um `ResourceConfig` em `postgrestResources` já resolve — ver skill `criar-recurso`
   e `kizuna-core/docs/API.md`. Só crie rota custom quando o `mapInput` genérico realmente não dá
   conta (upload de arquivo, sync N:N sem endpoint em lote, upsert de chave composta sem id).
4. **PATCH pelo recurso genérico reconstrói o registro inteiro.** `updateResource()` roda
   `mapInput` sobre o corpo todo e regrava todas as colunas, usando default pra qualquer campo
   omitido — não é partial update. Toda tela/wizard que salva em passos precisa de
   _read-merge-write_: espalhar o último registro carregado no payload antes de sobrescrever só os
   campos do passo atual. Ver skill `novo-wizard`.
5. **Permissão real é sempre RLS + `auth.fun_auth_has_perm`.** O `user.hasPerm()` do client é
   só pra esconder/mostrar UI (fail-open). Nunca confie num item de nav escondido como proteção.

## Mapa — onde cavar mais fundo

| Preciso entender... | Vá para |
| --- | --- |
| Sessão, JWT, tenant, RBAC, delegação, proxy | `kizuna-core/docs/AUTH.md` |
| PostgREST, CRUD genérico, `ResourceConfig`, hooks de client, erros | `kizuna-core/docs/API.md` |
| Registrar um `ResourceConfig` novo | skill `criar-recurso` |
| Motor de telas (`RenderScreen`, `ResourceScreen`, blocos) | `kizuna-core/docs/SCREEN-ENGINE.md` + skill `nova-tela-screen-engine` |
| Wizard multi-step com persistência parcial | skill `novo-wizard` |
| Componentes (`ui/`, `ui-better-soft/`, showcase) | `kizuna-core/docs/COMPONENTS.md` + skill `criar-componente-core` |
| Plugins (o que existe, como ativar, criar um novo) | `kizuna-core/docs/PLUGINS.md` + skill `criar-plugin` |
| Upload de arquivo / imagens | `kizuna-core/docs/STORAGE.md` |
| Superfície pública exata do `@kizuna/core` (lista de exports) | `kizuna-core/STATUS.md` |
| Setup de um projeto novo do zero | skill `setup-projeto-novo` |

## Erros que já aconteceram (não repetir)

| Sintoma | Causa |
| --- | --- |
| Erro de constraint `'valor' não é válido` num campo enum | `useState('')` mandado direto pro `mapInput` sem virar `null` antes do usuário responder aquele passo |
| Campo salvo num passo "some" depois de salvar outro passo | Faltou o read-merge-write da regra 4 — o PATCH sobrescreveu com o default |
| DELETE em loop volta 404 pra sempre no mesmo id | Estado local não atualizado após falha parcial — trate 404 como "já foi removido", não erro fatal |
| Contadores sempre em 0, sem erro visível | Agregação do PostgREST (`count()`) desabilitada no deployment (`PGRST123`) — conte via `useTable({ pageSize: 1 })` + `total` |

## Disciplina de documentação

Descobrir ou criar uma possibilidade nova numa camada orientada a config (motor de telas,
`postgrestResources`, um plugin) **não** está concluído só porque o código funciona. Documente:

1. **Doc de referência longa** — a doc do core na seção certa (`SCREEN-ENGINE.md`, `PLUGINS.md`,
   `API.md`) OU, se for específico do app, a doc de domínio do projeto consumidor. Texto completo,
   exemplo, o "por quê".
2. **Referência rápida** — só se uma IA precisar **reconhecer essa possibilidade rapidamente numa
   tarefa futura** (uma regra nova, um limite novo, um erro que pode se repetir): uma linha na
   tabela de erros/regras da skill ou da doc curta correspondente. Nem toda entrada da doc longa
   precisa de espelho.

Pule o passo 2 quando a descoberta é puramente explicativa. Nunca pule o passo 1.

## Quando NÃO usar

Bug pontual isolado, typo, ajuste de estilo — vá direto ao ponto.
