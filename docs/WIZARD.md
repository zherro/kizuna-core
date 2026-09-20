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
`createResourcePersister`, `WizardShell`, `WizardScrollShell`, `WizardLayoutToggle`,
`useWizardLayout`, `WizardLayoutContext`, `layoutStorageKey` / `readStoredLayout` /
`writeStoredLayout` / `isWizardLayout` / `WIZARD_LAYOUTS` + os tipos `WizardStep`,
`WizardStepProps`, `WizardStepContext`, `WizardConfig`, `WizardMode`
(`'create' | 'edit' | 'review'`), `WizardEntities`, `WizardAssistant`,
`WizardLayout` (`'stepper' | 'scroll'`).

## Contrato de step (`WizardStep<S>`)

`S` é o estado acumulado do wizard (form values, flat).

| Campo          | Tipo                                           | Papel                                                                                                                                     |
| -------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `key`          | `string`                                       | Identificador estável (`'start'`, `'category'`, `'garantia'`…). Chave no `registry` e no rail.                                            |
| `label`        | `string`                                       | Rótulo no rail / top bar.                                                                                                                 |
| `Component`    | `ComponentType<WizardStepProps<S>>`            | **Puro** — renderiza a partir de `state`/`entities`, escreve via `patch`. Nunca faz `fetch` (exceção herdada: um image-manager injetado). |
| `required?`    | `boolean` (default `true`)                     | `false` ⇒ o step pode ser pulado sem travar o "Continuar".                                                                                |
| `enabled?`     | `boolean \| (ctx) => boolean` (default `true`) | `false` ⇒ o step some do fluxo (ex.: `moderation` só em `mode === 'review'`; `dynamic-form` só se a categoria tem `formKey`).             |
| `canContinue?` | `(ctx) => boolean` (default `() => true`)      | Habilita o botão de avanço.                                                                                                               |
| `persist?`     | `(ctx) => Promise<void>`                       | Roda ao avançar. Deve `throw` em falha (a engine barra a navegação). Default: no-op.                                                      |
| `assist?`      | `boolean`                                      | Step exibe o affordance de IA — só se `ctx.assist` existir.                                                                               |

### `WizardStepContext<S>` (o que o `Component` recebe)

| Campo                    | Descrição                                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------- |
| `state`                  | Estado acumulado (`S`).                                                                                              |
| `patch(p)`               | Merge parcial em `state`. Marca as chaves como "touched".                                                            |
| `persist(overrides)`     | Read-merge-write contra o recurso. **Chaves = nomes de coluna do recurso**, não chaves de `state`. Retorna `{ ok }`. |
| `persistExtras(partial)` | Read-merge-write só do jsonb `extras` da linha.                                                                      |
| `entities`               | Dados server-side pré-carregados pela página (`WizardEntities`). Steps nunca fazem fetch.                            |
| `resourceId`             | Id da linha (`string                                                                                                 | number | null`—`null`antes do 1º`persist`). |
| `mode`                   | `'create'                                                                                                            | 'edit' | 'review'`.                         |
| `touched`                | `ReadonlySet<keyof S>` — chaves já editadas pelo usuário.                                                            |
| `assist?`                | `WizardAssistant` — presente só se o consumidor passou um adapter.                                                   |

## `defineWizard(config)`

Valida e devolve o `WizardConfig` (checa keys duplicadas e âncoras `after`/`before`
inexistentes). Campos:

| Campo              | Descrição                                                                                                                                                                                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `resource`         | Chave do `postgrestResources` — o único recurso que o wizard escreve.                                                                                                                                                                                     |
| `steps`            | Lista. Cada item é uma **string** (resolve no `registry`) ou um **`WizardStep`** custom. Um custom pode trazer `after: 'price'` / `before: 'description'` para se posicionar relativo a outro step; sem âncora, entra na posição em que aparece na lista. |
| `registry`         | `Record<string, WizardStep<S>>` — os steps nomeáveis por string (ex.: `SERVICE_WIZARD_STEPS`).                                                                                                                                                            |
| `disable`          | `string[]` — remove steps registrados sem editar `steps` (equivale a `enabled: false`).                                                                                                                                                                   |
| `assistant`        | `WizardAssistant \| (() => WizardAssistant)`. **Ausente ⇒ wizard 100% manual**, nenhum affordance de IA aparece.                                                                                                                                          |
| `finishHrefByMode` | `Partial<Record<WizardMode, string>>` — para onde "Concluir"/"Cancelar" volta em cada modo.                                                                                                                                                               |

A engine resolve a lista final em runtime (`resolveSteps`): aplica `disable`, resolve as
posições `after`/`before`, avalia `enabled(ctx)`.

### Exemplo

