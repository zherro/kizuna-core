---
description: Como definir uma coleção de conteúdo em Markdown (frontmatter validado, fotos ao lado) e montar a página com os blocos reutilizáveis.
---

# Modelo de conteúdo

Uma **coleção** é uma pasta de artigos em Markdown, um por subpasta, com frontmatter validado e
fotos ao lado. O core lê, valida e lista; o projeto decide o que a coleção é (lugares, guias,
roteiros) e como a página fica. Sem banco e sem painel: o conteúdo vive no git.

## Estrutura de pastas

```
content/lugares/lua-morena/index.md     texto + frontmatter
public/lugares/lua-morena/01.jpg ...    fotos; a ordem é o nome do arquivo (ordem natural)
```

- O nome da pasta é o **slug**: só `a-z`, `0-9` e hífen (sem hífen no início, no fim ou duplo).
- Pasta que começa com `_` ou `.` é ignorada (use para modelos). Pasta com nome fora do formato
  entra na lista de erros.
- Fotos ficam em `public/` porque o Next só serve arquivos de lá. Aceita `.jpg`, `.jpeg`, `.png`
  e `.webp`, em qualquer caixa. Sem pasta de fotos, `media` vem vazio.
- As pastas `contentDir` e `mediaDir` são relativas à raiz do projeto: o core resolve contra
  `process.cwd()`, que é a raiz quando o Next roda.

## Definir a coleção

```ts
import { defineCollection } from '@kizuna/core/server/content';

export const LUGARES = defineCollection({
  name: 'lugares',
  contentDir: 'content/lugares',
  mediaDir: 'public/lugares',
  mediaUrl: '/lugares',
  fields: {
    titulo: { type: 'string', required: true },
    resumo: { type: 'string', required: true, max: 155 },
    status: { type: 'enum', values: ['rascunho', 'revisao', 'aprovado'], required: true },
    atualizado_em: { type: 'date', required: true },
    latitude: { type: 'number', min: -90, max: 90 },
    longitude: { type: 'number', min: -180, max: 180 },
    site: { type: 'string', url: true },
    horario: { type: 'list' },
  },
  publishWhen: { field: 'status', equals: 'aprovado' },
  // Regra entre campos, opcional: devolve a mensagem de erro ou null.
  validate: (d) =>
    (d.latitude === undefined) !== (d.longitude === undefined)
      ? 'latitude e longitude devem vir juntas'
      : null,
});
```

| Tipo | Opções | Observação |
|---|---|---|
| `string` | `required`, `max`, `url` | `url` aceita só `http` e `https` (o valor costuma virar `href`) |
| `number` | `required`, `min`, `max` | escreva com **ponto** decimal; vírgula é erro |
| `date` | `required` | formato `AAAA-MM-DD`, data real |
| `enum` | `values`, `required` | |
| `list` | `required` | um item por linha, com hífen |

- Chave no frontmatter que não está em `fields` é erro ("campo desconhecido"). Valor vazio conta
  como ausente: com `required`, é erro; sem, o campo some de `data`.
- `publishWhen` aponta para um campo `enum`: só a entrada com aquele valor aparece.
  `defineCollection` lança erro na carga se o campo não for `enum` ou se `equals` não estiver em
  `values`.
- `validate` roda só depois de todos os campos passarem, e recebe os dados já tipados.

## Ler

```ts
import { loadEntries, getEntry } from '@kizuna/core/server/content';

const { entries, errors } = loadEntries(LUGARES); // publicadas + inválidas (com arquivo e motivo)
const entry = getEntry(LUGARES, slug);            // Entry | null
```

`Entry` traz `slug`, `data` (tipada por campo), `body` (Markdown sem frontmatter) e `media`
(URLs das fotos). `entries` vem ordenada por slug.

Entrada inválida (a pasta existe, mas o frontmatter falha na validação) **não derruba** as
outras: ela entra em `errors`, e `getEntry` devolve `null` e registra um aviso no log do servidor.
Pasta ou `index.md` inexistente, entrada não publicada e slug fora do formato também devolvem
`null`, mas em silêncio; o slug fora do formato nem toca o disco.

Por padrão `loadEntries` e `getEntry` resolvem `contentDir` e `mediaDir` contra `process.cwd()`
(a raiz do projeto quando o Next roda). O parâmetro opcional `{ root }` troca a raiz; é o que os
testes usam. Ele é o segundo argumento de `loadEntries` e o terceiro de `getEntry`:

```ts
loadEntries(LUGARES, { root });
getEntry(LUGARES, slug, { root });
```

## Frontmatter aceito

Subconjunto pequeno de YAML: `chave: valor` (com ou sem aspas), listas com hífen e comentários
com `#`.

```yaml
titulo: "Lua Morena"
status: rascunho   # comentário
horario:
  - "Qui a sáb, 22h às 5h"
```

Regras que costumam pegar:

- Valor sem aspas que **começa** com `#` é comentário: o valor fica vazio. Coloque entre aspas
  qualquer valor que comece com `#`, como uma cor em hexadecimal (`cor: "#fff"`).
- Entre aspas duplas, só `\\`, `\"`, `\n` e `\t` são aceitos como escape. Qualquer outro (por
  exemplo `é`) é erro: escreva o próprio caractere.
- Entre aspas simples, a aspa simples dentro do texto se escreve duplicada.
- Valor que começa com `|`, `>`, `&`, `*`, `[` ou `{` precisa de aspas.
- Chave repetida é erro.

Não são aceitos objetos aninhados, multilinha (`|`, `>`), coleções inline (listas entre colchetes
e objetos entre chaves) nem âncoras. O erro aponta a linha.

## Blocos reutilizáveis

De `@kizuna/core/client/components/content`. Só recebem dados por props e não conhecem a coleção.

| Bloco | Faz |
|---|---|
| `ArticleLayout` | Moldura de layout: coluna de leitura + lateral fixa no desktop; coluna única no mobile. Renderiza uma `div` simples: o `main` já vem do shell do app, então a página não deve acrescentar outro |
| `ArticleHeader` | Contexto (`kicker`), título, resumo e data de atualização |
| `ArticleBody` | Markdown com largura de leitura |
| `ArticleCredits` | Linha de créditos |
| `FactSheet` | Ficha de informações (linha sem valor não aparece; sem nenhuma linha, o bloco some) |
| `QuickActions` | Chips de ação rápida; o `ArticleLayout` os mostra só abaixo do breakpoint `lg` |
| `LocationMap` | Mapa do OpenStreetMap, carregado só quando visível |
| `DirectionsCard` | Como chegar: Google Maps, Waze, copiar endereço e distância sob clique |

A página do projeto compõe os blocos, como o detalhe do anúncio. O Screen Engine não é usado: ele
é do `/painel`, só para ADMIN, e seu contêiner é de coluna única.

Cada bloco tem a sua página no showcase: `/showcase/article-layout` (composição),
`/showcase/article-header`, `/showcase/article-body`, `/showcase/article-credits`,
`/showcase/fact-sheet`, `/showcase/quick-actions`, `/showcase/location-map` e
`/showcase/directions-card`.

### Como chegar e a posição do usuário

`DirectionsCard` recebe `destination` (latitude e longitude), `address` e `tips`, todos opcionais.
Sem nenhuma rota possível (nem coordenadas nem endereço) e sem `tips`, não renderiza nada.

- Os botões do Google Maps e do Waze usam as coordenadas e, sem elas, o endereço. O botão de
  copiar aparece quando há `address`.
- O convite "Ver distância e rota a partir de você" só aparece quando há `destination`: sem
  coordenadas não há distância a medir.
- A posição só é pedida **ao clicar** no convite. Nunca ao carregar a página.
- Depois de concedida (`granted`), mostra a distância em linha reta, não de percurso, e o link do
  Google Maps passa a levar a posição como origem. O Waze usa o GPS do aparelho.
- Se for negada (`denied`), o convite some e uma nota explica que dá para liberar a localização
  nas configurações do navegador. Os botões de rota continuam.
- Se não der para obter a posição (`unavailable`: sem suporte, tempo esgotado ou falha), o convite
  continua, para tentar de novo, com uma nota.
- O texto que antecede o clique avisa que a localização é usada só no aparelho para calcular a
  distância, que não é guardada e que, ao abrir a rota no Google Maps, o Google recebe a posição
  como ponto de partida.

## Privacidade da localização

`DirectionsCard` usa `useCurrentPosition`, que só pede a posição **depois de um clique** e a
mantém **só em memória**: nada vai para `localStorage`, servidor ou analytics. A posição sai do
navegador apenas quando o usuário abre o Google Maps, com a origem no link (o Google a recebe como
ponto de partida); o Waze não recebe a posição pelo link. O mapa incorporado e os links de rota
envolvem terceiros (OpenStreetMap, Google, Waze): cite na política de privacidade do projeto.

## Cuidados

- O Tailwind varre arquivos `.md`. Exclua a pasta de conteúdo da varredura no CSS do projeto com
  a regra `@source not`.
- Imagens dentro do corpo (Markdown) devem usar URL pública **absoluta**, como
  `![Fachada](/lugares/<slug>/01.jpg)`. Um caminho relativo (`01.jpg`) é resolvido contra a URL da
  página e quebra.
- Conteúdo factual (endereço, horário, telefone, coordenadas) deve ser apurado antes de ir para
  `aprovado`.
- Com Docker e `output: 'standalone'`, o conteúdo é lido do disco em runtime, a partir de
  `process.cwd()`. Por isso a imagem final precisa ter a pasta de conteúdo
  (`COPY --from=builder /app/content ./content`, ao lado de `public/`, que leva as fotos).
  Sem ela, toda entrada vira 404 em produção.
