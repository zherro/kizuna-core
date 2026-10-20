---
description: Plugin services — anúncios de serviço, subcategorias, endereços, moderação e as políticas de acesso de cada tabela.
---

# Plugin `services`

Domínio marketplace de serviços: o anúncio de um prestador. Versão atual: **1.9.0**
(`plugins/services/0001` a `0014`). O cadastro usa o [wizard](../interface/wizard.md); a busca
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

### Na página de detalhe

A página de detalhe do anúncio mostra a **Localização** do endereço primário e ativo (senão o primeiro
ativo): o endereço em texto, o mapa quando há coordenadas e os atalhos de "Como chegar", conforme os
blocos de [Conteúdo](../arquitetura/modelo-de-conteudo.md). Aparece só na variant padrão (`service`);
cinema e evento tratam o local por conta própria.

## Tags (`extras.tags`, migração 0011)

`services.extras.tags` é um array JSON de strings que agrupa anúncios além da taxonomia: um local e
os eventos que acontecem nele, todos os shoppings, todas as casas de festas. Convenção:

* minúsculas, sem acento, kebab-case: `casas-de-festas`, `shoppings`;
* `:` separa um prefixo: `local:<slug-do-local>` liga o local aos anúncios que acontecem nele.

```json
{ "tags": ["casas-de-festas", "local:espaco-x"] }
```

A migração 0011 só cria índices parciais: o GIN `services_extras_tags` sobre `(extras->'tags')`, nos
anúncios publicados (`active AND status = 'active'`). Não há constraint: linha sem `tags`, ou com
`tags` fora do padrão, continua válida. O índice atende `?|`, `?` e `@>`.

Quem lê: a busca (`fn_search_services(p_tags => ...)`) e os carrosséis por tag (`ServiceTagRail`,
`tagRails` da tela de detalhe). Detalhes em [search](search.md), seção "Filtro por tag".

{% hint style="warning" %}
O painel ainda não edita `extras.tags`: hoje elas vêm de importadores (de-para) ou de SQL direto.
O wizard do anúncio preserva as chaves de `extras` que não conhece (`persistExtras` mescla com o
registro carregado, `src/client/components/wizard/persist-resource.ts`), então editar o anúncio no
painel não apaga as tags.
{% endhint %}

### Código, organizador e vinculados (`extras.codigo`)

Um anúncio pode ter um **código** próprio; os outros o citam em `extras.tags`. A tela de detalhe usa
isso nos dois sentidos, sem campo novo no banco (tudo vive em `extras`).

| Chave em `extras` | O que é | Quem grava | Onde é lida |
|---|---|---|---|
| `codigo` | string, o código do anúncio (ex.: `espaco-art-festas-e-eventos`) | quem tem a permissão `services.link` (seção "Vínculos" do wizard), o importador de lugares ou SQL | `fetchOrganizer` e `fetchTagRails` (`service-detail-data.ts`) |
| `tags` | array de strings; para referenciar outro anúncio, o `codigo` dele | quem tem `services.link`, importadores (de-para de eventos e de lugares) | busca (`p_tags`), carrosséis por tag e `fetchOrganizer` |
| `vinculosTitulo` | string opcional, título do carrossel de vinculados (1 a 60 caracteres; senão ignorada) | quem tem `services.link`, importador (lugares, frontmatter `vinculos_titulo`) ou SQL | `linkedRailTitle` (`src/shared/service-tags.ts`) |

- **Quem organiza** (pai): o anúncio ativo (`active` e `status = 'active'`) cujo `extras.codigo` é
  igual a uma das tags do anúncio aberto, exceto ele mesmo. Das tags (normalizadas, até 3, formato
  `[a-z0-9:._-]`, em ordem) faz uma única consulta `extras->>codigo=in.(...)` pelo `where` de
  `serverFetchResource` (leitura pública, `auth: null`, `order=created_at.asc`). Vence a primeira tag
  da lista que tiver dono. A variant `evento` mostra "Organizado por <título>" com link no lugar do
  texto de `realizador`. Dado: `ServiceDetailData.organizer?: { uid, title, href } | null`; ausente,
  `null` ou erro de rede = comportamento antigo.
