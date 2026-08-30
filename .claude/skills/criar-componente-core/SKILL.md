---
name: criar-componente-core
description: Use ao decidir se um componente novo vai para kizuna-core ou fica no projeto consumidor, e ao adicionar um componente ao core — antes de escrever o componente ou registrá-lo no showcase.
---

# Criar um Componente no Core — kizuna-core

## Overview

`kizuna-core/` não pode ter nada específico de um projeto consumidor (regra dura). Esta skill
cobre as duas decisões: (1) esse componente é genérico o bastante pro core? (2) onde ele entra e
como ele aparece no showcase.

## Passo 1 — O teste: core ou projeto consumidor?

Pergunta central: **é forma de UI genérica, com dado entrando via prop — não lógica de
negócio/fetch de um domínio específico?**

- Recebe dados prontos via props e só decide como desenhar → candidato a core.
- Faz fetch de um recurso específico do projeto, conhece nomes de tabela/campo do domínio, ou
  decide regra de negócio (preço, permissão de um app específico, fluxo de um wizard concreto) →
  fica no projeto consumidor.

Exemplo real: `RpcTester` foi pro core porque é genérico por endpoint (recebe a URL do endpoint
via prop, não sabe qual RPC vai rodar). `MediaResultCard` foi pro core porque é uma casca de
cartão de resultado — quem chama monta os slots (`badgeTopLeft`, `footer`, etc.), o componente não
sabe se é um serviço, um produto ou um evento.

Na dúvida, não force para o core — é mais barato promover depois (quando um segundo projeto
precisar do mesmo componente) do que remover algo específico que vazou pra lá.

## Passo 2 — Onde registrar

- `client/components/ui/*` — primitivo shadcn-style, sem opinião de domínio (um novo `Button`
  variant, um primitivo novo tipo `Slider`).
- `client/components/ui-better-soft/*` — componente com opinião visual própria do kit, mas ainda
  genérico. Escolha o subgrupo que já existe (`buttons/`, `forms/`, `headers/`, `lists/`,
  `overlay/`, `avatars/`, `cards/`) ou crie um novo só se nenhum encaixar — não force num grupo
  errado. Componente sem grupo óbvio fica solto na raiz de `ui-better-soft/` (caso de
  `ExperiencePill`, `RpcTester`, `PwaRegister`).
- Componente solto em `client/components/<nome>.tsx` fora de `ui`/`ui-better-soft` só se ele não é
  parte do "kit de UI" — é uma peça maior e específica de infraestrutura (ex.: `LocationModal`
  fala com a API do IBGE).

## Passo 3 — Adicionar ao showcase (3 lugares, sempre os 3)

Todo componente do core visível em tela entra no showcase. São sempre os mesmos 3 arquivos —
confira como `media-result-card` ou `rpc-tester` ficaram antes de replicar:

1. **`components/showcase/showcase-sections.ts`** — adiciona o id ao union type
   `ShowcaseSectionId`, e um objeto em `SHOWCASE_SECTIONS`: `id`, `groupId`
   (`'shadcn-default' | 'ui-better-soft'`), `label`, `description`, `usageCode` (snippet de
   import + uso real, o mesmo texto que aparece no botão "copiar" da página).
2. **`components/showcase/showcase-section-page.tsx`** — uma função `<Nome>Demo()` com o preview
   ao vivo (estado local via `useState` se o componente for controlado), e uma linha a mais em
   `SectionDemo`: `if (sectionId === '<id>') return <NomeDemo />;`. Componente sem preview visual
   (ex.: `PwaRegister`, que só registra um service worker) pode renderizar uma nota em texto no
   lugar do preview em vez de instanciar o componente de verdade.
3. **`components/showcase/showcase-shell.tsx`** — importa um ícone do `lucide-react` e adiciona
   `'<id>': NomeDoIcone` no mapa de ícones da nav (mesmo objeto que já tem `'media-result-card':
GalleryHorizontalEnd`).

O showcase roda em `/showcase` no projeto consumidor — é o catálogo visual vivo, não só
documentação; um componente que não passa pelos 3 lugares fica invisível lá mesmo que exportado.

## Passo 4 — Exportar

Confirme que o componente sai pelo barrel certo (`ui/index.ts` para `ui/`, ou o caminho direto
`@kizuna/core/client/components/ui-better-soft/<grupo>/<arquivo>` — nem todo `ui-better-soft` tem
barrel único, siga o padrão do arquivo vizinho no mesmo grupo).

## Passo 5 — Verificação

1. `npx tsc --noEmit`
2. Suba o showcase do projeto consumidor e confira visualmente a seção nova em `/showcase/<id>`.
3. Teste o botão "copiar código" — o snippet colado deve compilar sozinho num arquivo novo.