```ts
import { defineWizard } from '@kizuna/core/client/components/wizard';
import { SERVICE_WIZARD_STEPS } from '@kizuna/core/client/components/services';

export const servicoWizard = defineWizard({
  resource: 'services',
  registry: SERVICE_WIZARD_STEPS,
  steps: [
    'start',
    'category',
    'location',
    'price',
    'images',
    'description',
    'dynamic-form', // condicional — enabled() checa o formKey da categoria
    'moderation', // enabled() só true em mode 'review'
    {
      key: 'garantia',
      label: 'Garantia',
      Component: StepGarantia,
      required: false,
      after: 'price',
    },
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
- O header padrão do painel fica escondido enquanto a rota é de wizard (o app consumidor casa a
  rota via um predicado `isFullBleedRoute` no `panel-shell`), mas sem `position: fixed`.
- Outlines de card ativo via `.wz-selectable` / `.wz-disc-current` no `globals.css` do core
  (utilitários `border-*` do Tailwind estão mortos no projeto — ver memória
  `tailwind-border-color-unlayered`).

## Layouts (`stepper` / `scroll`)

A mesma config/steps/state renderiza em dois layouts. É **prop do `<Wizard>`**, não da config, e
é **ortogonal a `WizardMode`** — `WizardMode` é regra de negócio, layout é só apresentação.

```tsx
<Wizard config={servicoWizard} mode="create" variant="scroll" ... />
```

| `variant`             | O quê                                                                                                                                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'stepper'` (default) | O chrome layout-foco acima: um step por vez, Voltar/Continuar, rail.                                                                                                                                |
| `'scroll'`            | Questionário vertical imersivo: os steps respondidos ficam empilhados e editáveis, o próximo aparece quando o atual valida (`canContinue`) e a página desliza até ele. Só **"Concluir"** no rodapé. |

- **Toggle no header** (`WizardLayoutToggle`) troca ao vivo; a escolha é lembrada por recurso em
  `localStorage` na chave `wizard:layout:<resource>`.
- O layout `scroll` vale **só em `create`** — `edit`/`review` sempre usam o `stepper` (o `scroll`
  não tem história de persistir sem avançar). O toggle nem aparece fora de `create`.
- O reveal progressivo é apenas `goContinue()` disparado de um `useEffect` no `WizardScrollShell`
  — o mesmo caminho do botão "Continuar", então `step.persist` roda em cada avanço como sempre.
  `useWizardState` **não muda**.
- Steps que precisam se adaptar ao empilhamento leem `useWizardLayout()` → `{ layout, stacked }`
  (default `{ 'stepper', false }` fora de qualquer shell). Hoje: `StepCategory` não abre o modal
  sozinho quando `stacked`; `StepDescription` esconde o `ServiceConfigSummary` redundante.
- CSS: `.wz-layout-toggle`, `.wz-scroll-step`, `@keyframes wz-scroll-reveal` no `globals.css`
  (core + template, mantidos em sincronia).

## Slot de IA (`WizardAssistant`)

Contrato **congelado** (também implementado pelo plugin `ai_assistant`):

