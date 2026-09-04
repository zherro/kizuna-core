# Showcase registration — form-builder

The 3 shared showcase files are owned by the parent session. To wire this demo,
append the following.

## 1. `showcase/showcase-sections.ts`

Add to the `ShowcaseSectionId` union:

```ts
  | 'form-builder'
```

Append one entry to `SHOWCASE_SECTIONS`:

```ts
{
  id: 'form-builder',
  groupId: 'ui-better-soft',
  label: 'Form Builder',
  description:
    'Engine de formulários: FormBuilder (editor visual) + FormRenderer + FormResultViewer, com key obrigatória, visibilidade condicional e opções vindas de um recurso.',
  usageCode: `import { useState } from 'react';
import {
  FormBuilder,
  FormRenderer,
  FormResultViewer,
  type FormSchema,
  type FormValues,
} from '../form-builder';

export function FormEngineExample() {
  const [schema, setSchema] = useState<FormSchema>({
    title: 'Novo formulário',
    fields: [],
  });
  const [values, setValues] = useState<FormValues>({});

  return (
    <>
      <FormBuilder value={schema} onChange={setSchema} />
      <FormRenderer
        schema={schema}
        values={values}
        onChange={setValues}
        onSubmit={(output) => console.log(output)}
      />
      <FormResultViewer schema={schema} values={values} />
    </>
  );
}`,
},
```

## 2. `showcase/showcase-section-page.tsx`

Import (single line, alongside the other component imports):

```ts
import { FormBuilderShowcaseDemo } from '../form-builder/showcase-demo';
```

Add one branch inside `SectionDemo` (before the final `return <UiBetterSoftDemo />`):

```ts
if (sectionId === 'form-builder') return <FormBuilderShowcaseDemo />;
```

## 3. Lucide icon

`FileInput` (for any nav/menu entry that needs an icon for this section).

## Demo component

- File: `src/client/components/form-builder/showcase-demo.tsx`
- Export: `FormBuilderShowcaseDemo` (also re-exported from `../form-builder`)
- Renders `FormBuilder` + a standalone `FormRenderer` (with `onSubmit`) + `FormResultViewer`
  round-tripping one `FormSchema` that exercises a required text field with icon+tooltip,
  a static `select`, a `visibleWhen` conditional text field, a `slider`, and a `switch`.
