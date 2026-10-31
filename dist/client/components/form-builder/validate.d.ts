/**
 * Pure validation + visibility evaluation for a `FormSchema` (no React).
 *
 * The template shipped `FieldValidation` in the model and rendered its config
 * in `FieldEditor` but never enforced it — this closes that gap.
 */
import { type FormField, type FormSchema, type FormValues, type VisibleWhen } from './types';
/** Evaluate a single `visibleWhen` rule against the current values. */
export declare function evalVisibleWhen(rule: VisibleWhen, values: FormValues): boolean;
/** Whether a field is currently visible (respects `behavior.hidden` + `visibleWhen`). */
export declare function isFieldVisible(field: FormField, values: FormValues): boolean;
/**
 * Build the flat output object for a schema: `{ [field.key]: value }` for every
 * **visible**, value-holding field that currently has a value. Layout fields and
 * hidden/conditionally-hidden fields never appear.
 */
export declare function collectOutput(schema: FormSchema, values: FormValues): FormValues;
/**
 * Validate a schema against values. Returns `{ [field.key]: message }`, empty
 * when valid. Only **visible**, value-holding fields are checked — a hidden
 * required field never blocks submit.
 */
export declare function validate(schema: FormSchema, values: FormValues): Record<string, string>;
//# sourceMappingURL=validate.d.ts.map