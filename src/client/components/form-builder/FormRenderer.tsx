'use client';

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { HelpCircle, Star } from 'lucide-react';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Switch } from '../ui/switch';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';
import { Tooltip } from '../ui/tooltip';
import { cn, resolveLucideIcon } from '../../../lib/utils';
import { useResourceOptions } from '../../hooks/use-resource-options';
import {
  DEFAULT_GRID,
  OPTION_TYPES,
  fieldKey,
  type Breakpoint,
  type FormField,
  type FormSchema,
  type FormValues,
  type GridConfig,
  type SelectOption,
} from './types';
import { collectOutput, isFieldVisible, validate } from './validate';

type Props = {
  schema: FormSchema;
  values: FormValues;
  onChange: (values: FormValues) => void;
  onSubmit?: (values: FormValues) => void;
  className?: string;
  widthOverride?: number;
};

const BP_ORDER: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
const BP_MIN: Record<Breakpoint, number> = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

function useViewportWidth() {
  const [w, setW] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return w;
}

function activeSpan(g: GridConfig, width: number): number {
  let span = g.xs ?? DEFAULT_GRID.xs ?? 12;
  for (const bp of BP_ORDER) {
    if (width >= BP_MIN[bp] && g[bp] != null) span = g[bp] as number;
  }
  return Math.max(1, Math.min(12, span));
}

/* ------------------------------------------------------------------ */
/* Option resolution                                                    */
/* ------------------------------------------------------------------ */

function ResourceOptionsField(props: BaseFieldProps) {
  const src = props.field.optionsSource!;
  const { options: rows } = useResourceOptions({
    resource: src.resource,
    labelField: src.labelField,
    filter: src.filter,
  });
  const resolved = useMemo<SelectOption[]>(
    () =>
      rows.map((row) => ({
        label: String(row[src.labelField] ?? row.id),
        value: String(row[src.valueField] ?? row.id),
      })),
    [rows, src.labelField, src.valueField]
  );
  return <BaseField {...props} options={resolved} />;
}

function StaticOptionsField(props: BaseFieldProps) {
  return <BaseField {...props} options={props.field.options ?? []} />;
}

function FieldSlot(props: BaseFieldProps) {
  const usesResource =
    OPTION_TYPES.has(props.field.type) && Boolean(props.field.optionsSource?.resource);
  return usesResource ? <ResourceOptionsField {...props} /> : <StaticOptionsField {...props} />;
}

/* ------------------------------------------------------------------ */
/* Field renderer                                                       */
/* ------------------------------------------------------------------ */

type BaseFieldProps = {
  field: FormField;
  value: unknown;
  error?: string;
  onChange: (v: unknown) => void;
};

