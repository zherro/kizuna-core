/**
 * Pure validation + visibility evaluation for a `FormSchema` (no React).
 *
 * The template shipped `FieldValidation` in the model and rendered its config
 * in `FieldEditor` but never enforced it — this closes that gap.
 */

import {
  DEFAULT_LIST_MAX_ITEMS,
  NON_VALUE_TYPES,
  fieldKey,
  listErrorKey,
  resolveItemFields,
  type ListItem,
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

/** A list item value is "blank" when nothing meaningful was entered (`false` counts as blank). */
function isBlankCell(value: unknown): boolean {
  return isEmpty(value) || value === false;
}

function isBlankItem(item: unknown, subs: FormField[]): boolean {
  if (!item || typeof item !== 'object') return true;
  const rec = item as Record<string, unknown>;
  return subs.every((s) => isBlankCell(rec[fieldKey(s)]));
}

function listItems(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Clean a `list` value: only sub-field keys, no hidden/null cells, no blank rows. */
function collectList(field: FormField, value: unknown): ListItem[] {
  const subs = resolveItemFields(field).filter((s) => !s.behavior.hidden);
  const rows: ListItem[] = [];
  for (const item of listItems(value)) {
    if (isBlankItem(item, subs)) continue;
    const rec = item as Record<string, unknown>;
    const row: ListItem = {};
    for (const sub of subs) {
      const k = fieldKey(sub);
      const v = rec[k];
      if (v === undefined || v === null || v === '') continue;
      row[k] = v;
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Build the output object for a schema: `{ [field.key]: value }` for every
 * **visible**, value-holding field that currently has a value. Layout fields and
 * hidden/conditionally-hidden fields never appear. A `list` field yields an array
 * of `{ [subKey]: value }` (see `collectList`).
 */
export function collectOutput(schema: FormSchema, values: FormValues): FormValues {
  const out: FormValues = {};
  for (const field of schema.fields) {
    if (NON_VALUE_TYPES.has(field.type)) continue;
    if (!isFieldVisible(field, values)) continue;
    const key = fieldKey(field);
    const value = values[key];
    if (value === undefined) continue;
    out[key] = field.type === 'list' ? collectList(field, value) : value;
  }
  return out;
}

/** Validate one scalar value against its field rules. Returns the message or `null`. */
function checkValue(field: FormField, value: unknown): string | null {
  const custom = field.validation.message;
  const fail = (fallback: string) => custom || fallback;

  if (field.behavior.required) {
    const emptyForRequired =
      field.type === 'checkbox' || field.type === 'switch' ? !value : isEmpty(value);
    if (emptyForRequired) return fail('Campo obrigatório.');
  }

  if (isEmpty(value)) return null;

  const { minLength, maxLength, min, max, regex } = field.validation;

  if (typeof value === 'string') {
    if (minLength != null && value.length < minLength) return fail(`Mínimo de ${minLength} caracteres.`);
    if (maxLength != null && value.length > maxLength) return fail(`Máximo de ${maxLength} caracteres.`);
  }

  const numeric = toNumber(value);
  if (numeric !== null) {
    if (min != null && numeric < min) return fail(`Valor mínimo: ${min}.`);
    if (max != null && numeric > max) return fail(`Valor máximo: ${max}.`);
  }

  if (regex) {
    try {
      if (!new RegExp(regex).test(String(value))) return fail('Formato inválido.');
    } catch {
      /* invalid author regex — ignore */
    }
  }
  return null;
}

/**
 * Validate a schema against values. Returns `{ [path]: message }`, empty when
 * valid. The path is the field `key` for root fields and `campo[index].sub` for a
 * cell of a `list` (the list itself reports on `campo`: required / min / max).
 * Only **visible**, value-holding fields are checked — a hidden required field
 * never blocks submit. Blank list rows are ignored (they are dropped on output).
 */
export function validate(schema: FormSchema, values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of schema.fields) {
    if (NON_VALUE_TYPES.has(field.type)) continue;
    if (!isFieldVisible(field, values)) continue;

    const key = fieldKey(field);
    const value = values[key];

    if (field.type === 'list') {
      const message = field.validation.message;
      const subs = resolveItemFields(field).filter((s) => !s.behavior.hidden);
      const items = listItems(value);
      const filled = items.filter((it) => !isBlankItem(it, subs)).length;
      const maxItems = field.maxItems ?? DEFAULT_LIST_MAX_ITEMS;
      const minItems = Math.max(field.minItems ?? 0, field.behavior.required ? 1 : 0);

      if (items.length > maxItems) {
        errors[key] = message || `Máximo de ${maxItems} itens.`;
        continue;
      }
      if (filled < minItems) {
        errors[key] =
          message ||
          (field.behavior.required && filled === 0 && (field.minItems ?? 0) <= 1
            ? 'Adicione ao menos um item.'
            : `Mínimo de ${minItems} itens.`);
        continue;
      }
      items.forEach((item, index) => {
        if (isBlankItem(item, subs)) return;
        const rec = item as Record<string, unknown>;
        for (const sub of subs) {
          const subKey = fieldKey(sub);
          const err = checkValue(sub, rec[subKey]);
          if (err) errors[listErrorKey(key, index, subKey)] = err;
        }
      });
      continue;
    }

    const err = checkValue(field, value);
    if (err) errors[key] = err;
  }

  return errors;
}
