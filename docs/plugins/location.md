---
description: Plugin location — hierarquia país/região/estado/cidade, seletor de local do header (cidades com search_city), detecção por GPS/IP.
---

# Plugin `location`

Referência geográfica genérica (`location_country` → `location_region` → `location_state` →
`location_city`) mais as rotas `/api/location/*` que alimentam o seletor de local do cabeçalho
(`LocationTrigger`/`LocationModal`) e a detecção automática (`use-user-location`,
`LocationGate` da `/busca`). Versão atual: **1.1.0** (`plugins/location/0002_location_search_city.sql`).

## Cidades do seletor: `search_city`

O seletor lista **só** as cidades com `location_city.search_city = true`. A tabela pode ter o
Brasil inteiro como referência; `search_city` marca as que o projeto atende.

| Coluna        | Tipo      | Padrão  | Efeito                                                              |
| ------------- | --------- | ------- | ------------------------------------------------------------------- |
| `search_city` | `boolean` | `false` | `true` = aparece no seletor e é aceita pela detecção GPS/IP.        |

Índice parcial `idx_location_city_search_city` em `(name) WHERE search_city` — exatamente a consulta
do seletor (cidades marcadas, por nome).

Os ids de `location_state` e `location_city` são os códigos oficiais do IBGE (2 e 7 dígitos). É o
`cityId` que o seletor guarda e o que vai como `p_city_ibge` para a [busca](search.md).

O plugin não traz dados. O projeto semeia as cidades que atende, por exemplo:

```sql
INSERT INTO public.location_city (id, state_id, name, search_city)
VALUES (5103403, 51, 'Cuiabá', true), (5108402, 51, 'Várzea Grande', true)
ON CONFLICT (id) DO UPDATE SET search_city = EXCLUDED.search_city;

-- tirar do seletor sem apagar a cidade
UPDATE public.location_city SET search_city = false WHERE id = 5108402;
```

País, região e estado precisam existir antes (FKs). As rotas usam `Cache-Control` de 5 minutos.

{% hint style="warning" %}
Sem nenhuma cidade marcada, o seletor fica vazio. Até a 1.0.0 o seletor listava o Brasil inteiro
direto da API do IBGE; esse modo (e a chave `location.source`) foi removido na 1.1.0.
{% endhint %}

## O seletor

Um passo só: campo de busca e lista de cidades, cada uma como "Cuiabá – MT" (UF em
`text-muted-foreground`). Sem busca mostra as **10 primeiras** por nome; a busca (sem acento, sem
caixa) procura entre todas as marcadas e também mostra no máximo 10.

## Cidade detectada fora da lista

GPS (Nominatim) e IP (ip-api) só devolvem UF + nome da cidade. Toda detecção — e a localização já
salva no navegador, revalidada uma vez por carga de página — passa por `/api/location/resolve`:

| Cidade detectada          | Resultado                                                                        |
| ------------------------- | -------------------------------------------------------------------------------- |
| marcada (`search_city`)   | vira a cidade da tabela                                                          |
| fora da lista / sem UF    | `outsideList: "default"` → `defaultCityIbge`; `"prompt"` → nenhum local, abre o seletor |

Comparação de nome ignora acento e caixa. Falha de rede no `resolve` não apaga o local salvo.

Na `/busca` (`LocationGate`), IP indisponível (dev, ip-api fora do ar) também passa pelo `resolve`,
sem UF: com `outsideList: "default"` a busca abre direto na cidade padrão; sem ela, abre o seletor.

{% hint style="warning" %}
Com `outsideList: "default"`, a cidade de `defaultCityIbge` precisa estar marcada
(`search_city = true`). Se não estiver, o `resolve` devolve `null` e o usuário cai no seletor.
{% endhint %}

## Rotas (shell do plugin)

| Rota                                   | Resposta                                                      |
| -------------------------------------- | ------------------------------------------------------------- |
| `GET /api/location/cities[?uf=MT]`     | `{ items: { value, label, stateCode, stateName }[] }` (`value` = código IBGE) |
| `GET /api/location/resolve?uf=&city=`  | `{ location: { stateCode, stateName, cityId, cityName } \| null }` |
| `GET /api/location/ip`, `/reverse`     | Detecção por IP / GPS (ip-api, Nominatim).                    |
| `GET /api/location/cep`, `/address/search` | CEP (ViaCEP) e busca de endereço (Google Places).        |

A lógica fica em `src/server/location/index.ts` (`parseLocationConfig`, `listLocationCities`,
`resolveLocation`, exportados por `@kizuna/core/server`).

{% hint style="info" %}
O endereço do prestador e dos anúncios usa CEP (wizard de serviço) ou `/api/agenda/cities` (plugin
`agenda`, IBGE — formulário de `user_data`), não este seletor: restringir as cidades do seletor não
impede cadastrar endereço em outra cidade.
{% endhint %}
