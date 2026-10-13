---
description: Plugin search — RPC fn_search_services, filtro de local por endereço do serviço, painel de filtros da /busca, colunas retornadas e notas de performance.
---

# Plugin `search`

Busca pública de serviços: RPC `fn_search_services` (`SECURITY DEFINER`, chamável por `anon`) e a
página `/busca`. Versão atual: **1.1.0** (`plugins/search/0002_search_addresses.sql`). Depende de
[`services`](services.md) 1.2.0 ou superior. o deck do plugin `swipe`
devolvem as mesmas colunas de local.

## Parâmetros de filtro

`p_state`, `p_city_id`, `p_group_category_slug`, `p_category_id`, `p_subcategories` (jsonb),
`p_query`, `p_seed`, `p_page`, `p_page_size` e **`p_city_ibge`** (texto). O filtro de cidade usa
`p_city_ibge`; `p_city_id` continua na assinatura por compatibilidade.

`p_group_category_slug` (busca por grupo e carrossel de grupo da home) aceita o anúncio quando o
grupo bate em qualquer um destes: o grupo gravado no anúncio (`services.category_group_id`), o grupo
principal da categoria (`categories.category_group_id`, migração **0005**) ou um vínculo secundário
(`categories_group_link`). Assim, um carrossel de grupo pega todas as categorias do grupo, mesmo
anúncio sem grupo gravado ou de categoria que mudou de grupo.

## Busca com IA (liga/desliga)

`search.ai` no `kizuna.config.json` (padrão `true`). Com `false`, a `/busca` não mostra o assistente Naví (botões, chat, balão) nem o título "Buscar com IA": fica só a busca por texto + filtros. A página repassa o valor via `aiEnabled` do `SearchPage`.

## Filtro de local

Sem `p_state` nem `p_city_ibge`, o filtro de local não tem custo. Com eles, o serviço passa se:

1. `service_location = 'remoto'` (serviço remoto sempre passa); ou
2. existe **um** endereço ativo em `service_addresses` que case com UF e cidade ao mesmo tempo
   (no **mesmo** endereço), via um único `EXISTS`; ou
3. o serviço **não tem nenhum endereço ativo** e o prestador (`user_data`) casa com UF/cidade
   (fallback).

O resultado continua com uma linha por serviço (semi-join, sem `JOIN` que duplique).

## Validade do anúncio

Anúncios com `services.expires_at` no passado não entram na busca nem no deck do swipe
(`expires_at IS NULL OR expires_at > now()`, aplicado junto de `active` e `status`). Requer
`services` 1.3.0. As curtidas (`liked_services`) não aplicam o filtro: o histórico continua visível.

## Colunas retornadas

Além de `uid`, `title`, `price`, `price_type`, `category`, `subcategory`, `sponsored`,
`cover_file_id`, `provider_name`, `provider_avatar`, `rating` e `reviews`:

| Coluna          | Conteúdo                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------- |
| `city`, `state` | Endereço que casou com o filtro; sem filtro, o principal. Sem endereço: cidade/UF do prestador. |
| `address_count` | Total de endereços ativos do serviço (`0` sem endereço).                                        |

| `category_slug` | `categories.slug` do anúncio (migração 0003): chave do estilo por categoria (`serviceDetail.variantByCategorySlug`). |
| `category_group_slug` | `categories_group.slug` do anúncio (migração **0005**, plugin 1.4.0), via `services.category_group_id` com fallback para o grupo da categoria: chave do estilo por grupo (`serviceDetail.variantByGroupSlug`). |

Os cartões formatam `city` e `address_count` como "Cuiabá" ou "Cuiabá +2"; sem cidade usam a UF.

{% hint style="warning" %}
A RPC nunca devolve rua nem número. As colunas novas só existem depois de aplicar a 0002; o cliente
as trata como opcionais.
{% endhint %}

## Layout por categoria e por grupo

`resolveServiceDetailVariant({ slug, groupSlug }, serviceDetail)` escolhe o layout (detalhe e card)
na ordem: `variantByCategorySlug[slug]` > `variantByGroupSlug[groupSlug]` > `defaultVariant` >
`"service"`. O hue de acento (`resolveCategoryHue`) segue `colors[slug]` > `colors[groupSlug]` >
`colors.default` > 230. O cliente lê `category_slug` e `category_group_slug` do resultado; sem a
0005 aplicada o grupo vem ausente e só a categoria vale (comportamento anterior).

Na tela de detalhe, se `services.category_group_id` estiver nulo, o loader (`loadServiceDetail`)
deriva o grupo pela categoria (`categories.category_group_id` -> `categories_group`), então a
variant por grupo vale mesmo para anúncio importado só com a categoria.

### Títulos das seções

`serviceDetail.sectionTitles` troca os textos "Sobre o serviço" (descrição, chave `about`) e
"Detalhes do serviço" (quadro de informações do formulário da categoria, chave `details`). A chave do
mapa é o slug da categoria, depois o slug do grupo, depois `default`; cada texto (`about`,
`details`) resolve sozinho (`resolveSectionTitles`). Sem entrada, ficam os textos acima. O layout de
cinema mantém "Sinopse" e "Onde assistir".

