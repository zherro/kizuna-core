---
description: Plugin search — RPC fn_search_services, filtro de local por endereço do serviço, colunas retornadas e notas de performance.
---

# Plugin `search`

Busca pública de serviços: RPC `fn_search_services` (`SECURITY DEFINER`, chamável por `anon`) e a
página `/busca`. Versão atual: **1.1.0** (`plugins/search/0002_search_addresses.sql`). Depende de
[`services`](services.md) 1.2.0 ou superior. `fn_swipe_deck` e `fn_swipe_liked` (plugin `swipe`)
devolvem as mesmas colunas de local.

## Parâmetros de filtro

`p_state`, `p_city_id`, `p_group_category_slug`, `p_category_id`, `p_subcategories` (jsonb),
`p_query`, `p_seed`, `p_page`, `p_page_size` e **`p_city_ibge`** (texto). O filtro de cidade usa
`p_city_ibge`; `p_city_id` continua na assinatura por compatibilidade.

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
`services` 1.3.0. As curtidas (`fn_swipe_liked`) não aplicam o filtro: o histórico continua visível.

## Colunas retornadas

Além de `uid`, `title`, `price`, `price_type`, `category`, `subcategory`, `sponsored`,
`cover_file_id`, `provider_name`, `provider_avatar`, `rating` e `reviews`:

| Coluna          | Conteúdo                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------- |
| `city`, `state` | Endereço que casou com o filtro; sem filtro, o principal. Sem endereço: cidade/UF do prestador. |
| `address_count` | Total de endereços ativos do serviço (`0` sem endereço).                                        |

Os cartões formatam `city` e `address_count` como "Cuiabá" ou "Cuiabá +2"; sem cidade usam a UF.

{% hint style="warning" %}
A RPC nunca devolve rua nem número. As colunas novas só existem depois de aplicar a 0002; o cliente
as trata como opcionais.
{% endhint %}

## Performance

* O filtro usa os índices parciais de `service_addresses` (`(state, city_ibge)` e `(city_ibge)`).
* `city`, `state` e `address_count` são calculados por `LATERAL` **depois** do `LIMIT`/`OFFSET`,
  apenas para as linhas da página.
* No cliente, `p_city_ibge` faz parte da chave que dispara nova busca; não há requisição extra.

Como o `RETURNS TABLE` muda, a migration faz `DROP FUNCTION` e refaz o `GRANT`.
