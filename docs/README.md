---
description: Framework orientado a configuração para Next.js (App Router) + PostgREST.
---

# kizuna-core

O **kizuna-core** é a base compartilhada dos projetos Kizuna: auth (JWT + RBAC multi-tenant),
camada de dados sobre **PostgREST puro via HTTP** (sem ORM, sem Supabase SDK), kit de UI, motor de
telas guiado por configuração, motor de wizards e um conjunto de plugins de banco opcionais.

Ele é consumido como **submódulo git** (`kizuna-core/`) via alias de path `@kizuna/core/*` — não
é um pacote npm. Um **CLI** (`node kizuna-core/cli`) materializa a casca do app no projeto e
mantém projeto ↔ core alinhados.

## Por onde começar

| Quero…                                             | Leia                                                        |
| -------------------------------------------------- | ----------------------------------------------------------- |
| Criar um projeto novo / instalar                   | [Instalação](comecando/README.md)                           |
| Configurar site, tema, home, clima e wizards       | [Configuração](comecando/configuracao.md)                   |
| Entender os comandos `install`, `update`, `db`, …  | [CLI](comecando/cli.md)                                     |
| Entender como as peças se encaixam                 | [Visão geral da arquitetura](arquitetura/README.md)         |
| Expor uma tabela via API                           | [API & camada de dados](arquitetura/api.md)                 |
| Sessão, tenant, permissões                         | [Auth & permissões](arquitetura/auth.md)                    |
| Montar uma tela administrativa                     | [Screen Engine](interface/screen-engine.md)                 |
| Montar um fluxo em passos                          | [Wizard](interface/wizard.md)                               |
| Ativar ou criar um plugin                          | [Plugins](plugins/README.md)                                |

## Seções

* **[Começando](comecando/README.md)** — instalação, configuração (`kizuna.config.json`) e o CLI.
* **[Arquitetura](arquitetura/README.md)** — layout do repositório, API/PostgREST, auth, schemas e helpers.
* **[Interface](interface/README.md)** — componentes, screen engine e wizard.
* **[Serviços](servicos/README.md)** — storage de arquivos, e-mail e IA.
* **[Plugins](plugins/README.md)** — os módulos de banco opcionais e como ativá-los.
* **[Manutenção](manutencao/README.md)** — hardening, backlog e como escrever esta documentação.

## Convenções desta documentação

* Caminhos de código são relativos à raiz do `kizuna-core` (ex.: `src/server/postgrest-crud.ts`)
  ou usam o alias de import (`@kizuna/core/server`).
* O inventário exato da API pública (exports por entry point) fica em `STATUS.md`, na raiz do
  repositório.
* Quer contribuir com a doc? Veja [Escrevendo a documentação](manutencao/documentacao.md).
