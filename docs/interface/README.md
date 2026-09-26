---
description: Kit de UI, motor de telas guiado por configuração e motor de wizards.
---

# Interface

Tudo o que é client-side no core vive em `src/client/` (`@kizuna/core/client/*`), importado por
caminho (sem barrel).

| Página                                  | Cobre                                                                                         |
| --------------------------------------- | --------------------------------------------------------------------------------------------- |
| [Componentes & hooks](componentes.md)   | Mapa de `ui/`, `ui-better-soft/`, `screen-engine/`, `showcase/`, hooks, providers, tema.      |
| [Screen Engine](screen-engine.md)       | Telas de `/painel` montadas a partir de `ScreenConfig` — arquitetura, uso, limites, erros.    |
| [Wizard](wizard.md)                     | Fluxos multi-step: contrato de step, `defineWizard`, persistência read-merge-write, slot de IA. |
| [Formulários dinâmicos](formularios-dinamicos.md) | Form builder: `FormSchema`, tipos de campo, validação, campo repetível `list`, respostas. |

Os dados que essas telas consomem vêm da rota genérica `/api/resources/[resource]` — ver
[API & camada de dados](../arquitetura/api.md).
