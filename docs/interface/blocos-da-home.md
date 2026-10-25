---
description: Blocos prontos para montar a home (DiscoverCta, PlaceHighlights, PlaceMosaic, HomeSearch, NewsHighlights) e a home do painel (PainelWelcome) — contrato de dados, visual e como ligar.
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
| `PlaceMosaic`     | `place-mosaic.tsx`      | "Lugares da cidade" em mosaico (bento, colunas ou faixas), com chips por grupo e "Surpreenda-me". Substitui o `PlaceHighlights` na home do starter. |
| `HomeSearch`      | `home-search.tsx`       | Campo de busca da home (usa o `SearchBar` de `search/search-bar.tsx`); envia para `/busca`. |
| `NewsHighlights`  | `news-highlights.tsx`   | "Notícias": manchete grande e lista numerada das seguintes.     |
| `PainelWelcome`   | `painel-welcome/painel-welcome.tsx` | Home do painel para quem navega: descoberta, favoritos, atalhos e convite a anunciar. |

`PlaceHighlights`, `NewsHighlights` e `PainelWelcome` aparecem no showcase
(`/showcase/place-highlights`, `/showcase/news-highlights` e `/showcase/painel-welcome`).

{% hint style="info" %}
A home do starter usa `PlaceMosaic` no lugar de `PlaceHighlights`. O `PlaceHighlights` continua no
core (e o `placeTone` é compartilhado pelos dois), mas a página inicial não o monta mais.
{% endhint %}

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

## PlaceMosaic

"Lugares da cidade" em mosaico. Usa o mesmo contrato de dados do `PlaceHighlights`
(`PlaceHighlightItem`, reexportado como `PlaceMosaicItem`) e a mesma cor de grupo (`placeTone`),
mas arruma as peças em um de três arranjos:

* `bento`: grade de 2 colunas no celular e 4 no desktop; as quatro primeiras peças fecham um bloco
  (uma grande, uma larga e duas altas) e o padrão se repete em linhas de 4;
* `columns`: colunas estilo alvenaria, com a altura de cada peça definida pelo hash do título;
* `strips`: carrossel horizontal com scroll-snap no celular e grade de 4 colunas no desktop, com um
  destaque largo alternando de lado.

Sem itens, devolve `null`. A forma muda com a largura **do próprio bloco** (container queries).

```ts
type PlaceMosaicProps = {
  items: PlaceHighlightItem[];
  variant?: 'bento' | 'columns' | 'strips' | 'auto'; // default "auto"
  seed?: string;           // semente do "auto"; no servidor, passe mosaicDaySeed()
  title?: string;          // default "Lugares da cidade"
  moreHref?: string;       // liga o link do cabeçalho
  moreLabel?: string;      // default "Ver todos"
  limit?: number;          // máximo de lugares; aplicado ANTES dos chips
  contained?: boolean;     // container da home (default true)
  className?: string;
  labels?: { all?: string; surprise?: string; filterBy?: string; drawn?: string; open?: string; close?: string };
};
```

### Variante `auto` e semente

Com `variant="auto"`, `resolveMosaicVariant` decide assim: **menos de 4 itens** usa `strips` (bento
e colunas precisam de volume para parecerem mosaico); com 4 ou mais, o hash de `seed|contagem`
escolhe entre as três. A decisão é determinística.

O servidor passa `seed={mosaicDaySeed()}` (data "AAAA-MM-DD" no fuso `America/Sao_Paulo`). O cliente
**nunca lê a data**, então servidor e hidratação geram o mesmo markup, sem erro de hidratação, e o
arranjo gira a cada dia. As funções de `place-mosaic-layout.ts` são puras; o sorteio recebe o gerador
aleatório por parâmetro, o que permite testar.

### Comportamento

* **Chips de categoria:** vêm dos `kicker` dos itens (únicos, na ordem em que aparecem, mesma
  normalização da cor). Com um só grupo, os chips somem. Trocar de filtro faz uma transição curta
  de opacidade (sem ela com movimento reduzido).
