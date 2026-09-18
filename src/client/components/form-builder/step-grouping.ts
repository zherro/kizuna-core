import { NON_VALUE_TYPES, type FormField } from './types';

export type StepGroupingOptions = {
  /** `radio`/`multiselect` fields with at most this many options are "compact" enough to
   *  share a step with another compact field. Default 6. */
  compactMaxOptions?: number;
  /** How many compact fields can share one step. Default 2. */
  maxCompactPerStep?: number;
};

const COMPACT_TYPES = new Set<FormField['type']>(['radio', 'multiselect']);

function isCompact(field: FormField, compactMaxOptions: number): boolean {
  return COMPACT_TYPES.has(field.type) && (field.options?.length ?? 0) <= compactMaxOptions;
}

/**
 * Paginate a flat `FormField[]` into steps for a one-screen-at-a-time questionnaire, without any
 * new schema metadata (admin never marks "these two fields share a step" by hand — there's no
 * such field in `FormField`). The grouping is purely structural: consecutive `radio`/`multiselect`
 * fields with few options ("chip" fields — cheap to answer, don't need their own screen) bundle
 * together up to `maxCompactPerStep`; anything else (text, textarea, larger option lists, layout
 * fields) gets its own step. Layout-only fields (`NON_VALUE_TYPES`) attach to the step of the
 * next value-holding field instead of getting a step of their own.
 */
export function groupFieldsIntoSteps(
  fields: FormField[],
  options: StepGroupingOptions = {}
): FormField[][] {
  const compactMaxOptions = options.compactMaxOptions ?? 6;
  const maxCompactPerStep = options.maxCompactPerStep ?? 2;

  const steps: FormField[][] = [];
  let pendingLayout: FormField[] = [];
  let currentCompact: FormField[] = [];

  const flushCompact = () => {
    if (currentCompact.length === 0) return;
    steps.push(currentCompact);
    currentCompact = [];
  };

  for (const field of fields) {
    if (NON_VALUE_TYPES.has(field.type)) {
      pendingLayout.push(field);
      continue;
    }

    if (isCompact(field, compactMaxOptions) && currentCompact.length < maxCompactPerStep) {
      currentCompact.push(...pendingLayout, field);
      pendingLayout = [];
      continue;
    }

    flushCompact();
    steps.push([...pendingLayout, field]);
    pendingLayout = [];
  }

  flushCompact();
  if (pendingLayout.length > 0) steps.push(pendingLayout);

  return steps;
}
