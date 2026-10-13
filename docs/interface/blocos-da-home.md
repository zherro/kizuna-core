---
description: Blocos prontos para montar a home (DiscoverCta, PlaceHighlights, NewsHighlights) — contrato de dados, visual e como ligar.
---

# Blocos da home

Peças de home que vivem no core em `src/client/components/home/`, importadas por caminho
(`@kizuna/core/client/components/home/<arquivo>`). Seguem a regra do core: **recebem dados prontos
por props** e não sabem de onde eles vêm. Quem busca é o projeto consumidor (um loader no servidor),
e quem decide se o bloco aparece é a página da home.

| Bloco             | Arquivo                 | Para quê                                                        |
| ----------------- | ----------------------- | --------------------------------------------------------------- |
| `DiscoverCta`     | `discover-cta.tsx`      | Banner de chamada com o gradiente da cor primária.              |
| `PlaceHighlights` | `place-highlights.tsx`  | "Lugares da cidade": um lugar em destaque e os demais num índice. |
| `NewsHighlights`  | `news-highlights.tsx`   | "Notícias": manchete grande e lista numerada das seguintes.     |

`PlaceHighlights` e `NewsHighlights` aparecem no showcase (`/showcase/place-highlights` e
`/showcase/news-highlights`).

## PlaceHighlights

Bloco de engajamento: o primeiro item vira o destaque (foto inteira, gradiente escuro, chapéu,
título grande e resumo) e os demais formam um índice ao lado dele. O índice muda de forma com a
largura da tela, sem duplicar o HTML:

* celular: carrossel horizontal com scroll-snap, um card e meio visível;
* tablet: grade de duas colunas, abaixo do destaque;
* desktop: lista vertical com miniatura quadrada, ao lado do destaque.

Sem itens, o componente devolve `null` — a home não precisa testar a lista antes de montar.

```ts
type PlaceHighlightItem = {
  href: string;
  title: string;
  kicker: string;          // grupo/categoria: vira o chapéu e decide a cor
  summary?: string;        // só aparece no destaque
  image?: string | null;   // sem foto: gradiente do grupo + pino
  meta?: string;           // linha curta (endereço, bairro)
};

type PlaceHighlightsProps = {
  items: PlaceHighlightItem[];
  title?: string;          // default "Lugares da cidade"
  moreHref?: string;       // liga o link "Ver todos" no cabeçalho
  moreLabel?: string;      // default "Ver todos"
  contained?: boolean;     // container da home (default true)
  className?: string;
};
```

### Cor do chapéu

Cada card tem a cor do seu grupo, calculada por `placeTone(kicker)` em
`place-highlights-tone.ts`. O texto é normalizado (sem acento, minúsculo, espaços colapsados) e
passa por um hash curto que escolhe uma das oito matizes OKLCH da paleta. Por isso:

* o mesmo grupo tem sempre a mesma cor, em qualquer página e em qualquer projeto;
* nenhuma configuração é necessária — o core não conhece os grupos do projeto;
* "SHOPPING", "Shopping" e "shopping" caem na mesma cor.

A matiz vem de uma paleta curta, e não do hash cru, para evitar tons lamacentos e cores vizinhas
parecidas demais. A cor do texto do chapéu é misturada com `--foreground` (`color-mix`): fica
escura no tema claro e clara no tema escuro sem depender da variante de tema escuro do Tailwind,
que neste projeto segue o sistema operacional e não a classe do tema. Sobre a foto, o chapéu vira
uma pílula sólida com texto branco.

{% hint style="info" %}
Dois grupos diferentes podem cair na mesma matiz (são oito cores). Se isso incomodar num projeto,
renomear o texto do grupo resolve; a função é pura e testada em `place-highlights-tone.test.ts`.
{% endhint %}

### Acessibilidade e movimento

* A seção é um landmark (`section` com `aria-labelledby` apontando para o título).
* Cada card é um único link; a foto tem `alt` vazio porque o título já está dentro do link e seria
  lido duas vezes.
* O chapéu fica em caixa-alta só por CSS: o leitor de tela recebe o texto original, sem soletrar.
* Foco visível com o anel do tema; alvos de toque com no mínimo 44px.
* O zoom da foto no hover só acontece quando o sistema permite animação (`prefers-reduced-motion`).

### Montar na home

O loader do projeto entrega os itens já no contrato. No starter, `loadHomePlaces` em
`src/lib/lugares.ts` lê a coleção de lugares (só publicados, da cidade quando houver, do mais
recente para o mais antigo) e usa a primeira foto como imagem:

```tsx
import { PlaceHighlights } from '@kizuna/core/client/components/home/place-highlights';
import { loadHomePlaces } from '@/lib/lugares';

const places = loadHomePlaces({ citySlug: city?.slug, cityName: city?.name, limit: 6 });

<PlaceHighlights items={places} />
```

`loadHomePlaces` lê arquivos do disco: chame no Server Component da página e passe o resultado
adiante como prop (o bloco em si não tem estado e funciona dos dois lados).

## NewsHighlights

