---
description: Referência do kizuna.config.json — identidade/SEO, tema, cabeçalho, home, clima e wizards.
---

# Configuração (`kizuna.config.json`)

O `kizuna.config.json` fica na **raiz do projeto consumidor** e define a cara e o comportamento
do app **sem mexer em código**: nome e SEO do site, tema de cor, variante do cabeçalho,
seções da home, widget de clima e wizards. O modelo inicial vem de `starter/kizuna.config.json`.

{% hint style="info" %}
O arquivo é importado como módulo JSON (`import cfg from '@/../kizuna.config.json'`), então vale
**no build**: em `npm run dev` a mudança entra na hora; em produção é preciso gerar um build novo
(sem precisar de `--build-arg` nem de variável de ambiente).
{% endhint %}

Os campos `_comment` são ignorados pelo código. Servem de documentação dentro do próprio arquivo.
Pode apagá-los ou deixá-los.

{% hint style="warning" %}
Não confunda com o `kizuna.plugins.json`, que escolhe **quais plugins de banco** o projeto
instala. Ele é lido pelo CLI no `install`, não pelo app. Ver [Plugins](../plugins/README.md).
{% endhint %}

## Visão geral

| Bloco                  | Controla                                                           | Lido em                                         |
| ---------------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| [`site`](#site)        | nome, descrição, URL pública, idioma, logo                         | `layout.tsx`, `manifest.ts`, `robots.ts`, `sitemap.ts`, `footer.tsx` |
| [`theme`](#theme)      | tema de cor padrão, se o usuário pode trocar, cor da barra mobile  | `layout.tsx`, `manifest.ts`                     |
| [`header`](#header)    | layout do cabeçalho (`classic` / `compact`)                        | `layout.tsx`                                    |
| [`home`](#home)        | seções da home e formato do carrossel de categorias                | `app/page.tsx`                                  |
| [`weather`](#weather)  | widget de clima no cabeçalho (plugin `weather`)                    | `app/api/weather/route.ts`, `layout.tsx`, `footer.tsx` |
| [`wizards`](#wizards)  | passos, layout e perfis dos wizards (ex.: cadastro de serviço)     | páginas do plugin `services`                    |

Todos os blocos são opcionais. Sem um bloco, cada leitor usa o padrão indicado nas tabelas abaixo.

## `site`

Identidade e SEO. Alimenta o `<title>` (`%s | <name>`), a meta description, o Open Graph e o
Twitter card, o manifest do PWA, o `robots.txt`, o `sitemap.xml`, e a logo do cabeçalho e do rodapé.

| Campo         | Tipo   | Padrão                    | Efeito                                                                    |
| ------------- | ------ | ------------------------- | ------------------------------------------------------------------------- |
| `name`        | string | `"Kizuna"`                | Nome do site: título, Open Graph, manifest, copyright do rodapé.         |
| `shortName`   | string | `name`                    | Nome curto do PWA (ícone na tela inicial) e do `appleWebApp`.            |
| `description` | string | —                         | Meta description, Open Graph, Twitter card e manifest.                   |
| `url`         | string | `"http://localhost:3000"` | URL pública de produção, **sem barra no final**. Base do `metadataBase`, `robots` e `sitemap`. |
| `lang`        | string | `"pt-BR"`                 | `<html lang>`, locale do Open Graph (`pt_BR`) e do manifest.             |
| `logo`        | string | —                         | Caminho em `public/` (ex.: `"/brand/logo.png"`). Sem logo, o cabeçalho mostra o `name`. |

```json
"site": {
  "name": "Bora Cuiabá",
  "shortName": "Bora Cuiabá",
  "description": "Os eventos mais badalados, lugares, dicas de lazer e muita cultura!",
  "url": "https://boracuiaba.com",
  "lang": "pt-BR",
  "logo": "/brand/logo.png"
}
```

{% hint style="warning" %}
Esqueceu o `url` em produção? O sitemap e as URLs do Open Graph saem apontando para
`localhost:3000`.
{% endhint %}

## `theme`

| Campo        | Tipo    | Padrão      | Efeito                                                                                     |
| ------------ | ------- | ----------- | ------------------------------------------------------------------------------------------ |
| `default`    | string  | `"blue"`    | Tema de cor aplicado enquanto o usuário não escolhe outro. Valor inválido cai em `blue`.   |
| `selectable` | boolean | `true`      | `false` fixa o `default` para todos e **esconde o seletor de cor** do botão de preferências. |
| `metaColor`  | string  | `"#2563eb"` | Cor da barra do navegador no mobile (`<meta name="theme-color">`) e `theme_color` do PWA. |

Temas disponíveis (lista em `src/shared/theme-colors.ts`): `blue`, `green`, `purple`, `teal`,
`red`, `orange`, `coral`, `terracotta`, `bora_cuiaba`, `metro_orange`, `laranja_intenso`,
`laranja_medio`. Um tema novo precisa de código: entrada em `THEME_COLORS` + tokens no CSS.

```json
"theme": { "default": "bora_cuiaba", "selectable": false, "metaColor": "#fbf7f0" }
```

## `header`

| Campo     | Valores                  | Padrão      | Efeito                                                                                 |
| --------- | ------------------------ | ----------- | -------------------------------------------------------------------------------------- |
| `variant` | `classic` \| `compact`   | `classic`   | `classic` é a barra tradicional com links de navegação. `compact` é o cabeçalho enxuto, com marca e atalho de busca. |

A variante é estática, escolhida pelo projeto. Não há troca pelo usuário, então as páginas
públicas continuam prerenderizáveis. Os dois layouts usam os tokens do tema. A logo
(`site.logo`) e o widget de clima (`weather`) aparecem nas duas variantes.

```json
"header": { "variant": "compact" }
```

## `home`

Controla quais seções aparecem na home pública (`/`) e o visual delas.

| Campo               | Tipo                     | Padrão      | Efeito                                                                                   |
| ------------------- | ------------------------ | ----------- | ---------------------------------------------------------------------------------------- |
| `showHero`          | boolean                  | `true`      | Mostra a seção hero no topo. Só `false` esconde.                                           |
| `categoriesVariant` | `classic` \| `compact`   | `classic`   | Formato do **carrossel de categorias** (ver abaixo).                                     |
| `categoriesOnlyWithListings` | boolean         | `false`     | `true` lista no carrossel só categorias com **ao menos um anúncio publicado**. Requer o plugin `services`. |
| `showDiscover`      | boolean                  | `false`     | Mostra o banner "Descobrir no swipe" (leva a `/descobrir`). Só `true` mostra.              |
| `inkPicker`         | boolean                  | `true`      | Mostra o seletor de intensidade do fundo escuro ("ink") dos cards de destaque.           |
| `inkLevel`          | `1`–`7`                  | `6`         | Intensidade padrão do fundo "ink". Com o seletor ativo, a escolha salva do usuário prevalece. |

Ordem das seções na home: hero → carrossel de categorias → banner "Descobrir" → grade de
próximos → "como funciona" → chamada final.

### Carrossel de categorias

O carrossel (`CategoryCarousel`, `@kizuna/core/client/components/taxonomy/category-carousel`)
mostra **as categorias reais do projeto**: ele lê o recurso `category_stats` (view
`vw_category_subcategory_stats` do plugin `taxonomy`). Isso tem três consequências:

* Só aparecem categorias que têm **ao menos uma subcategoria ativa**. Categoria vazia não entra.
* O **ícone** de cada card é o campo `icon` da categoria: um nome de ícone do
  [Lucide](https://lucide.dev/icons), cadastrado no painel de categorias.
* O clique leva para `/busca?categoryId=<id>`. O "ver todas" leva para `/busca`.
* Com `categoriesOnlyWithListings: true`, a categoria também precisa de **ao menos um anúncio
  publicado** (`active` e `status = active`). O carrossel cruza com o recurso
  `category_service_stats` (view `vw_category_service_stats`, plugin `services`). Anúncios
  pendentes ou pausados não contam.
* No desktop, setas translúcidas nas bordas fazem a navegação manual. Cada seta some quando o
  trilho encosta naquela beirada.

O `categoriesVariant` escolhe o formato dos cards:

| Variante   | Visual                                                                       | Quando usar                                         |
| ---------- | ---------------------------------------------------------------------------- | --------------------------------------------------- |
| `classic`  | Cards largos com ícone, nome e **contador de subcategorias**.                | Poucas categorias, com destaque para cada uma.      |
| `compact`  | Cards quadrados (96×96), com ícone em círculo e nome, **sem contador**. Rolagem horizontal. | Muitas categorias, visual de app mobile.            |

Link, ícone, contador ou texto de "vazio" diferentes exigem código: passe props ao
`CategoryCarousel` em `src/components/home/category-rail.tsx`. Esse arquivo é *seed*, então pertence
ao projeto.

```json
"home": {
  "showHero": false,
  "categoriesVariant": "compact",
  "categoriesOnlyWithListings": true,
  "showDiscover": true,
  "inkPicker": false,
  "inkLevel": 6
}
```

## `weather`

Widget de clima no cabeçalho, depois da busca, com modal de previsão. Requer o plugin `weather`
ativo. Integração com o [Open-Meteo](https://open-meteo.com): grátis e **sem chave de API**. Uma
única chamada traz todas as cidades.

**Sem o bloco `weather`, o widget some** (e o crédito ao Open-Meteo sai do rodapé). Com o bloco
mas sem cidades, `/api/weather` responde `404`.

| Campo           | Tipo     | Padrão                                     | Efeito                                                          |
| --------------- | -------- | ------------------------------------------ | --------------------------------------------------------------- |
| `cities`        | array    | — (**obrigatório**)                        | `[{ "name", "latitude", "longitude" }]`. A primeira aparece primeiro. |
| `timezone`      | string   | `"auto"`                                   | Fuso IANA das datas (ex.: `"America/Cuiaba"`). Define o "hoje" do modal. |
| `apiUrl`        | string   | `https://api.open-meteo.com/v1/forecast`   | Endpoint do provedor.                                           |
| `cacheSeconds`  | number   | `900`                                      | Quanto tempo o servidor guarda a resposta.                      |
| `rotateSeconds` | number   | `5`                                        | Intervalo de troca de cidade no botão do cabeçalho.             |
| `pastDays`      | number   | `1`                                        | Dias antes de hoje exibidos no modal.                           |
| `forecastDays`  | number   | `7`                                        | Dias de previsão exibidos no modal.                             |

```json
"weather": {
  "timezone": "America/Cuiaba",
  "cacheSeconds": 900,
  "rotateSeconds": 5,
  "pastDays": 1,
  "forecastDays": 7,
  "cities": [
    { "name": "Cuiabá", "latitude": -15.6014, "longitude": -56.0979 },
    { "name": "Várzea Grande", "latitude": -15.6467, "longitude": -56.1325 }
  ]
}
```

## `wizards`

Uma entrada por wizard (`wizards.<nome>`), lida com `createWizardFromJson`. O projeto escolhe por
config os **passos**, o **layout**, se a IA aparece e para onde ir ao terminar. Passos novos
continuam sendo código.

| Campo              | Tipo                        | Padrão      | Efeito                                                            |
| ------------------ | --------------------------- | ----------- | ----------------------------------------------------------------- |
| `resource`         | string                      | —           | Recurso (`/api/resources/<resource>`) onde o wizard grava.        |
| `steps`            | string[]                    | —           | Ordem dos passos, por chave do registry. Chave inexistente lança erro. |
| `disable`          | string[]                    | `[]`        | Passos desligados sem tirar da lista.                             |
| `layout`           | `stepper` \| `scroll`       | —           | Um passo por vez com barra de progresso, ou todos numa página.    |
| `lockLayout`       | boolean                     | `true`      | Esconde o botão de alternar o layout.                             |
| `assistant`        | boolean                     | `false`     | Liga o assistente de IA (Naví) no wizard.                         |
| `finishHrefByMode` | `{ create?, review?, … }`   | —           | Para onde redirecionar ao concluir, por modo.                     |

O wizard de serviços (`wizards.servicos`) aceita ainda `stepProfiles` (opções de **local** e
**preço** por grupo ou categoria, tabela de preços, seleção inicial) e `skipStepsByGroup` (esconder
passos para certos grupos). A referência completa, com precedência e exemplos, está em
[Wizard](../interface/wizard.md) (seção "Config por projeto").

```json
"wizards": {
  "servicos": {
    "resource": "services",
    "layout": "stepper",
    "lockLayout": true,
    "assistant": false,
    "steps": ["category", "start", "location", "price", "images", "description", "dynamic-form", "moderation"],
    "skipStepsByGroup": { "location": ["noticias"] },
    "finishHrefByMode": {
      "create": "/painel/meus-servicos",
      "review": "/painel/administracao/aprovacoes"
    }
  }
}
```

## Adicionando uma chave nova

Se uma feature do core ou do app precisa ser configurável por projeto:

1. Leia a chave onde ela é usada (`import cfg from '@/../kizuna.config.json'`), **sempre com um
   padrão** para quando ela não existir. Projetos antigos não têm a chave.
2. Valide valores fechados (ex.: `variant === 'compact' ? 'compact' : 'classic'`) em vez de
   repassar o valor cru.
3. Adicione a chave com `_comment` em `starter/kizuna.config.json`.
4. Documente o campo nesta página (tabela do bloco + exemplo).
