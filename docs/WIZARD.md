# Wizard engine

Engine genérica para fluxos multi-step config-driven que persistem parcialmente contra **um**
recurso PostgREST. Não sabe nada de domínio ("serviço", "anúncio"…) — o domínio entra pelos
steps e pelo `registry`.

- Código: `src/client/components/wizard/`
- Export: `@kizuna/core/client/components/wizard`
- Steps de domínio do marketplace de serviços: `@kizuna/core/client/components/services`
  (`SERVICE_WIZARD_STEPS`) — ver `docs/PLUGINS.md` (plugin `services`).

## O que o core exporta

`Wizard`, `defineWizard`, `useWizardState`, `resolveSteps`, `applyAssistPatch`,
`createResourcePersister` + os tipos `WizardStep`, `WizardStepProps`, `WizardStepContext`,
`WizardConfig`, `WizardMode` (`'create' | 'edit' | 'review'`), `WizardEntities`,
`WizardAssistant`.

## Contrato de step (`WizardStep<S>`)

`S` é o estado acumulado do wizard (form values, flat).

| Campo         | Tipo                                             | Papel |
| ------------- | ----------------------------------------------- | ----- |
| `key`         | `string`                                        | Identificador estável (`'start'`, `'category'`, `'garantia'`…). Chave no `registry` e no rail. |
| `label`       | `string`                                        | Rótulo no rail / top bar. |
| `Component`   | `ComponentType<WizardStepProps<S>>`             | **Puro** — renderiza a partir de `state`/`entities`, escreve via `patch`. Nunca faz `fetch` (exceção herdada: um image-manager injetado). |
| `required?`   | `boolean` (default `true`)                      | `false` ⇒ o step pode ser pulado sem travar o "Continuar". |
| `enabled?`    | `boolean \| (ctx) => boolean` (default `true`)  | `false` ⇒ o step some do fluxo (ex.: `moderation` só em `mode === 'review'`; `dynamic-form` só se a categoria tem `formKey`). |
| `canContinue?`| `(ctx) => boolean` (default `() => true`)       | Habilita o botão de avanço. |
| `persist?`    | `(ctx) => Promise<void>`                        | Roda ao avançar. Deve `throw` em falha (a engine barra a navegação). Default: no-op. |
| `assist?`     | `boolean`                                       | Step exibe o affordance de IA — só se `ctx.assist` existir. |

### `WizardStepContext<S>` (o que o `Component` recebe)

| Campo        | Descrição |
| ------------ | --------- |
| `state`      | Estado acumulado (`S`). |
| `patch(p)`   | Merge parcial em `state`. Marca as chaves como "touched". |
| `persist(overrides)` | Read-merge-write contra o recurso. **Chaves = nomes de coluna do recurso**, não chaves de `state`. Retorna `{ ok }`. |
| `persistExtras(partial)` | Read-merge-write só do jsonb `extras` da linha. |
| `entities`   | Dados server-side pré-carregados pela página (`WizardEntities`). Steps nunca fazem fetch. |
| `resourceId` | Id da linha (`string | number | null` — `null` antes do 1º `persist`). |
| `mode`       | `'create' | 'edit' | 'review'`. |
| `touched`    | `ReadonlySet<keyof S>` — chaves já editadas pelo usuário. |
| `assist?`    | `WizardAssistant` — presente só se o consumidor passou um adapter. |

## `defineWizard(config)`

Valida e devolve o `WizardConfig` (checa keys duplicadas e âncoras `after`/`before`
inexistentes). Campos:

| Campo               | Descrição |
| ------------------- | --------- |
| `resource`          | Chave do `postgrestResources` — o único recurso que o wizard escreve. |
| `steps`             | Lista. Cada item é uma **string** (resolve no `registry`) ou um **`WizardStep`** custom. Um custom pode trazer `after: 'price'` / `before: 'description'` para se posicionar relativo a outro step; sem âncora, entra na posição em que aparece na lista. |
| `registry`          | `Record<string, WizardStep<S>>` — os steps nomeáveis por string (ex.: `SERVICE_WIZARD_STEPS`). |
| `disable`           | `string[]` — remove steps registrados sem editar `steps` (equivale a `enabled: false`). |
| `assistant`         | `WizardAssistant \| (() => WizardAssistant)`. **Ausente ⇒ wizard 100% manual**, nenhum affordance de IA aparece. |
| `finishHrefByMode`  | `Partial<Record<WizardMode, string>>` — para onde "Concluir"/"Cancelar" volta em cada modo. |