Bloco de notícias com linguagem de portal. O primeiro item é a **manchete**: foto larga com uma
tira de papel sobreposta à borda de baixo, que leva o chapéu, o tempo, o título grande e o resumo.
Os seguintes formam uma **lista numerada** (a ordem é a de publicação), cada linha com chapéu,
título, tempo e miniatura. A forma muda com a largura **do próprio bloco** (container queries do
Tailwind, não a largura da janela), então funciona igual numa coluna estreita ou no showcase:

* estreito (celular): manchete primeiro, lista em linhas logo abaixo;
* a partir de 42rem: manchete na largura toda, lista em duas colunas;
* a partir de 56rem: manchete à esquerda (7 de 12 colunas), lista à direita.

O bloco não ordena nada: quem chama entrega os itens do mais recente para o mais antigo. Itens sem
`href` ou sem título são ignorados; sem itens, devolve `null`.

```ts
type NewsHighlightItem = {
  href: string;
  title: string;
  kicker: string;                     // chapéu: subcategoria da notícia (ou a categoria)
  summary?: string;                   // só aparece na manchete
  image?: string | null;              // sem foto (ou se ela falhar): painel na cor do chapéu
  publishedAt?: string | Date | null; // sem data, a linha não mostra tempo
};

type NewsHighlightsProps = {
  items: NewsHighlightItem[];
  title?: string;      // default "Notícias"
  moreHref?: string;   // liga o link "Ver todas" no cabeçalho
  moreLabel?: string;  // default "Ver todas"
  listLimit?: number;  // linhas na lista além da manchete (default 5)
  timeZone?: string;   // fuso das datas exibidas (default America/Sao_Paulo)
  contained?: boolean; // container da home (default true)
  className?: string;
};
```

Os tipos e os helpers puros ficam em `news-highlights-format.ts` (sem `'use client'`), para o
loader do servidor importar o tipo `NewsHighlightItem` e `parseNewsDate` sem puxar o componente.

### Cor do chapéu

`kickerTone(kicker)` normaliza o texto (sem acento, minúsculo, espaços colapsados) e escolhe uma de
24 matizes OKLCH, de 15 em 15 graus. "POLÍTICA", "Política" e "politica" têm a mesma cor em
qualquer página. Como em `PlaceHighlights`, o texto do chapéu mistura a matiz com `--foreground`
via `color-mix`, então escurece no tema claro e clareia no escuro sem variante de tema. O
marcador quadrado usa a cor cheia, e o painel sem foto usa a matiz suave sobre `--card`.

### Tempo relativo sem erro de hidratação

A home é ISR: um "há 3 h" calculado no servidor estaria errado minutos depois e não bateria com o
navegador. Por isso o `<time>` usa `useSyncExternalStore`:

* no servidor e na hidratação, mostra a data absoluta curta ("13 out, 14:30"), que só depende da
  data e do fuso — o mesmo texto dos dois lados;
* logo depois, no navegador, troca pelo relativo ("agora", "há 12 min", "há 3 h", "ontem",
  "há 4 dias"; a partir de uma semana, volta para a data curta) e atualiza a cada minuto.

O `title` do `<time>` traz a data completa e o `dateTime` traz o ISO.

`parseNewsDate` aceita `Date`, ISO com fuso e data local sem fuso (`AAAA-MM-DDTHH:MM`, como grava
o campo `datetime` do formulário). A data local é lida no fuso passado. Testes em
`news-highlights-format.test.ts`.

### Acessibilidade e movimento

* `section` com `aria-labelledby` no título; a lista é um `nav` com `aria-label` ("Mais notícias").
* Cada notícia é um único link; as imagens têm `alt` vazio porque o título está no mesmo link.
* Os números da lista são decorativos (`aria-hidden`); o `ol` já dá a ordem ao leitor de tela.
* Foco visível com o anel do tema; o "Ver todas" e as linhas têm no mínimo 44px de altura.
* O zoom da foto da manchete no hover só acontece com `prefers-reduced-motion` liberado.

### Montar na home

No starter, `loadHomeNews` em `src/lib/noticias.ts` (servidor) busca os anúncios do grupo
`noticias` pela mesma RPC da busca (`fn_search_services`: ativos, não expirados, filtro de cidade),
completa resumo (`services.description`) e data (`answers.data_publicacao` do formulário
`noticias`, com `services.created_at` de reserva), ordena do mais recente para o mais antigo e
corta no `limit` (default 6: manchete + 5). `homeNewsMoreHref(city)` monta o link da busca.

```tsx
import { NewsHighlights } from '@kizuna/core/client/components/home/news-highlights';
import { loadHomeNews, homeNewsMoreHref } from '@/lib/noticias';

const news = await loadHomeNews({ cityIbge: city?.ibge, limit: 6 });

<NewsHighlights items={news} moreHref={homeNewsMoreHref(city)} />
```

{% hint style="warning" %}
A RPC de busca não ordena por data: o loader traz um conjunto de até 48 notícias (ordem da RPC) e
ordena só dentro dele. Com muito mais notícias que isso no grupo, a mais recente de todas pode
ficar de fora. A data vem de uma chamada a `fn_get_public_service_form_answers` por notícia do
conjunto; o custo é absorvido pelo ISR da home.
{% endhint %}