function BaseField({
  field,
  value,
  error,
  onChange,
  options,
}: BaseFieldProps & { options: SelectOption[] }) {
  const disabled = field.behavior.disabled;
  const readOnly = field.behavior.readOnly;
  const commonId = field.id;
  const Icon = resolveLucideIcon(field.appearance.icon);

  const labelRow = field.label ? (
    <Label htmlFor={commonId} className="flex items-center gap-1">
      {field.label}
      {field.behavior.required && <span className="text-destructive">*</span>}
      {field.appearance.tooltip && (
        <Tooltip content={field.appearance.tooltip}>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
        </Tooltip>
      )}
    </Label>
  ) : null;

  const withLabel = (children: React.ReactNode) => (
    <div className="space-y-1.5">
      {labelRow}
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
      {children}
      {field.appearance.helpText && (
        <p className="text-xs text-muted-foreground">{field.appearance.helpText}</p>
      )}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );

  const adornInput = (input: React.ReactNode) =>
    Icon ? (
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {input}
      </div>
    ) : (
      input
    );

  switch (field.type) {
    case 'text':
    case 'email':
    case 'url':
    case 'password':
    case 'phone':
      return withLabel(
        adornInput(
          <Input
            id={commonId}
            type={
              field.type === 'password'
                ? 'password'
                : field.type === 'email'
                  ? 'email'
                  : field.type === 'url'
                    ? 'url'
                    : field.type === 'phone'
                      ? 'tel'
                      : 'text'
            }
            className={Icon ? 'pl-9' : undefined}
            placeholder={field.placeholder}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            readOnly={readOnly}
          />
        )
      );
    case 'textarea':
      return withLabel(
        <Textarea
          id={commonId}
          placeholder={field.placeholder}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          readOnly={readOnly}
        />
      );
    case 'number':
    case 'decimal':
    case 'currency':
      return withLabel(
        adornInput(
          <Input
            id={commonId}
            type="number"
            className={Icon ? 'pl-9' : undefined}
            step={field.type === 'number' ? 1 : 0.01}
            placeholder={field.placeholder}
            value={(value as string | number) ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            disabled={disabled}
            readOnly={readOnly}
          />
        )
      );
    case 'date':
    case 'time':
    case 'datetime':
      return withLabel(
        <Input
          id={commonId}
          type={
            field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'datetime-local'
          }
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          readOnly={readOnly}
        />
      );
    case 'select':
      return withLabel(
        <Select value={(value as string) ?? ''} onValueChange={(v) => onChange(v)}>
          <SelectTrigger id={commonId} className="h-10 w-full text-sm">
            <SelectValue>
              {options.find((o) => o.value === value)?.label ??
                field.placeholder ??
                'Selecione...'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'multiselect': {
      const arr = (value as string[]) ?? [];
      return withLabel(
        <div className="flex flex-wrap gap-2">
          {options.map((o) => {
            const active = arr.includes(o.value);
            return (
              <button
                type="button"
                key={o.value}
                disabled={disabled}
                onClick={() =>
                  onChange(active ? arr.filter((x) => x !== o.value) : [...arr, o.value])
                }
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-muted'
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      );
    }
    case 'radio':
      return withLabel(
        <RadioGroup
          value={(value as string) ?? ''}
          onValueChange={(v) => onChange(v)}
          disabled={disabled}
        >
          {options.map((o) => (
            <div key={o.value} className="flex items-center gap-2">
              <RadioGroupItem value={o.value} id={`${commonId}-${o.value}`} />
              <Label htmlFor={`${commonId}-${o.value}`} className="font-normal">
                {o.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );
    case 'checkbox':
      return (
        <div className="space-y-1.5">
          <div className="flex items-start gap-2">
            <Checkbox
              id={commonId}
              checked={!!value}
              onCheckedChange={(c) => onChange(!!c)}
              disabled={disabled}
            />
            <div className="space-y-0.5">
              <Label htmlFor={commonId} className="font-normal">
                {field.label}
                {field.behavior.required && (
                  <span className="ml-1 text-destructive">*</span>
                )}
              </Label>
              {field.description && (
                <p className="text-xs text-muted-foreground">{field.description}</p>
              )}
            </div>
          </div>
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        </div>
      );
    case 'switch':
      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-0.5">
              <Label htmlFor={commonId}>{field.label}</Label>
              {field.description && (
                <p className="text-xs text-muted-foreground">{field.description}</p>
              )}
            </div>
            <Switch
              id={commonId}
              checked={!!value}
              onCheckedChange={(c) => onChange(c)}
              disabled={disabled}
            />
          </div>
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        </div>
      );
    case 'slider': {
      const v = typeof value === 'number' ? value : (field.min ?? 0);
      return withLabel(
        <div className="space-y-2">
          <input
            type="range"
            className="w-full accent-primary"
            value={v}
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={field.step ?? 1}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={disabled}
          />
          <div className="text-right text-xs text-muted-foreground">{v}</div>
        </div>
      );
    }
    case 'rating': {
      const v = typeof value === 'number' ? value : 0;
      const max = field.max ?? 5;
      return withLabel(
        <div className="flex items-center gap-1">
          {Array.from({ length: max }).map((_, i) => {
            const n = i + 1;
            return (
              <button
                key={n}
                type="button"
                onClick={() => !disabled && onChange(n)}
                className="p-0.5"
                aria-label={`${n}`}
              >
                <Star
                  className={cn(
                    'h-6 w-6 transition-colors',
                    n <= v ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                  )}
                />
              </button>
            );
          })}
        </div>
      );
    }
    case 'color':
      return withLabel(
        <Input
          id={commonId}
          type="color"
          value={(value as string) ?? '#000000'}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-10 w-20 p-1"
        />
      );
    case 'upload':
    case 'image':
      return withLabel(
        <Input
          id={commonId}
          type="file"
          accept={field.type === 'image' ? 'image/*' : undefined}
          multiple={field.type === 'image'}
          onChange={(e) => {
            const files = e.target.files
              ? Array.from(e.target.files).map((f) => f.name)
              : [];
            onChange(field.type === 'image' ? files : (files[0] ?? ''));
          }}
          disabled={disabled}
        />
      );
    case 'hidden':
      return null;
    case 'divider':
      return <Separator />;
    case 'heading':
      return <h3 className="text-lg font-semibold">{field.label}</h3>;
    case 'info':
      return (
        <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
          {field.label}
          {field.description && <p className="mt-1 text-xs">{field.description}</p>}
        </div>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* FormRenderer                                                         */
/* ------------------------------------------------------------------ */

export function FormRenderer({
  schema,
  values,
  onChange,
  onSubmit,
  className,
  widthOverride,
}: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const vw = useViewportWidth();
  const width = widthOverride ?? vw;

  const visibleFields = useMemo(
    () => schema.fields.filter((f) => isFieldVisible(f, values)),
    [schema.fields, values]
  );

  return (
    <form
      className={cn('space-y-4', className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (!onSubmit) return;
        const found = validate(schema, values);
        setErrors(found);
        if (Object.keys(found).length === 0) onSubmit(collectOutput(schema, values));
      }}
    >
      {(schema.title || schema.description) && (
        <div className="space-y-1">
          {schema.title && <h2 className="text-xl font-bold">{schema.title}</h2>}
          {schema.description && (
            <p className="text-sm text-muted-foreground">{schema.description}</p>
          )}
        </div>
      )}
      <div className="grid grid-cols-12 gap-4">
        {visibleFields.map((f) => {
          const fullWidth =
            f.type === 'divider' || f.type === 'heading' || f.type === 'info';
          const span = fullWidth ? 12 : activeSpan(f.grid, width);
          const key = fieldKey(f);
          return (
            <div
              key={f.id}
              style={{ gridColumn: `span ${span} / span ${span}`, order: f.grid.order }}
            >
              <FieldSlot
                field={f}
                value={values[key]}
                error={errors[key]}
                onChange={(v) => onChange({ ...values, [key]: v })}
              />
            </div>
          );
        })}
      </div>
      {onSubmit && (
        <div className="flex justify-end pt-2">
          <Button type="submit">Enviar</Button>
        </div>
      )}
    </form>
  );
}
