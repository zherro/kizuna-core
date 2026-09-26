---
description: Plugin services — anúncios de serviço, subcategorias, endereços, moderação e as políticas de acesso de cada tabela.
---

# Plugin `services`

Domínio marketplace de serviços: o anúncio de um prestador. Versão atual: **1.3.0**
(`plugins/services/0001` a `0004`). O cadastro usa o [wizard](../interface/wizard.md); a busca
pública está em [Plugin `search`](search.md).

## Tabelas

| Tabela                   | Papel                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `services`               | O anúncio: título, categoria, preço, `status`, `service_location`, `extras` (jsonb).         |
| `service_categories_sub` | Subcategorias do serviço (N por serviço). Filha de `services`, `ON DELETE CASCADE`.          |
| `service_addresses`      | Endereços do serviço (N por serviço), com 1 principal. Filha de `services`, `ON DELETE CASCADE`. |
| `service_moderations`    | Decisões de moderação (`approved`, `rejected`, `escalated`).                                 |

A view `vw_category_service_stats` (0002) conta anúncios publicados por categoria.

`services.service_location` (enum `no_cliente` / `no_estabelecimento` / `remoto`) continua sendo a
modalidade principal, de escolha única. Os endereços ficam em `service_addresses`.

## Validade (`services.expires_at`, migration 0004)

`services.expires_at` (`timestamptz`, **nula** = sem validade) guarda o fim da validade do anúncio, com o
índice parcial `services_expires_at` (`WHERE active AND expires_at IS NOT NULL`). O wizard a preenche
pelo perfil `price.expiresAt` (ver [Wizard](../interface/wizard.md)); no front vira `expiresAt`
(ISO ou `null`). A busca e o swipe ignoram anúncios com `expires_at` no passado (`NULL` = sem
validade); o `status` do anúncio continua `active`, então ele volta a aparecer se a data for limpa
ou estendida. A leitura direta da tabela (`/api/resources/services`) não aplica esse filtro.

## Endereços (`service_addresses`, migration 0003)

| Coluna                                                                | Observação                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------ |
| `service_id`                                                          | FK para `services`, `ON DELETE CASCADE`.                     |
| `label`, `zip_code`, `street`, `number`, `complement`, `neighborhood` | Texto livre. Rua e número **não** são expostos pela busca.   |
| `city`, `state` (2 letras), `city_ibge` (texto)                       | Base do filtro de local.                                     |
| `latitude`, `longitude`, `place_id`                                   | Opcionais.                                                   |
| `is_primary`                                                          | No máximo **um** endereço principal ativo por serviço.       |
| `tenant_id`, `created_by`, `active`, `created_at`, `updated_at`       | Padrão das tabelas do plugin.                                |

Índices parciais (todos `WHERE active`): `(service_id, is_primary DESC)`, `(state, city_ibge)`,
`(city_ibge)` e o índice único do endereço principal.

### Acesso (RLS)

| Política            | Quem                | O quê                                                                          |
| ------------------- | ------------------- | ------------------------------------------------------------------------------ |
| `sa_public_read`    | `anon`, `auth_user` | Lê apenas endereços ativos de serviço `active` com `status = 'active'`.        |
| `sa_owner_write`    | `auth_user`         | Escreve apenas nos endereços de serviços criados por ele.                      |
| `sa_moderator_read` | `auth_user`         | Lê tudo, com a permissão `services:moderate`.                                  |

{% hint style="warning" %}
A leitura pública **não** é `USING (true)`: o endereço tem rua e número, então só é visível
enquanto o serviço está publicado. Nunca devolva rua ou número em uma RPC pública.
{% endhint %}

### Backfill

A migration 0003 cria, de forma idempotente, **um endereço principal** para cada serviço ativo que
ainda não tem nenhum, copiando cidade, UF, IBGE, CEP e coordenadas do `user_data` do prestador
(somente se houver cidade ou UF). Assim a busca não esvazia depois da troca do filtro.

### Regras no wizard

Só `no_estabelecimento` exige **ao menos 1** endereço; `no_cliente` e `remoto` não pedem endereço.
O perfil `addresses` do passo `location` está em [Wizard](../interface/wizard.md). O recurso
`service_addresses` é exposto em `/api/resources/service_addresses` (filtro `?filter.service_id=`).

## Moderação

`fn_service_moderate` insere a decisão em `service_moderations` e deriva `services.status`
(`approved` → `active`, `rejected` → `archived`, `escalated` → `pending`). Exige a permissão
`services:moderate`.

## Políticas das demais tabelas

* `services`: leitura pública dos publicados (`anon`); dono ou moderador leem e atualizam os seus.
* `service_categories_sub`: leitura aberta; escrita só do dono do serviço.
* `service_moderations`: leitura por quem tem `services:moderate` (ou conforme `sm_read`); escrita
  só pela RPC.
