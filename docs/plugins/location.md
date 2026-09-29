---
description: Plugin location — hierarquia país/região/estado/cidade, seletor de local do header, lista de cidades atendidas e detecção por GPS/IP.
---

# Plugin `location`

Referência geográfica genérica (`location_country` → `location_region` → `location_state` →
`location_city`) mais as rotas `/api/location/*` que alimentam o seletor de local do cabeçalho
(`LocationTrigger`/`LocationModal`) e a detecção automática (`use-user-location`,
`LocationGate` da `/busca`).

## De onde vêm as cidades

O bloco `location` do `kizuna.config.json` (ver [Configuração](../comecando/configuracao.md))
escolhe a fonte:

| `source`         | Estados e cidades do seletor                                                              |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `ibge` (padrão)  | Brasil inteiro, da API de localidades do IBGE (proxy server-side com cache em memória).   |
| `db`             | Só as linhas de `location_state` / `location_city`. **A tabela é a lista de cidades.**    |

Os ids de `location_state` e `location_city` são os códigos oficiais do IBGE (2 e 7 dígitos). É o
`cityId` que o seletor guarda e o que vai como `p_city_ibge` para a [busca](search.md).

O plugin não traz dados. O projeto semeia as cidades que atende, por exemplo:

```sql
INSERT INTO public.location_city (id, state_id, name)
VALUES (5103403, 51, 'Cuiabá'), (5108402, 51, 'Várzea Grande')
ON CONFLICT (id) DO UPDATE SET state_id = EXCLUDED.state_id, name = EXCLUDED.name;
```

País, região e estado precisam existir antes (FKs). Liberar cidade nova é um `INSERT`; as rotas
em modo `db` usam `Cache-Control` de 5 minutos.

## Cidade detectada fora da lista

GPS (Nominatim) e IP (ip-api) só devolvem UF + nome da cidade. Toda detecção — e a localização já
salva no navegador, revalidada uma vez por carga de página — passa por `/api/location/resolve`:

| Modo | Cidade na lista             | Fora da lista                                                              |
| ---- | --------------------------- | -------------------------------------------------------------------------- |
| db   | vira a cidade da tabela     | `outsideList: "default"` → `defaultCityIbge`; `"prompt"` → nenhum local, abre o seletor |
| ibge | ganha o código IBGE pelo nome | mantém a cidade detectada com `cityId: 0` (sem restrição)                |

Comparação de nome ignora acento e caixa. Falha de rede no `resolve` não apaga o local salvo.

{% hint style="warning" %}
Com `outsideList: "default"`, a cidade de `defaultCityIbge` precisa estar em `location_city`. Se
não estiver, o `resolve` devolve `null` e o usuário cai no seletor.
{% endhint %}

## Rotas (shell do plugin)

| Rota                                   | Resposta                                                      |
| -------------------------------------- | ------------------------------------------------------------- |
| `GET /api/location/states`             | `{ items: { id, sigla, nome }[] }`                            |
| `GET /api/location/cities?uf=MT`       | `{ items: { value, label }[] }` (`value` = código IBGE)       |
| `GET /api/location/resolve?uf=&city=`  | `{ location: { stateCode, stateName, cityId, cityName } \| null }` |
| `GET /api/location/ip`, `/reverse`     | Detecção por IP / GPS (ip-api, Nominatim).                    |
| `GET /api/location/cep`, `/address/search` | CEP (ViaCEP) e busca de endereço (Google Places) — independentes do modo. |

A lógica fica em `src/server/location/index.ts` (`parseLocationConfig`, `listLocationStates`,
`listLocationCities`, `resolveLocation`, exportados por `@kizuna/core/server`); as rotas só leem o
bloco `location` do config e repassam.

{% hint style="info" %}
O endereço do prestador e dos anúncios (wizard de serviço, `user_data`) usa CEP, não este seletor:
restringir as cidades do seletor não impede cadastrar endereço em outra cidade.
{% endhint %}