- **Vinculados** (filhos): o carrossel de vinculados lista os anúncios ativos que apontam para o
  anúncio aberto por **`local_ref`** (em `extras.local_ref` ou na resposta `local_ref` do formulário,
  com o uid OU o `extras.codigo` dele) ou que têm o `codigo` dele em `extras.tags`. Basta preencher
  `local_ref` (o "Local cadastrado" do evento): o mesmo campo dá o "Onde acontece" no evento e o
  evento na página do lugar; a tag com o código é opcional. Uma chamada só da RPC de busca
  (`p_tags = [codigo]` + `p_local_refs = [uid, codigo]`, search 0009; sem código, só
  `p_local_refs = [uid]`), sem o próprio, sem repetir, eventos futuros primeiro (o mais próximo
  antes). Num banco sem a search 0009 a chamada falha e repete só por tag. Fica ACIMA dos carrosséis
  por tag compartilhada e fora do limite de 2 deles. Título: `extras.vinculosTitulo` ou
  "Vinculados" (num lugar, "Agenda deste local"). O mapeamento `local:` para "Neste local" vale só
  para as tags compartilhadas (convenção antiga).
- **Origem dos campos de referência:** `local_ref`, `pontos_de_venda` e `artistas` são lidos de
  `extras`; vazio ou ausente → das respostas do formulário (`extraFields.answers`, já carregadas
  pela página, sem consulta extra). Helper puro `serviceRefExtras` (`src/shared/service-ref-extras.ts`),
  usado por `fetchLinkedRefs` e pelo fallback editorial do consumidor.
- **Pontos de venda (`pontos_de_venda`):** cada item é `{ nome, link? }` (string pura também vale):
  `nome` = `extras.codigo` de um lugar ou texto livre; `link` = URL de compra do ingresso naquele
  ponto. `fetchLinkedRefs` devolve `ServiceSalePoint { label, venue, link? }` (o `link` segue como
  veio, sem validar). A variant `evento` mostra "Onde comprar" como grupo de cards: lugar (foto, título,
  cidade; link para a página dele se `venue`, texto se não) e, com `link` http(s) válido
  (`safeHttpUrl`), o botão "Bora comprar ingresso" (nova aba, `noopener noreferrer`, mesmo rastreio
  `TrackedContactLink`). O `link_ingresso` geral nunca vira botão por ponto. No "Onde acontece"
  (`VenueCard`), `venue.cityName` nulo cai na cidade do `answers.endereco` ("…, Cidade/UF").
- **Unicidade:** o `codigo` é único entre os anúncios não arquivados, no banco todo (índice UNIQUE
  parcial `services_extras_codigo_uniq`, migração 0012; global porque a busca do organizador e o
  carrossel de vinculados não filtram por tenant). Um segundo anúncio não consegue tomar um código
  que já existe; anúncio arquivado pode repetir. Anúncio pausado ou arquivado não é achado como
  organizador: o link some e o texto volta.
- **Link:** `/<cidade>/anuncio/<uid>` com a cidade do anúncio se o endereço do organizador for da
  mesma cidade; senão cidade e UF do endereço dele; senão `/anuncios/<uid>`, que redireciona.
- **Índice:** btree parcial `services_extras_codigo` sobre `(extras->>'codigo')`, restrito a
  `active AND status = 'active' AND (extras->>'codigo') IS NOT NULL` (migração 0011). A igualdade
  implica o `IS NOT NULL`, então a consulta usa o índice (conferido com EXPLAIN em 50 mil anúncios).
- **Índice de `local_ref`:** btree parcial `services_extras_local_ref` sobre
  `(extras->>'local_ref')` nos anúncios publicados (migração 0014); a resposta do formulário usa o
  GIN `form_results_answers_gin` (`answers @> {"local_ref": ...}`).