* **Resumo:** em telas com ponteiro, o `summary`/`meta` aparece ao passar o mouse ou focar a peça.
  No toque não há hover: o resumo fica fixo só nas peças grandes.
* **Surpreenda-me:** sorteia entre os itens do **filtro atual**, rola até a peça, a destaca com um
  anel na cor do grupo e mostra um aviso fixo "Sorteado: Nome" com o link "Abrir lugar" e um botão de
  fechar. No celular o aviso fica acima da navegação inferior. O visitante vê o lugar no contexto,
  pode sortear de novo (**nunca repete o último**) e só navega se quiser. Trocar o filtro limpa o aviso.
* Peças sem foto usam o gradiente do grupo com um pino, como no `PlaceHighlights`.

### Acessibilidade

`section` com `aria-labelledby`; chips em um `group` com `aria-label` e `aria-pressed`; cada peça é um
único link (foto com `alt` vazio); o aviso do sorteio é `role="status"`; alvos de toque de no mínimo
44px, foco visível e animações condicionadas a `prefers-reduced-motion`.

### Montar na home

No starter, `HomePlaces` (`src/components/home/home-engagement.tsx`) carrega os lugares e entrega ao
mosaico, com a semente calculada no servidor:

```tsx
import { PlaceMosaic, mosaicDaySeed } from '@kizuna/core/client/components/home/place-mosaic';

<PlaceMosaic items={items} variant={variant} seed={mosaicDaySeed()} limit={limit} />
```

`variant` e `limit` vêm de `home.placesMosaic` no `kizuna.config.json` (ver
[Configuração](../comecando/configuracao.md)).

## HomeSearch e SearchBar

`SearchBar` (`search/search-bar.tsx`) é o campo de busca em pílula, extraído de
`search/search-page.tsx` e compartilhado pela `/busca` e pela home. É **controlado e sem
roteamento**: quem usa decide o que fazer no envio.

```ts
type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;          // Enter ou "Buscar"; texto sem trim
  placeholder?: string;                       // default "O que você procura?"
  locationLabel?: string;                     // chip de localização (só desktop); sem rótulo, não aparece
  onLocationClick?: () => void;
  locationTitle?: string;                     // default "Trocar localização"
  assistant?: { onClick: (value: string) => void }; // botão do assistente; sem isto, não aparece
  className?: string;
};
```

`HomeSearch` (`home/home-search.tsx`) monta o `SearchBar` na home e navega:

* envio normal: `/busca?q=<texto>`, acrescentando a cidade (`state`, `cityId`, `cityName`) quando
  `city` vier;
* assistente: `/busca?ia=<texto>`;
* texto vazio: `/busca` sem parâmetro de texto.

A `/busca` lê `?ia=`: com a IA habilitada, abre o chat com o texto **uma única vez** e remove o
parâmetro da URL.

```ts
type HomeSearchProps = {
  city?: { name: string; state: string; ibge: string } | null;
  aiEnabled?: boolean;      // mostra o botão do assistente (default false)
  placeholder?: string;     // com IA e sem valor: "Descreva o que você precisa…"
  locationLabel?: string;
  contained?: boolean;      // container da home (default true)
  className?: string;
};
```

No starter, `src/components/home-page.tsx` passa `aiEnabled` conforme `search.ai` (desligado só com
`false`) e esconde o bloco com `home.showSearch: false`.

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

## PainelWelcome

Topo da home do painel (`/painel`) pensado para quem **não** anuncia, que é a maioria: visitante
logado. Em vez de métricas de anúncio, a primeira dobra convida a descobrir e retoma o que a pessoa
já salvou. Fica em `src/client/components/painel-welcome/` e se importa por
`@kizuna/core/client/components/painel-welcome`.

De cima para baixo:

1. **Hero de descoberta**: o único bloco com gradiente da tela e dono do `h1` ("Bora, Maria?";
   sem nome, "Bora descobrir?"). Só o primeiro nome entra na saudação. Botões "Descobrir no swipe"
   e "Pesquisar". A partir de `sm`, um baralho de três cartões levemente rotacionados: usa as
   capas dos três favoritos mais recentes, ou cartões com gradiente e ícone enquanto não há
   favoritos. Há um único movimento, na carga: os cartões assentam da rotação aberta para a final
   em cerca de 600ms. Com movimento reduzido, já nascem na posição final.
2. **Seus favoritos**: faixa horizontal com scroll-snap (até 12 itens). Cada item é um link para
   `/anuncios/{uid}` com capa em miniatura, título (2 linhas) e categoria. Enquanto carrega, mostra
   um esqueleto do mesmo tamanho (sem salto de layout). Sem favoritos, um convite curto com botão
   para o swipe.
3. **Atalhos**: três tiles (favoritos, busca, perfil).
4. **Convite a anunciar**: só com `advertise`. Faixa neutra e tracejada, de propósito: parece uma
   oportunidade, não um anúncio.

```ts
type PainelWelcomeProps = {
  name?: string | null;      // nome de exibição; só o primeiro nome é usado
  discoverHref?: string;     // default "/descobrir"
  likedHref?: string;        // default "/painel/favoritos"
  searchHref?: string;       // default "/busca"
  accountHref?: string;      // default "/painel/minha-conta"
  advertise?: {              // null/omitido: não mostra o convite
    href: string;
    label: string;           // texto do botão (ex.: a frase "Novo anúncio" do vocabulário)
    title?: string;          // default "Tem um negócio, evento ou serviço?"
    text?: string;           // default "Divulgue para quem está procurando na cidade."
  } | null;
  headingAs?: 'h1' | 'h2';   // default "h1"; use "h2" se a página já tem um h1
  fetchLikedItems?: (page: number, pageSize: number) => Promise<LikedItem[]>; // default fetchLiked
  className?: string;
};
```

### Dados e falhas

Os favoritos vêm de `fetchLiked(1, 12)` (`swipe/swipe-api`) **no navegador**, depois da hidratação.
Resposta 401 ou qualquer erro viram lista vazia: o bloco nunca quebra a tela, apenas mostra o
estado vazio. `fetchLikedItems` existe para o showcase e para testes entregarem dados sem rede.

A URL da capa vem de `coverUrl` em `swipe/swipe-cover.ts`, módulo sem dependências que o
`swipe-card` reexporta; assim o bloco não puxa o card do swipe.

### Acessibilidade e movimento

* O componente é dono do único `h1` do hero; as demais seções são `h2`. Quando a página já tem um
  `h1`, passe `headingAs="h2"`.
* O baralho é decorativo (`aria-hidden`); as capas não têm `alt`, pois o título do favorito está no
  próprio link da faixa.
* Todos os links têm no mínimo 44px de altura e foco visível com o anel do tema.
* O assentamento do baralho e o zoom da capa no hover só acontecem com `prefers-reduced-motion`
  liberado; o esqueleto não pulsa com movimento reduzido.

### Montar na home do painel

No starter, `src/app/painel/page.tsx` só monta o bloco e deixa nível da conta, destaques e métricas
numa seção abaixo ("Sua conta e seus anúncios"). O `PainelHero` desce para `h2` com `headingAs`:

```tsx
import { PainelWelcome } from '@kizuna/core/client/components/painel-welcome';
import { PainelHero, PainelStats } from '@kizuna/core/client/components/analytics/painel-home';
import { vocabulary } from '@/lib/vocabulary';

<PainelWelcome
  name={session?.display_name}
  advertise={{ href: '/painel/meus-servicos/novo', label: vocabulary.phrases.new }}
/>

<PainelHero headingAs="h2" />
<PainelStats />
```
