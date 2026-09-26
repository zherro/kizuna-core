---
description: Form builder do core — FormSchema, tipos de campo, validação, visibilidade condicional, campo repetível list e como as respostas são guardadas.
---

# Formulários dinâmicos

O form builder é o motor de formulários do core (`src/client/components/form-builder/`). Um
formulário é um **`FormSchema`** (JSON) desenhado no editor visual (`FormBuilder`), renderizado por
`FormRenderer`, validado por `validate()` e resumido por `FormResultViewer`. O plugin `forms` guarda
o schema (`forms.schema`, jsonb) e as respostas capturadas (`form_results`) — ver
[Plugins](../plugins/README.md).

| Peça                         | Papel                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `FormBuilder`                | Editor visual do schema (toolbox, propriedades, preview, JSON).                  |
| `FormRenderer`               | Renderiza o schema, mantém o erro por campo e emite `collectOutput()` no submit. |
| `FormResultViewer`           | Mostra as respostas em lista (rótulos do schema) ou JSON.                        |
| `validate` / `collectOutput` | Funções puras (`validate.ts`), sem React.                                        |
| `groupFieldsIntoSteps`       | Pagina os campos em telas para questionários passo a passo.                      |
| `DynamicFormStep`            | Step de wizard (`src/client/components/forms/`) que carrega, valida e persiste.  |

## FormSchema

```ts
type FormSchema = { title: string; description?: string; fields: FormField[] };
```

Cada `FormField` tem, entre outros:

| Propriedade                                       | Descrição                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `id`                                              | Chave interna do React (aleatória). Não vai para as respostas.                        |
| `key`                                             | Chave da resposta. Obrigatória, `^[a-z][a-z0-9_]*$`, única no schema.                 |
| `type`                                            | Um `FieldType` (tabela abaixo).                                                       |
| `label`, `placeholder`, `description`             | Textos exibidos.                                                                      |
| `grid`                                            | Colunas (de 12) por breakpoint: `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, além de `order`. |
| `behavior`                                        | `required`, `readOnly`, `disabled`, `hidden`, `defaultValue`.                         |
| `validation`                                      | `min`, `max`, `minLength`, `maxLength`, `regex`, `message` (mensagem única de erro).  |
| `appearance`                                      | `icon` (nome lucide), `helpText`, `tooltip`.                                          |
| `options` / `optionsSource`                       | Opções estáticas ou vindas de um recurso (ver abaixo).                                |
| `visibleWhen`                                     | Visibilidade condicional (ver abaixo).                                                |
| `min`, `max`, `step`                              | Faixa de `slider` e `rating`.                                                         |
| `itemFields`, `minItems`, `maxItems`, `itemLabel` | Só para `list`.                                                                       |

## Tipos de campo

| Tipo                                                    | Valor da resposta                        | Observações                                                                           |
| ------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `text`, `email`, `url`, `phone`, `password`, `textarea` | `string`                                 |                                                                                       |
| `number`, `decimal`, `currency`                         | `number` (ou `''` se limpo)              | `number` usa passo 1; os demais 0,01.                                                 |
| `date`, `time`, `datetime`                              | `string` (valor do input HTML)           |                                                                                       |
| `select`, `radio`                                       | `string`                                 | Usam `options` ou `optionsSource`.                                                    |
| `multiselect`                                           | `string[]`                               | Idem.                                                                                 |
| `checkbox`, `switch`                                    | `boolean`                                | `required` exige `true`.                                                              |
| `slider`, `rating`                                      | `number`                                 | Usam `min`/`max`/`step`.                                                              |
| `color`                                                 | `string`                                 |                                                                                       |
| `upload`, `image`                                       | nomes de arquivo (`string` / `string[]`) | O renderer só guarda os nomes; o envio do arquivo é responsabilidade de quem consome. |
| `hidden`                                                | qualquer                                 | Não renderiza nada; carrega valor.                                                    |
| `divider`, `heading`, `info`                            | nenhum                                   | Só layout (`NON_VALUE_TYPES`); nunca entram nas respostas.                            |
| `list`                                                  | `Array<Record<string, unknown>>`         | Grupo repetível de sub-campos (ver abaixo).                                           |

## Comportamento, validação e visibilidade

* **Validação** (`validate(schema, values)`): devolve `{ [caminho]: mensagem }` (vazio se válido).
  Só campos **visíveis** que guardam valor são checados; um obrigatório oculto nunca bloqueia. As
  regras são `required`, `minLength`/`maxLength` (texto), `min`/`max` (numérico) e `regex`. Não há
  validação de formato específica para `url`, `date` ou `time` além de `regex`.
* **`visibleWhen`**: `{ field, op, value? }` com `op` em `eq`, `ne`, `in`, `gt`, `lt`, `truthy`.
  `field` é a `key` de outro campo (o editor só oferece campos anteriores). Também vale
  `behavior.hidden`. Campo invisível é ignorado por `validate` e por `collectOutput`.
* **`optionsSource`**: `{ resource, labelField, valueField, filter? }` — as opções de
  `select`/`multiselect`/`radio` são lidas do recurso registrado (`useResourceOptions`), com
  `filter` como fragmentos PostgREST estáticos.
* **`collectOutput(schema, values)`**: objeto plano `{ [key]: valor }` só com campos visíveis que
  têm valor. É o que `FormRenderer` entrega em `onSubmit`.

## Campo repetível `list`

O tipo `list` repete um grupo de sub-campos, uma vez por item — por exemplo as sessões de um
filme. O valor é um array de objetos, um por item, com as chaves dos sub-campos.

| Propriedade         | Descrição                                                                    |
| ------------------- | ---------------------------------------------------------------------------- |
| `itemFields`        | Sub-campos (`FormField[]`). Chaves únicas **dentro** da lista, mesma regex de `key`. |
| `minItems`          | Mínimo de itens.                                                             |
| `maxItems`          | Máximo de itens. Padrão 200 (`DEFAULT_LIST_MAX_ITEMS`).                      |
| `itemLabel`         | Rótulo de cada item (`Sessão` vira "Sessão 1", "Sessão 2"…). Padrão `Item`.  |
| `behavior.required` | Lista obrigatória = pelo menos 1 item preenchido.                            |

Tipos permitidos nos sub-campos: `text`, `textarea`, `number`, `decimal`, `currency`, `date`,
`time`, `datetime`, `phone`, `email`, `url`, `select`, `multiselect`, `radio`, `checkbox`,
`switch`, `hidden`. **Não** é permitido `list` aninhado, nem `divider`/`heading`/`info`/`upload`/
`image` (o motor descarta sub-campos de tipo proibido e o editor sinaliza o erro).

### Exemplo (sessões de cinema)

```json
{
  "id": "f_sessoes",
  "key": "sessoes",
  "name": "sessoes",
  "type": "list",
  "label": "Sessões",
  "grid": { "xs": 12 },
  "behavior": { "required": true },
  "validation": {},
  "appearance": {},
  "itemLabel": "Sessão",
  "minItems": 1,
  "maxItems": 60,
  "itemFields": [
    { "id": "s_data", "key": "data", "name": "data", "type": "date", "label": "Data",
      "grid": { "xs": 12, "md": 4 }, "behavior": { "required": true }, "validation": {}, "appearance": {} },
    { "id": "s_horario", "key": "horario", "name": "horario", "type": "time", "label": "Horário",
      "grid": { "xs": 12, "md": 4 }, "behavior": { "required": true }, "validation": {}, "appearance": {} },
    { "id": "s_preco", "key": "preco", "name": "preco", "type": "currency", "label": "Preço",
      "grid": { "xs": 12, "md": 4 }, "behavior": {}, "validation": { "min": 0 }, "appearance": {} },
    { "id": "s_sala", "key": "sala", "name": "sala", "type": "text", "label": "Sala",
      "grid": { "xs": 12, "md": 4 }, "behavior": {}, "validation": { "maxLength": 20 }, "appearance": {} },
    { "id": "s_tipo", "key": "tipo", "name": "tipo", "type": "select", "label": "Tipo",
      "grid": { "xs": 12, "md": 4 }, "behavior": {}, "validation": {}, "appearance": {},
      "options": [
        { "label": "Dublado", "value": "dublado" },
        { "label": "Legendado", "value": "legendado" },
        { "label": "3D", "value": "3d" }
      ] },
    { "id": "s_url", "key": "url_compra", "name": "url_compra", "type": "url", "label": "Link de compra",
      "grid": { "xs": 12, "md": 4 }, "behavior": {}, "validation": { "regex": "^https?://" }, "appearance": {} }
  ]
}
```

Respostas correspondentes:

```json
{
  "sessoes": [
    { "data": "2026-10-01", "horario": "19:30", "preco": 32, "sala": "3", "tipo": "legendado", "url_compra": "https://exemplo.com/ingresso" },
    { "data": "2026-10-01", "horario": "21:45", "tipo": "dublado" }
  ]
}
```

### Regras de validação e saída

* **Erros por caminho**: o mapa de `validate` continua plano (`Record<string, string>`), então nada
  muda para campos comuns. Um erro de célula usa a chave `campo[índice].sub` (ex.:
  `sessoes[1].horario`); um erro da lista em si (obrigatória, mínimo, máximo) usa a chave do campo
  (`sessoes`). O `FormRenderer` mostra cada mensagem na célula certa. Para montar a chave, use
  `listErrorKey(listKey, index, subKey)`.
* Cada item é validado com as regras dos seus sub-campos (`required`, `min`/`max`,
  `minLength`/`maxLength`, `regex`, `validation.message`). `visibleWhen` só existe no nível raiz;
  sub-campos usam apenas `behavior.hidden`.
* **Linhas em branco** (nenhum sub-campo com valor; `false` conta como vazio) são ignoradas na
  validação e descartadas por `collectOutput`.
* **`collectOutput`** devolve o array só com as chaves dos sub-campos, omitindo sub-campos ocultos
  e valores `undefined`, `null` ou `''`.
* **Renderer**: cada item é um cartão com os sub-campos no mesmo grid responsivo; há botões de
  adicionar (desabilitado ao atingir `maxItems`), remover e subir/descer. Com `behavior.readOnly`
  ou `behavior.disabled` na lista, adicionar/remover/reordenar somem e os campos ficam
  desabilitados. A lista sempre ocupa a linha inteira do grid.
* **Editor** (`FieldEditor`): ao escolher `Lista repetível`, a seção "Itens da lista" edita rótulo,
  mínimo/máximo e os sub-campos (adicionar, remover, reordenar; `key`, `label`, tipo, obrigatório e
  opções). `collectKeyIssues` valida as chaves dos sub-campos (vazia, formato, duplicada dentro da
  lista, tipo proibido) e bloqueia o salvamento como nos campos comuns.
* **Resultados** (`FormResultViewer`): a lista aparece como tabela, com os rótulos dos sub-campos
  como cabeçalho.
* **Passo a passo** (`groupFieldsIntoSteps`): `list` nunca é "compacto"; ocupa uma tela própria e
  encerra o agrupamento de campos compactos em andamento.

## Respostas e versionamento

* As respostas são o objeto plano de `collectOutput`: `{ [key]: valor }`. Em `form_results.answers`
  (jsonb) ficam exatamente assim; um `list` é um array de objetos, sem tratamento especial —
  `useFormAnswers` envia `p_answers` para `fn_form_result_upsert` como JSON, então arrays de
  objetos passam sem mudança.
* `forms.version` sobe sozinha (trigger) sempre que `forms.schema` muda.
* Ao gravar, `fn_form_result_upsert` copia o schema vigente e a versão para
  `form_results.schema_snapshot` / `form_results.version`. Assim uma resposta antiga continua
  legível mesmo que o formulário mude depois — `itemFields` faz parte do schema e, portanto, do
  snapshot. `DynamicFormStep` prefere o `schema_snapshot` de uma captura existente ao schema atual.
* Em `answers->'sessoes'` dá para consultar a lista com operadores jsonb (por exemplo
  `jsonb_array_elements`).