```json
"sectionTitles": {
  "eventos": { "about": "Sobre o evento", "details": "Informações do evento" }
}
```

A descrição do anúncio é lida como **Markdown** (negrito, listas, links http/https); HTML legado de
editor segue aceito, mas é sanitizado (lista fechada de tags, sem atributos).

## Painel de filtros da busca

O painel (`SearchFiltersPanel`, em `src/client/components/search`) tem o jeito de um filtro de classificados: o usuário sempre sabe em que grupo está e troca com um toque. A página só monta o painel; quem o compõe são os blocos de `search/filters/`:

| Bloco | O que faz |
| --- | --- |
| `filter-taxonomy.ts` | Lógica pura (testada sem DOM): monta grupos, categorias e especialidades a partir das linhas dos recursos, deduz o grupo em vigor, ordena marcadas primeiro e calcula as mudanças (marcar, desmarcar, trocar de grupo). |
| `use-filter-taxonomy.ts` | Busca os recursos `categories_group_public`, `categories_public` e `category_stats` e devolve a taxonomia pronta. |
| `FilterGroupLink` | O grupo atual como link grande no topo (ícone, nome e "Trocar de grupo"). Sem grupo mostra "Todas as categorias". |
| `FilterGroupList` | A visão de troca: "Todas as categorias" e os grupos, com ícone e seta. |
| `FilterCategoryList` | Categorias do grupo com multi-seleção (cada item é um checkbox acessível). As marcadas sobem para o topo com fundo e barra na cor primária; a troca de lugar desliza. |
| `FilterSubcategoryChips` | Especialidades das categorias marcadas, em chips que alternam. O nome da categoria só aparece acima de cada bloco quando há mais de uma marcada. |
| `FilterCityChips` | Cidades em vigor como chips com botão de remover e mini-seletor "Adicionar cidade" (busca sem acento, até 8 resultados, as já escolhidas ficam de fora). |

### Como o painel se comporta

1. **Grupo em destaque.** Clicar no link do grupo troca a visão para a lista de grupos; escolher um grupo volta às categorias dele e zera categorias e especialidades. "Todas as categorias" limpa o grupo.
2. **Categorias do grupo.** Pertencem ao grupo a categoria cujo grupo primário é ele e as ligadas por vínculo extra (`categories_group_link`). Só aparece categoria com ao menos uma subcategoria ativa (a mesma regra do carrossel de categorias).
3. **Grupo deduzido.** Sem `group` na URL e com categorias marcadas (link do carrossel com `categoryIds`), o painel mostra o grupo primário da primeira categoria marcada. É só exibição: o `groupSlug` não é gravado na URL.
4. **Sem grupo e sem categoria** o painel mostra os grupos como links, não uma lista longa de categorias. Projeto sem grupos cadastrados cai numa lista simples de categorias.
5. **Especialidades.** Desmarcar uma categoria remove também as especialidades dela (o patch leva `subcategoryIds` explícito).
6. **Localização.** Os chips vêm de `effectiveCityIds`; os nomes são resolvidos por `GET /api/location/cities` (uma requisição só, cache em módulo). Remover todas vira "Estado inteiro" com o atalho "voltar ao padrão" (`cityIds` nulo). O seletor inline NÃO usa o `LocationModal`, que troca a cidade do cabeçalho.
7. **Resposta imediata.** Marcar categoria, grupo ou cidade aparece na hora; o painel só devolve o controle aos filtros da URL quando eles chegam.
8. **Depois**: ordenar por, busca por texto e faixa de preço, e o botão "Limpar filtros", que só aparece quando há filtro ativo (`countActiveFilters`).

### Props

```ts
type Props = {
  filters: SearchFilters;
  setFilters: (patch: SearchFilterPatch) => void;
  resetFilters: () => void;
  /** cidades em vigor (IBGE): filters.cityIds ?? defaultCityIds */
  effectiveCityIds: string[];
  /** padrão: cidade do cabeçalho + irmãs da região (IBGE) */
  defaultCityIds: string[];
};
```

`useSearchFilters` já devolve `effectiveCityIds` e `defaultCityIds`; todo ponto que monta o painel (busca, deck do swipe) precisa repassar os dois.

### Dados e acessibilidade

* `categories_public` limita a 100 linhas por página no servidor. A lista de categorias nasce de `category_stats` (que aceita 1000) e `categories_public` só acrescenta ícone e vínculos extras, então o corte não some com categorias; só perde esses extras além da linha 100.
* Há um resumo `aria-live` ("3 filtros aplicados"), o foco acompanha a troca de visão e os alvos de toque têm ao menos 44 px no mobile. Movimento respeita `prefers-reduced-motion`.
* Os blocos estão no showcase (`/showcase/search-filter-blocks`) com dados de exemplo.

## Performance

* O filtro usa os índices parciais de `service_addresses` (`(state, city_ibge)` e `(city_ibge)`).
* `city`, `state` e `address_count` são calculados por `LATERAL` **depois** do `LIMIT`/`OFFSET`,
  apenas para as linhas da página.
* No cliente, `p_city_ibge` faz parte da chave que dispara nova busca; não há requisição extra.

Como o `RETURNS TABLE` muda, a migration faz `DROP FUNCTION` e refaz o `GRANT`.
