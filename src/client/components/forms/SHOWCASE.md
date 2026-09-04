# Showcase wiring — `forms` plugin

The 3 shared showcase files are owned by the parent session (3 parallel plugin agents race on
them). Register this section there:

## `showcase-sections.ts`

- Add to `ShowcaseSectionId` union: `'forms-manager'`
- Append to `SHOWCASE_SECTIONS`:

```ts
{
  id: 'forms-manager',
  groupId: 'ui-better-soft',
  label: 'Forms manager',
  description:
    'Formularios reutilizaveis: FormBuilder -> FormRenderer + validate() -> FormResultViewer. Base do passo dinamico do wizard de servicos e da tela /painel/administracao/formularios.',
  usageCode: `import { FormsAdmin } from '../forms';
import { DynamicFormStep, type DynamicFormStepHandle } from '../forms';

// Admin: gerencia forms (metadados + schema via FormBuilder)
<FormsAdmin />

// Wizard: passo dinamico por categoria (category.form_key)
const ref = useRef<DynamicFormStepHandle>(null);
<DynamicFormStep
  ref={ref}
  formKey={category.formKey}
  domain="service"
  referenceId={String(service.id)}
  onValidChange={setStepValid}
/>
// no persist() do wizard: await ref.current?.persist();`,
},
```

## `showcase-section-page.tsx`

- Import: `import { FormsShowcaseDemo } from '../forms/showcase-demo';`
- Add dispatch line: `if (sectionId === 'forms-manager') return <FormsShowcaseDemo />;`

## `showcase-shell.tsx`

- Lucide icon suggestion: `ClipboardList` (or `FormInput`).

Demo component: `FormsShowcaseDemo` in `src/client/components/forms/showcase-demo.tsx`
(fully backend-free — `FormsAdmin` / `DynamicFormStep` need the resource route + RPC so the demo
exercises the underlying `FormBuilder`/`FormRenderer`/`FormResultViewer`/`validate` round-trip).
