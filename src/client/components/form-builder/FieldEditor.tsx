'use client';

import * as React from 'react';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Trash2,
  GripVertical,
  Plus,
  Lock,
  Unlock,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import {
  DEFAULT_LIST_MAX_ITEMS,
  FIELD_TYPE_LABELS,
  KEY_REGEX,
  LIST_ITEM_TYPES,
  OPTION_TYPES,
  createField,
  slugifyKey,
  uid,
  type Breakpoint,
  type FieldType,
  type FormField,
  type SelectOption,
  type VisibleWhen,
} from './types';

const BPS: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
const VISIBLE_OPS: VisibleWhen['op'][] = ['eq', 'ne', 'in', 'gt', 'lt', 'truthy'];
const LIST_ITEM_TYPE_ORDER = Array.from(LIST_ITEM_TYPES);

type Props = {
  field: FormField;
  onChange: (f: FormField) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  mode?: 'simple' | 'advanced';
  /** fields that appear before this one — the only valid `visibleWhen` targets */
  priorFields?: FormField[];
  /** duplicate/invalid-key message for this field, surfaced by FormBuilder */
  keyError?: string;
  /** key problems by field id (also covers the sub-fields of a list), from collectKeyIssues */
  keyIssues?: Record<string, string>;
};

export function FieldEditor({
  field,
  onChange,
  onDelete,
  onDuplicate,
  mode = 'advanced',
  priorFields = [],
  keyError,
  keyIssues = {},
}: Props) {
  const [keyLocked, setKeyLocked] = React.useState(true);
  const trackingKey = !field.key;

  const patch = (p: Partial<FormField>) => onChange({ ...field, ...p });
  const patchBeh = (p: Partial<FormField['behavior']>) =>
    onChange({ ...field, behavior: { ...field.behavior, ...p } });
  const patchVal = (p: Partial<FormField['validation']>) =>
    onChange({ ...field, validation: { ...field.validation, ...p } });
  const patchApp = (p: Partial<FormField['appearance']>) =>
    onChange({ ...field, appearance: { ...field.appearance, ...p } });

  const setLabel = (label: string) => {
    if (trackingKey) {
      const k = slugifyKey(label);
      patch({ label, key: k, name: k });
    } else {
      patch({ label });
    }
  };

  const setKey = (raw: string) => {
    const k = raw.trim();
    patch({ key: k, name: k });
  };

  const keyInvalid = field.key !== '' && !KEY_REGEX.test(field.key);

  const hasOptions = OPTION_TYPES.has(field.type);
  const usesResource = Boolean(field.optionsSource);

  const setSource = (p: Partial<NonNullable<FormField['optionsSource']>>) =>
    patch({
      optionsSource: {
        resource: '',
        labelField: 'name',
        valueField: 'id',
        ...field.optionsSource,
        ...p,
      },
    });

  const setVisible = (p: Partial<VisibleWhen>) =>
    patch({
      visibleWhen: {
        field: priorFields[0]?.key ?? '',
        op: 'truthy',
        ...field.visibleWhen,
        ...p,
      },
    });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{field.label || 'Sem título'}</p>
          <p className="text-xs text-muted-foreground">{field.type}</p>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={onDuplicate} title="Duplicar">
            <Copy className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete} title="Excluir">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* key — always visible, both modes */}
      <div>
        <Label className="text-xs">Chave (key)</Label>
        <div className="flex items-center gap-1">
          <Input
            value={field.key}
            disabled={keyLocked && !trackingKey}
            placeholder="ex: atende_emergencia"
            onChange={(e) => setKey(e.target.value)}
          />
          {!trackingKey && (
            <Button
              size="icon"
              variant="ghost"
              title={keyLocked ? 'Editar chave' : 'Bloquear chave'}
              onClick={() => setKeyLocked((v) => !v)}
            >
              {keyLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </Button>
          )}
        </div>
        {trackingKey && (
          <p className="mt-1 text-xs text-muted-foreground">
            Gerada a partir do label até você defini-la.
          </p>
        )}
        {keyInvalid && (
          <p className="mt-1 text-xs text-destructive">
            Use apenas letras minúsculas, números e _ (começando por letra).
          </p>
        )}
        {keyError && <p className="mt-1 text-xs text-destructive">{keyError}</p>}
      </div>

      {mode === 'simple' ? (
        <SimpleEditor
          field={field}
          patch={patch}
          patchBeh={patchBeh}
          setLabel={setLabel}
          keyIssues={keyIssues}
        />
      ) : (
        <Accordion type="multiple" defaultValue={field.type === 'list' ? ['info', 'behavior', 'list'] : ['info', 'behavior']}>
          <AccordionItem value="info">
            <AccordionTrigger>Informações</AccordionTrigger>
            <AccordionContent className="space-y-2">
              <div>
                <Label className="text-xs">Label</Label>
                <Input value={field.label} onChange={(e) => setLabel(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Placeholder</Label>
                <Input
                  value={field.placeholder ?? ''}
                  onChange={(e) => patch({ placeholder: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Descrição</Label>
                <Textarea
                  rows={2}
                  value={field.description ?? ''}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="behavior">
            <AccordionTrigger>Comportamento</AccordionTrigger>
            <AccordionContent className="space-y-2">
              {(
                [
                  ['required', 'Obrigatório'],
                  ['readOnly', 'Somente leitura'],
                  ['disabled', 'Desabilitado'],
                  ['hidden', 'Invisível'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between text-sm">
                  {label}
                  <Switch
                    checked={!!field.behavior[key]}
                    onCheckedChange={(c) => patchBeh({ [key]: c })}
                  />
                </label>
              ))}
              <div>
                <Label className="text-xs">Valor padrão</Label>
                <Input
                  value={(field.behavior.defaultValue as string) ?? ''}
                  onChange={(e) => patchBeh({ defaultValue: e.target.value })}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {field.type === 'list' && (
            <AccordionItem value="list">
              <AccordionTrigger>Itens da lista</AccordionTrigger>
              <AccordionContent>
                <ListItemsEditor field={field} patch={patch} issues={keyIssues} />
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem value="visibility">
            <AccordionTrigger>Visibilidade condicional</AccordionTrigger>
            <AccordionContent className="space-y-2">
              {priorFields.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Adicione campos antes deste para criar uma condição.
                </p>
              ) : !field.visibleWhen ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setVisible({ field: priorFields[0].key, op: 'truthy' })}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Mostrar só quando...
                </Button>
              ) : (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Campo</Label>
                    <select
                      className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                      value={field.visibleWhen.field}
                      onChange={(e) => setVisible({ field: e.target.value })}
                    >
                      {priorFields.map((pf) => (
                        <option key={pf.id} value={pf.key}>
                          {pf.label || pf.key}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Operador</Label>
                    <select
                      className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                      value={field.visibleWhen.op}
                      onChange={(e) => setVisible({ op: e.target.value as VisibleWhen['op'] })}
                    >
                      {VISIBLE_OPS.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                  </div>
                  {field.visibleWhen.op !== 'truthy' && (
                    <div>
                      <Label className="text-xs">
                        Valor{field.visibleWhen.op === 'in' ? ' (separado por vírgula)' : ''}
                      </Label>
                      <Input
                        value={
                          Array.isArray(field.visibleWhen.value)
                            ? (field.visibleWhen.value as unknown[]).join(',')
                            : String(field.visibleWhen.value ?? '')
                        }
                        onChange={(e) =>
                          setVisible({
                            value:
                              field.visibleWhen?.op === 'in'
                                ? e.target.value.split(',').map((s) => s.trim())
                                : e.target.value,
                          })
                        }
                      />
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => patch({ visibleWhen: undefined })}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Remover condição
                  </Button>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="validation">
            <AccordionTrigger>Validação</AccordionTrigger>
            <AccordionContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['min', 'Mínimo'],
                    ['max', 'Máximo'],
                    ['minLength', 'Tam. mín.'],
                    ['maxLength', 'Tam. máx.'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <Label className="text-xs">{label}</Label>
                    <Input
                      type="number"
                      value={field.validation[key] ?? ''}
                      onChange={(e) =>
                        patchVal({
                          [key]: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                ))}
              </div>
              <div>
                <Label className="text-xs">Regex</Label>
                <Input
                  value={field.validation.regex ?? ''}
                  onChange={(e) => patchVal({ regex: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Mensagem de erro</Label>
                <Input
                  value={field.validation.message ?? ''}
                  onChange={(e) => patchVal({ message: e.target.value })}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="appearance">
            <AccordionTrigger>Aparência</AccordionTrigger>
            <AccordionContent className="space-y-2">
              <div>
                <Label className="text-xs">Ícone (nome lucide)</Label>
                <Input
                  value={field.appearance.icon ?? ''}
                  onChange={(e) => patchApp({ icon: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Texto de ajuda</Label>
                <Input
                  value={field.appearance.helpText ?? ''}
                  onChange={(e) => patchApp({ helpText: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Tooltip</Label>
                <Input
                  value={field.appearance.tooltip ?? ''}
                  onChange={(e) => patchApp({ tooltip: e.target.value })}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {hasOptions && (
            <AccordionItem value="options">
              <AccordionTrigger>Opções</AccordionTrigger>
              <AccordionContent className="space-y-2">
                <label className="flex items-center justify-between text-sm">
                  Opções de um recurso
                  <Switch
                    checked={usesResource}
                    onCheckedChange={(c) =>
                      patch({
                        optionsSource: c
                          ? { resource: '', labelField: 'name', valueField: 'id' }
                          : undefined,
                      })
                    }
                  />
                </label>

                {usesResource ? (
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Recurso</Label>
                      <Input
                        value={field.optionsSource?.resource ?? ''}
                        onChange={(e) => setSource({ resource: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Campo label</Label>
                        <Input
                          value={field.optionsSource?.labelField ?? ''}
                          onChange={(e) => setSource({ labelField: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Campo valor</Label>
                        <Input
                          value={field.optionsSource?.valueField ?? ''}
                          onChange={(e) => setSource({ valueField: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Filtro (campo=valor, por linha)</Label>
                      <Textarea
                        rows={2}
                        value={Object.entries(field.optionsSource?.filter ?? {})
                          .map(([k, v]) => `${k}=${v}`)
                          .join('\n')}
                        onChange={(e) => {
                          const filter: Record<string, string> = {};
                          for (const line of e.target.value.split('\n')) {
                            const [k, ...rest] = line.split('=');
                            if (k.trim()) filter[k.trim()] = rest.join('=').trim();
                          }
                          setSource({
                            filter: Object.keys(filter).length ? filter : undefined,
                          });
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <OptionListEditor field={field} patch={patch} />
                )}
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem value="layout">
            <AccordionTrigger>Layout (Grid)</AccordionTrigger>
            <AccordionContent className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {BPS.map((bp) => (
                  <div key={bp}>
                    <Label className="text-xs">{bp}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={field.grid[bp] ?? ''}
                      onChange={(e) =>
                        patch({
                          grid: {
                            ...field.grid,
                            [bp]: e.target.value === '' ? undefined : Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
              <div>
                <Label className="text-xs">Ordem</Label>
                <Input
                  type="number"
                  value={field.grid.order ?? ''}
                  onChange={(e) =>
                    patch({
                      grid: {
                        ...field.grid,
                        order: e.target.value === '' ? undefined : Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}

function ListItemsEditor({
  field,
  patch,
  issues,
}: {
  field: FormField;
  patch: (p: Partial<FormField>) => void;
  issues: Record<string, string>;
}) {
  const subs = field.itemFields ?? [];
  const setSubs = (next: FormField[]) => patch({ itemFields: next });
  const updateSub = (idx: number, p: Partial<FormField>) =>
    setSubs(subs.map((s, i) => (i === idx ? { ...s, ...p } : s)));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= subs.length) return;
    const next = [...subs];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    setSubs(next);
  };
  const numOrUndef = (raw: string) => (raw === '' ? undefined : Number(raw));

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Rótulo de cada item</Label>
        <Input
          value={field.itemLabel ?? ''}
          placeholder="ex: Sessão"
          onChange={(e) => patch({ itemLabel: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Mínimo de itens</Label>
          <Input
            type="number"
            min={0}
            value={field.minItems ?? ''}
            onChange={(e) => patch({ minItems: numOrUndef(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs">Máximo de itens</Label>
          <Input
            type="number"
            min={1}
            value={field.maxItems ?? ''}
            placeholder={String(DEFAULT_LIST_MAX_ITEMS)}
            onChange={(e) => patch({ maxItems: numOrUndef(e.target.value) })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Sub-campos</Label>
        {subs.length === 0 && (
          <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
            Adicione os campos que se repetem em cada item.
          </p>
        )}
        {subs.map((sub, idx) => (
          <div
            key={sub.id}
            className={cn(
              'space-y-2 rounded-md border p-2',
              issues[sub.id] ? 'border-destructive' : undefined
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-xs font-medium">
                {sub.label || sub.key || 'Sem título'}
              </span>
              <div className="flex items-center">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={idx === 0}
                  onClick={() => move(idx, idx - 1)}
                  title="Subir"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={idx === subs.length - 1}
                  onClick={() => move(idx, idx + 1)}
                  title="Descer"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setSubs(subs.filter((_, i) => i !== idx))}
                  title="Remover sub-campo"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Label</Label>
                <Input
                  className="h-8"
                  value={sub.label}
                  onChange={(e) => {
                    const label = e.target.value;
                    if (!sub.key) {
                      const k = slugifyKey(label);
                      updateSub(idx, { label, key: k, name: k });
                    } else {
                      updateSub(idx, { label });
                    }
                  }}
                />
              </div>
              <div>
                <Label className="text-xs">Chave (key)</Label>
                <Input
                  className="h-8"
                  value={sub.key}
                  onChange={(e) => {
                    const k = e.target.value.trim();
                    updateSub(idx, { key: k, name: k });
                  }}
                />
              </div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <select
                  className="h-8 w-full rounded-md border bg-background px-2 text-sm"
                  value={sub.type}
                  onChange={(e) => {
                    const type = e.target.value as FieldType;
                    const fresh = createField(type);
                    updateSub(idx, {
                      type,
                      options: OPTION_TYPES.has(type) ? (sub.options ?? fresh.options) : undefined,
                    });
                  }}
                >
                  {LIST_ITEM_TYPE_ORDER.map((t) => (
                    <option key={t} value={t}>
                      {FIELD_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-end justify-between gap-2 pb-1 text-xs">
                Obrigatório
                <Switch
                  checked={!!sub.behavior.required}
                  onCheckedChange={(c) =>
                    updateSub(idx, { behavior: { ...sub.behavior, required: c } })
                  }
                />
              </label>
            </div>
            {OPTION_TYPES.has(sub.type) && (
              <OptionListEditor field={sub} patch={(p) => updateSub(idx, p)} />
            )}
            {issues[sub.id] && <p className="text-xs text-destructive">{issues[sub.id]}</p>}
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setSubs([...subs, createField('text')])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar sub-campo
        </Button>
      </div>
    </div>
  );
}

function OptionListEditor({
  field,
  patch,
}: {
  field: FormField;
  patch: (p: Partial<FormField>) => void;
}) {
  const options = field.options ?? [];
  return (
    <div className="space-y-2">
      {options.map((o, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <Input
            className="h-8"
            placeholder="Label"
            value={o.label}
            onChange={(e) => {
              const next = [...options];
              next[idx] = { ...next[idx], label: e.target.value };
              patch({ options: next });
            }}
          />
          <Input
            className="h-8"
            placeholder="valor"
            value={o.value}
            onChange={(e) => {
              const next = [...options];
              next[idx] = { ...next[idx], value: e.target.value };
              patch({ options: next });
            }}
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => patch({ options: options.filter((_, i) => i !== idx) })}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          const next: SelectOption[] = [
            ...options,
            { label: `Opção ${options.length + 1}`, value: uid('opt') },
          ];
          patch({ options: next });
        }}
      >
        <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar opção
      </Button>
    </div>
  );
}

type SimpleEditorProps = {
  field: FormField;
  patch: (p: Partial<FormField>) => void;
  patchBeh: (p: Partial<FormField['behavior']>) => void;
  setLabel: (label: string) => void;
  keyIssues: Record<string, string>;
};

type WidthKey = 'full' | 'half' | 'third';
const spanFromWidth = (w: WidthKey) => (w === 'full' ? 12 : w === 'half' ? 6 : 4);
const widthFromSpan = (span: number | undefined, fallback: WidthKey): WidthKey => {
  if (span == null) return fallback;
  if (span >= 12) return 'full';
  if (span <= 4) return 'third';
  return 'half';
};

function SimpleEditor({ field, patch, patchBeh, setLabel, keyIssues }: SimpleEditorProps) {
  const hasOptions = OPTION_TYPES.has(field.type);
  const mobileWidth = widthFromSpan(field.grid.xs, 'full');
  const tabletWidth = widthFromSpan(field.grid.md, 'half');
  const desktopWidth = widthFromSpan(field.grid.lg, 'half');

  const setDeviceWidth = (device: 'mobile' | 'tablet' | 'desktop', w: WidthKey) => {
    const span = spanFromWidth(w);
    const next = { ...field.grid };
    if (device === 'mobile') {
      next.xs = span;
      next.sm = span;
    } else if (device === 'tablet') {
      next.md = span;
    } else {
      next.lg = span;
      next.xl = span;
      next['2xl'] = span;
    }
    patch({ grid: next });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Pergunta</Label>
        <Input
          value={field.label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex: Qual seu nome?"
        />
      </div>
      <div>
        <Label className="text-xs">Texto de exemplo (opcional)</Label>
        <Input
          value={field.placeholder ?? ''}
          onChange={(e) => patch({ placeholder: e.target.value })}
          placeholder="Ex: João Silva"
        />
      </div>
      <div>
        <Label className="text-xs">Dica de ajuda (opcional)</Label>
        <Textarea
          rows={2}
          value={field.description ?? ''}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="Uma explicação curta para o usuário"
        />
      </div>
      <label className="flex items-center justify-between rounded-md border p-2 text-sm">
        <span>Este campo é obrigatório?</span>
        <Switch
          checked={!!field.behavior.required}
          onCheckedChange={(c) => patchBeh({ required: c })}
        />
      </label>
      <div className="space-y-2">
        <Label className="text-xs">Tamanho do campo por dispositivo</Label>
        {(
          [
            ['mobile', 'Celular', mobileWidth],
            ['tablet', 'Tablet', tabletWidth],
            ['desktop', 'Computador', desktopWidth],
          ] as const
        ).map(([device, deviceLabel, current]) => (
          <div key={device} className="rounded-md border p-2">
            <p className="mb-1 text-xs text-muted-foreground">{deviceLabel}</p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['full', 'Inteiro'],
                  ['half', 'Metade'],
                  ['third', 'Um terço'],
                ] as const
              ).map(([w, label]) => (
                <Button
                  key={w}
                  type="button"
                  size="sm"
                  variant={current === w ? 'default' : 'outline'}
                  onClick={() => setDeviceWidth(device, w)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {hasOptions && <OptionListEditor field={field} patch={patch} />}
      {field.type === 'list' && (
        <ListItemsEditor field={field} patch={patch} issues={keyIssues} />
      )}
    </div>
  );
}