- **Custo:** 1 consulta a mais por página de detalhe, só quando o anúncio tem tags (mais 1 pelos
  endereços do organizador quando ele é achado) e 1 chamada da RPC de busca para os vinculados (com
  limite de 8 cards), em toda página de detalhe. Entram no mesmo cache da página.

### Permissão `services.link` e validação no banco (migração 0012)

Código e vínculos mudam o que aparece nas páginas dos outros anúncios, então escrever
`extras.codigo`, `extras.tags` e `extras.vinculosTitulo` exige a permissão `services.link`
("Definir código e vínculos do anúncio"):

- **Quem pode hoje:** root (o `fun_auth_has_perm` já libera root) e sessões de sistema, ou seja,
  importação e robôs que rodam como superusuário sem JWT (sem `user_id`). Papel `anon`/`auth_user`
  sem usuário não passa. A migração NÃO concede a permissão a nenhum papel.
- **Conceder depois, sem código:** no painel de acesso (RBAC), marque `services` / `link` no papel ou
  no usuário; ela entra no `perms` do JWT no próximo login. A seção "Vínculos" do wizard aparece
  para quem a tem (`user.hasPerm('services', 'link')`); sem ela o passo some e o payload nunca leva
  essas chaves.
- **Onde é barrado:** trigger `trg_services_extras_links_guard` em `public.services` (BEFORE INSERT
  OR UPDATE OF extras). Compara cada chave com o valor antigo (ausente, `null`, texto vazio e `[]`
  contam como vazio). Mudou sem permissão: erro `42501`. Reenviar os mesmos valores, como faz o
  wizard ao mesclar `extras`, e editar outras colunas ou chaves passa normalmente.
- **Formato (vale para todos, inclusive root e sistema; erro `22023`):** `codigo` com
  `[a-z0-9][a-z0-9._-]{0,59}`; `tags` lista de até 10 itens, cada um `[a-z0-9][a-z0-9:._-]{0,59}`;
  `vinculosTitulo` texto de até 60 caracteres. Só o valor que mudou é validado, então dado antigo
  fora do padrão não trava edições não relacionadas. As mesmas regras estão em
  `src/shared/service-tags.ts` (`CODIGO_PATTERN`, `TAG_PATTERN`) e validam o formulário.
- **Unicidade:** ver acima. Se a migração achar `codigo` repetido, não cria o índice: emite um
  WARNING com a consulta para listar os repetidos. Depois de corrigir, EXECUTE O ARQUIVO DE NOVO
  (`db migrate` não o reexecuta, a versão do plugin já foi atualizada); o `pendentes_services_tags.sql`
  termina com um SELECT que mostra se o índice existe.
- **Efeito da concessão:** conceder `services.link` só vale depois que o usuário renovar o token
  (as permissões são lidas do JWT): novo login ou renovação da sessão.
- **Regra para código futuro:** nenhuma RPC SECURITY DEFINER exposta a `anon`/`auth_user` pode copiar
  `codigo`, `tags` ou `vinculosTitulo` de entrada do usuário para `services.extras`: dentro de uma
  função SECURITY DEFINER a sessão é de sistema e o trigger deixaria passar.
- **Outros caminhos que gravam `extras`:** moderação (`fn_service_moderate`) só muda `status`;
  likes só `like_count`; revisão por IA só `description`; exclusão de conta só `active`: nenhum
  dispara o trigger. O wizard lê e mescla `extras` inteiro, preservando as chaves.

## Moderação

`fn_service_moderate` insere a decisão em `service_moderations` e deriva `services.status`
(`approved` → `active`, `rejected` → `archived`, `escalated` → `pending`). Exige a permissão
`services:moderate`.

## Políticas das demais tabelas

* `services`: leitura pública dos publicados (`anon`); dono ou moderador leem e atualizam os seus.
* `service_categories_sub`: leitura aberta; escrita só do dono do serviço.
* `service_moderations`: leitura por quem tem `services:moderate` (ou conforme `sm_read`); escrita
  só pela RPC.