A engine resolve a lista final em runtime (`resolveSteps`): aplica `disable`, resolve as
posições `after`/`before`, avalia `enabled(ctx)`.

### Exemplo

```ts
import { defineWizard } from '@kizuna/core/client/components/wizard';
import { SERVICE_WIZARD_STEPS } from '@kizuna/core/client/components/services';
import { AdImagesManager } from '@/components/ads/ad-images-manager';
import { StepImages } from '@kizuna/core/client/components/services';

export const servicoWizard = defineWizard({
  resource: 'services',
  registry: {
    ...SERVICE_WIZARD_STEPS,
    // `images` precisa do image-manager do app injetado:
    images: {
      ...SERVICE_WIZARD_STEPS.images,
      Component: (p) => <StepImages {...p} ImagesManager={AdImagesManager} />,
    },
  },
  steps: [
    'start', 'category', 'location', 'price', 'images', 'description',
    'dynamic-form',   // condicional — enabled() checa o formKey da categoria
    'moderation',     // enabled() só true em mode 'review'
    { key: 'garantia', label: 'Garantia', Component: StepGarantia, required: false, after: 'price' },
  ],
  disable: ['location'],
  finishHrefByMode: {
    create: '/painel/meus-servicos',
    review: '/painel/administracao/aprovacoes',
  },
});
```

A página (`page.tsx`) carrega `entities` server-side e renderiza
`<Wizard config={servicoWizard} mode={...} entities={...} initialState={...}
initialResourceId={...} initialRecord={...} />`. `useWizardState` é o hook por trás — use
direto só para um shell customizado.

## Modelo de persistência (read-merge-write)

O `mapInput` do recurso é uma projeção snake-only que **reconstrói toda coluna**. Salvar só
`{ title }` num step resetaria `status`/`active`/`extras`. Por isso:

- `createResourcePersister({ resource, resourceId, onError, onId })` guarda um **`baseline`**
  (a última linha carregada/retornada).
- Em `mode` `edit`/`review` a página passa `initialRecord` — a engine chama
  `persister.setBaseline(initialRecord)` para hidratar o baseline antes do 1º step.
- Cada `step.persist(ctx)` chama `ctx.persist({ ...colunas desse step })`. A engine envia
  `submitResource({ ...baseline, ...overrides })` e atualiza o `baseline` com o retorno.
- No 1º `persist` sem id (create) a linha nasce e `resourceId` passa a valer para os steps
  seguintes.
- `ctx.persistExtras(partial)` faz o mesmo só para o jsonb `extras` (merge sobre
  `baseline.extras`).

Um step custom nunca precisa saber desse detalhe — só chama `ctx.patch()` e declara `persist`.

## Chrome — "layout-foco"

Sem `fixed inset-0` / lock de `body.overflow`, sem toggle de maximizar. O wizard renderiza
num container normal no fluxo do documento:

- **Top bar** slim: label do modo ("Novo serviço" / "Editar" / "Revisão") + **"Cancelar"**
  (volta para `finishHrefByMode[mode]` ou `/painel`).
- Grid `md:grid-cols-[13rem_1fr]`: **rail** (steps clicáveis até o `furthestStep`) + summary
  opcional à esquerda, step ativo à direita (`key={currentStep}` + animação `.wz-step-in`).
- **Bottom bar** sticky: "Voltar" (`invisible` no passo 1), "Continuar" / "Salvar e
  continuar", "Concluir" no último.
- O header padrão do painel fica escondido enquanto a rota é de wizard (via `isAdWizardRoute`
  no `panel-shell`), mas sem `position: fixed`.
- Outlines de card ativo via `.wz-selectable` / `.wz-disc-current` no `globals.css` do core
  (utilitários `border-*` do Tailwind estão mortos no projeto — ver memória
  `tailwind-border-color-unlayered`).

## Slot de IA (`WizardAssistant`)

Contrato **congelado** (também implementado pelo plugin `ai_assistant`):

```ts
interface WizardAssistant {
  suggest(input: { userText: string; state: Record<string, unknown>; stepKey: string }):
    Promise<{ message: string; needsMore: boolean; patch: Record<string, unknown> }>;
  status: 'ready' | 'degraded' | 'unavailable';
  retry?: () => void;
}
```

- `assistant` ausente ⇒ wizard 100% manual.
- Presente ⇒ steps com `assist: true` ganham o affordance. O adapter só devolve o `patch`;
  a engine decide o que aceitar via `applyAssistPatch` (preenche só campos vazios/intocados —
  respeita `touched`).
- Degradação (`status: 'unavailable'` sticky) é responsabilidade do adapter; a engine só
  reage escondendo o botão.
