/**
 * Pure validation + visibility evaluation for a `FormSchema` (no React).
 *
 * The template shipped `FieldValidation` in the model and rendered its config
 * in `FieldEditor` but never enforced it — this closes that gap.
 */

import {
  NON_VALUE_TYPES,
  fieldKey,
  type FormField,
  type FormSchema,
  type FormValues,
  type VisibleWhen,
} from './types';

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isNaN(value) ? null : value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

/** Evaluate a single `visibleWhen` rule against the current values. */
export function evalVisibleWhen(rule: VisibleWhen, values: FormValues): boolean {
  const current = values[rule.field];
  switch (rule.op) {
    case 'truthy':
      return Boolean(current) && !(Array.isArray(current) && current.length === 0);
    case 'eq':
      return current === rule.value;
    case 'ne':
      return current !== rule.value;
    case 'in': {
      const set = Array.isArray(rule.value) ? rule.value : [rule.value];
      if (Array.isArray(current)) return current.some((c) => set.includes(c));
      return set.includes(current);
    }
    case 'gt': {
      const a = toNumber(current);
      const b = toNumber(rule.value);
      return a !== null && b !== null && a > b;
    }
    case 'lt': {
      const a = toNumber(current);
      const b = toNumber(rule.value);
      return a !== null && b !== null && a < b;
    }
    default:
      return true;
  }
}

/** Whether a field is currently visible (respects `behavior.hidden` + `visibleWhen`). */
export function isFieldVisible(field: FormField, values: FormValues): boolean {
  if (field.behavior.hidden) return false;
  if (field.visibleWhen && field.visibleWhen.field) {
    return evalVisibleWhen(field.visibleWhen, values);
  }
  return true;
}

/**
 * Build the flat output object for a schema: `{ [field.key]: value }` for every
 * **visible**, value-holding field that currently has a value. Layout fields and
 * hidden/conditionally-hidden fields never appear.
 */
export function collectOutput(schema: FormSchema, values: FormValues): FormValues {
  const out: FormValues = {};
  for (const field of schema.fields) {
    if (NON_VALUE_TYPES.has(field.type)) continue;
    if (!isFieldVisible(field, values)) continue;
    const key = fieldKey(field);
    const value = values[key];
    if (value === undefined) continue;
    out[key] = value;
  }
  return out;
}

/**
 * Validate a schema against values. Returns `{ [field.key]: message }`, empty
 * when valid. Only **visible**, value-holding fields are checked — a hidden
 * required field never blocks submit.
 */
export function validate(schema: FormSchema, values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of schema.fields) {
    if (NON_VALUE_TYPES.has(field.type)) continue;
    if (!isFieldVisible(field, values)) continue;

    const key = fieldKey(field);
    const value = values[key];
    const custom = field.validation.message;
    const fail = (fallback: string) => {
      errors[key] = custom || fallback;
    };

    if (field.behavior.required) {
      const emptyForRequired =
        field.type === 'checkbox' || field.type === 'switch' ? !value : isEmpty(value);
      if (emptyForRequired) {
        fail('Campo obrigatório.');
        continue;
      }
    }

    if (isEmpty(value)) continue;

    const { minLength, maxLength, min, max, regex } = field.validation;

    if (typeof value === 'string') {
      if (minLength != null && value.length < minLength) {
        fail(`Mínimo de ${minLength} caracteres.`);
        continue;
      }
      if (maxLength != null && value.length > maxLength) {
        fail(`Máximo de ${maxLength} caracteres.`);
        continue;
      }
    }

    const numeric = toNumber(value);
    if (numeric !== null) {
      if (min != null && numeric < min) {
        fail(`Valor mínimo: ${min}.`);
        continue;
      }
      if (max != null && numeric > max) {
        fail(`Valor máximo: ${max}.`);
        continue;
      }
    }

    if (regex) {
      try {
        if (!new RegExp(regex).test(String(value))) {
          fail('Formato inválido.');
          continue;
        }
      } catch {
        /* invalid author regex — ignore */
      }
    }
  }

  return errors;
}