```ts
interface WizardAssistant {
  suggest(input: {
    userText: string;
    state: Record<string, unknown>;
    stepKey: string;
  }): Promise<{ message: string; needsMore: boolean; patch: Record<string, unknown> }>;
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

## Naví conversacional (`WizardConversation`)

Contrato **novo e aditivo** (não mexe no `WizardAssistant` congelado). Troca o botão one-shot por
uma **entrevista passo a passo**: a Naví cuida de UM passo por vez, pergunta, sugere opções em tag,
preenche os campos daquele passo. **Ela nunca avança sozinha** — quando julga o passo pronto
(`advance: 'ask'`) só oferece a tag **"Pode seguir"**; o avanço acontece por ela OU pelo botão
"Continuar"/"Avançar" do rodapé (habilitado quando o passo valida). Ao avançar, abre a 1ª pergunta
do próximo. Camada por cima — vale nos dois layouts, `create`-only por convenção do consumidor.

```ts
interface WizardConversationAdapter {
  converse(input): Promise<{ message; choices; patch; advance: 'ask' | 'hold'; needsMore }>;
  status: 'ready' | 'degraded' | 'unavailable';
  retry?: () => void;
  greeting: string;
}
// input: { userText; turns; state; stepKey; intent: 'reply' | 'confirm-advance' }
```

- `<Wizard conversation={adapter} />` — presente + `status !== 'unavailable'` ⇒ a engine renderiza
  a camada da Naví (`NaviLayer`) e esconde o botão one-shot. `unavailable` ⇒ shell puro. Cair pra
  `unavailable` **no meio** da conversa (`endedMidway`) mostra só um aviso curto, não some seco.
- `useWizardConversation` (interno) é **dono do fio** — `turns`/`choices`/`pending`, anexa turnos,
  aplica `patch` via `applyAssistPatch` (só campos vazios/intocados). Em `advance: 'ask'` **só
  adiciona a tag "Pode seguir"** (`__advance__`) — `pickChoice` dela chama `goContinue()`. Sempre
  que `currentIndex` avança **pra frente** (tag, botão do rodapé ou rail), dispara
  `converse({ intent: 'confirm-advance' })` pro passo novo abrir a 1ª pergunta (`goBack` não
  dispara). Nunca avança sozinha, nunca pula passo. Continua rodando com o dock minimizado.
- `NaviLayer` — a camada **persistente** da Naví: o shell renderiza uma vez, no fim da coluna de
  passos, e ela **acompanha o scroll** (`.wz-navi-dock` = `sticky bottom`), presente em TODOS os
  passos. Estados: `NaviDock` aberto · pílula `wz-navi-fab` (minimizado, com `wz-navi-fab-dot`
  pulsando enquanto pensa) · aviso curto (`endedMidway`).
- `NaviDock`: última fala em destaque + a penúltima desfocada + `NaviComposer` + minimizar +
  Ver conversa. Largura = largura do form (`max-w-2xl`).
- `NaviComposer` (compartilhado dock ↔ painel): label "Sugestões da Naví" + tags (`multi` mostra
  checkbox e acumula → botão "Enviar N", `wz-navi-send` pulsa) + campo livre + validação (enviar
  vazio com opções ⇒ aviso em **vermelho suave**, `.wz-navi-error`).
- `NaviPanel`: fio completo + o mesmo `NaviComposer`. Desktop (`md+`) painel à direita (`w-[420px]`),
  mobile tela cheia. Saudação só com `conv.fresh`.
- `NaviIcon`: ícone com ripple (espelha o `AssistantIcon` da busca).
- No layout `scroll`: passo respondido **colapsa em acordeão** (`.wz-scroll-summary` = `✓` + label
  - chevron; clique reabre o passo inteiro editável); o passo atual fica sempre aberto. Com a
    conversa ativa o auto-reveal fica suprimido (prop `autoReveal`) e o rodapé mostra **"Avançar"**
    por passo (habilitado por `canContinue`) em vez de só "Concluir". Sem o rótulo "Passo N de M".
- Visual: com a conversa ativa os shells recebem `ground="navi"` (wash suave da primária,
  `.wz-navi-ground`); o dock (`.wz-navi-card`) é o elemento vivo da tela. Sair de um cadastro
  **novo** pede confirmação (`window.confirm`); `edit`/`review` não. Os avisos de erro dos shells
  usam `.wz-navi-error-box` (o token `text-destructive` não existe no projeto).
- Cabeçalho único: o `<Wizard>` projeta rótulo do modo (`hidden < sm`) + toggle + IA + Cancelar no
  `<div id="wz-header-slot">` do cabeçalho full-bleed do `PanelShellBase` (via `WizardHeaderPortal`).
  Os shells não têm mais barra `sticky top-0` própria; rodapé é `shrink-0` num flex-column. O
  `WizardLayoutToggle` tem alvo de toque maior no mobile.
- Backend (foco-total): a skill `service-wizard` recebe `passoKey` + `STEP_FIELDS` (allowlist de
  campos por passo); `scopePatchToStep` descarta no servidor tudo fora do passo atual. O prompt
  manda a Naví preencher direto o que consegue deduzir (ex.: categoria) e **gerar a descrição
  sozinha** no passo `description` (sem perguntar, só avisando). Ver `.claude/domains/services.md`.

Exports: `useWizardConversation`, `WizardConversationView`, `NaviLayer`, `NaviDock`, `NaviPanel`,
`NaviComposer`, `NaviIcon`, `WizardHeaderPortal` + os tipos `WizardConversation*`.

## Config por projeto (`kizuna.config.json`)

Cada projeto tem um `kizuna.config.json` na raiz (default em `starter/kizuna.config.json`), com
uma entrada por wizard em `wizards.<nome>`: `resource`, `steps` (chaves do registry), `disable`,
`layout` (`stepper`|`scroll`), `lockLayout` (default `true`: esconde o toggle), `assistant`
(default `false`: não passe `assistant`/`conversation` ao `<Wizard>`) e `finishHrefByMode`.

```tsx
import cfg from '../../../kizuna.config.json';
import { createWizardFromJson, Wizard } from '@kizuna/core/client/components/wizard';

const { config, layoutProps, assistantEnabled } = createWizardFromJson(
  cfg.wizards.servicos,
  SERVICE_WIZARD_STEPS
);
<Wizard config={config} {...layoutProps} mode="create" /* ... */
  assistant={assistantEnabled ? adapter : undefined} />
```

Chave de step inexistente ou layout inválido lançam erro. Steps novos continuam sendo código.
