'use client';

import * as React from 'react';
import { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import {
  AlertTriangle,
  Code,
  Copy,
  Eye,
  GripVertical,
  Laptop,
  Monitor,
  Plus,
  Settings2,
  Smartphone,
  Tablet,
  Trash2,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import {
  collectKeyIssues,
  createField,
  FIELD_TYPE_LABELS,
  uid,
  type FieldType,
  type FormField,
  type FormSchema,
  type FormValues,
} from './types';
import { FormRenderer } from './FormRenderer';
import { FieldEditor } from './FieldEditor';
import { FormResultViewer } from './FormResultViewer';

type Device = 'mobile' | 'tablet' | 'notebook' | 'desktop';
const DEVICE_WIDTH: Record<Device, number> = {
  mobile: 390,
  tablet: 768,
  notebook: 1024,
  desktop: 1280,
};

type Props = {
  value: FormSchema;
  onChange: (schema: FormSchema) => void;
};

const TOOLBOX: FieldType[] = [
  'text',
  'textarea',
  'number',
  'decimal',
  'currency',
  'date',
  'time',
  'datetime',
  'phone',
  'email',
  'url',
  'password',
  'select',
  'multiselect',
  'radio',
  'checkbox',
  'switch',
  'upload',
  'image',
  'rating',
  'slider',
  'color',
  'hidden',
  'divider',
  'heading',
  'info',
];

const SIMPLE_TOOLBOX: FieldType[] = [
  'text',
  'textarea',
  'number',
  'phone',
  'email',
  'date',
  'select',
  'radio',
  'checkbox',
  'upload',
  'heading',
];

export function FormBuilder({ value: schema, onChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [values, setValues] = useState<FormValues>({});
  const [device, setDevice] = useState<Device>('desktop');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [toolboxOpen, setToolboxOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');

  const activeToolbox = mode === 'simple' ? SIMPLE_TOOLBOX : TOOLBOX;
  const keyIssues = useMemo(() => collectKeyIssues(schema), [schema]);
  const hasKeyIssues = Object.keys(keyIssues).length > 0;

  const update = (next: FormSchema) => onChange(next);

  const addField = (type: FieldType) => {
    const f = createField(type);
    update({ ...schema, fields: [...schema.fields, f] });
    setSelectedId(f.id);
  };

  const updateField = (id: string, patch: FormField) => {
    update({ ...schema, fields: schema.fields.map((f) => (f.id === id ? patch : f)) });
  };

  const deleteField = (id: string) => {
    update({ ...schema, fields: schema.fields.filter((f) => f.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };

  const duplicateField = (id: string) => {
    const idx = schema.fields.findIndex((f) => f.id === id);
    if (idx < 0) return;
    const orig = schema.fields[idx];
    const copy: FormField = {
      ...orig,
      id: uid(),
      key: orig.key ? `${orig.key}_copy` : '',
      name: orig.key ? `${orig.key}_copy` : '',
      visibleWhen: orig.visibleWhen ? { ...orig.visibleWhen } : undefined,
    };
    const next = [...schema.fields];
    next.splice(idx + 1, 0, copy);
    update({ ...schema, fields: next });
  };

  const moveField = (from: number, to: number) => {
    if (from === to) return;
    const next = [...schema.fields];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    update({ ...schema, fields: next });
  };

  const selectedIndex = schema.fields.findIndex((f) => f.id === selectedId);
  const selected = selectedIndex >= 0 ? schema.fields[selectedIndex] : null;
  const priorFields = selectedIndex >= 0 ? schema.fields.slice(0, selectedIndex) : [];

  const renderEditor = () =>
    selected ? (
      <FieldEditor
        field={selected}
        mode={mode}
        priorFields={priorFields}
        keyError={keyIssues[selected.id]}
        onChange={(f) => updateField(selected.id, f)}
        onDelete={() => {
          deleteField(selected.id);
          setEditorOpen(false);
        }}
        onDuplicate={() => duplicateField(selected.id)}
      />
    ) : (
      <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
        Selecione um campo para editar suas propriedades.
      </p>
    );

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-card px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <Input
            value={schema.title}
            onChange={(e) => update({ ...schema, title: e.target.value })}
            className="h-8 w-64"
            placeholder="Título do formulário"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border p-0.5 text-xs">
            {(
              [
                ['simple', 'Simples'],
                ['advanced', 'Avançado'],
              ] as const
            ).map(([m, label]) => (
              <Button
                key={m}
                size="sm"
                variant={mode === m ? 'default' : 'ghost'}
                className="h-7 px-2 text-xs"
                onClick={() => setMode(m)}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            {(
              [
                ['mobile', Smartphone],
                ['tablet', Tablet],
                ['notebook', Laptop],
                ['desktop', Monitor],
              ] as const
            ).map(([d, Icon]) => (
              <Button
                key={d}
                size="sm"
                variant={device === d ? 'default' : 'ghost'}
                className="h-7 px-2"
                onClick={() => setDevice(d)}
                title={d}
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
        </div>
      </div>

      {hasKeyIssues && (
        <div className="flex items-center gap-2 border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Corrija as chaves dos campos destacados antes de salvar.
        </div>
      )}

      {/* 3 columns */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_320px]">
        {/* Toolbox — desktop only */}
        <div className="hidden border-r bg-muted/30 lg:block">
          <div className="border-b px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
            Componentes
          </div>
          <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
            <div className="grid grid-cols-1 gap-1.5 p-2">
              {activeToolbox.map((t) => (
                <button
                  key={t}
                  onClick={() => addField(t)}
                  className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-left text-xs hover:border-primary hover:bg-primary/5"
                >
                  <Plus className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate">{FIELD_TYPE_LABELS[t]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Builder + Preview tabs */}
        <div className="min-w-0 border-r">
          <Tabs defaultValue="builder">
            <div className="border-b px-3 py-1.5">
              <TabsList className="h-8">
                <TabsTrigger value="builder" className="text-xs">
                  <Settings2 className="mr-1 h-3 w-3" /> Estrutura
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs">
                  <Eye className="mr-1 h-3 w-3" /> Preview
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="builder" className="m-0">
              <div className="h-[500px] overflow-y-auto lg:h-[calc(100vh-19rem)]">
                <div className="space-y-2 p-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-center border-dashed lg:hidden"
                    onClick={() => setToolboxOpen(true)}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Adicionar componente
                  </Button>
                  {schema.fields.length === 0 && (
                    <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                      Adicione campos pela barra lateral.
                    </div>
                  )}
                  {schema.fields.map((f, idx) => (
                    <div
                      key={f.id}
                      draggable
                      onDragStart={() => setDragIndex(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragIndex !== null) moveField(dragIndex, idx);
                        setDragIndex(null);
                      }}
                      onClick={() => setSelectedId(f.id)}
                      className={cn(
                        'group flex items-center gap-2 rounded-md border bg-card p-2 text-sm transition-colors',
                        keyIssues[f.id]
                          ? 'border-destructive'
                          : selectedId === f.id
                            ? 'border-primary ring-1 ring-primary'
                            : 'hover:border-primary/40'
                      )}
                    >
                      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{f.label || 'Sem título'}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {FIELD_TYPE_LABELS[f.type]} · {f.key || '(sem chave)'}
                        </p>
                        {keyIssues[f.id] && (
                          <p className="truncate text-xs text-destructive">{keyIssues[f.id]}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs lg:hidden"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(f.id);
                          setEditorOpen(true);
                        }}
                      >
                        <Settings2 className="mr-1 h-3.5 w-3.5" /> Configurar
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateField(f.id);
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteField(f.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="m-0">
              <div className="bg-muted/20 p-4">
                <div className="mx-auto overflow-hidden rounded-lg border bg-background shadow-sm transition-all">
                  <div
                    style={{ width: `min(100%, ${DEVICE_WIDTH[device]}px)` }}
                    className="mx-auto p-4"
                  >
                    <FormRenderer
                      schema={schema}
                      values={values}
                      onChange={setValues}
                      widthOverride={DEVICE_WIDTH[device]}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <FormResultViewer schema={schema} values={values} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: field editor (desktop) */}
        <div className="hidden bg-muted/20 lg:block">
          <div className="border-b px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
            Propriedades
          </div>
          <div className="h-[calc(100vh-16rem)] overflow-y-auto p-3">{renderEditor()}</div>
        </div>
      </div>

      {/* Bottom: JSON (collapsed by default) */}
      <div className="border-t bg-card px-4 py-2">
        <Accordion type="single" collapsible>
          <AccordionItem value="json" className="border-b-0">
            <AccordionTrigger className="text-xs font-semibold uppercase text-muted-foreground">
              <span className="flex items-center gap-2">
                <Code className="h-3.5 w-3.5" /> JSONs (Configuração e Respostas)
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 gap-3 pt-2 lg:grid-cols-2">
                <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(schema, null, 2)}
                </pre>
                <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(values, null, 2)}
                </pre>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Mobile field editor */}
      <Sheet open={editorOpen} onOpenChange={setEditorOpen}>
        <SheetContent side="right" className="max-w-md p-0">
          <SheetHeader>
            <SheetTitle>Configurar campo</SheetTitle>
          </SheetHeader>
          <div className="max-h-[calc(100vh-4rem)] overflow-y-auto p-4">{renderEditor()}</div>
        </SheetContent>
      </Sheet>

      {/* Mobile toolbox */}
      <Sheet open={toolboxOpen} onOpenChange={setToolboxOpen}>
        <SheetContent side="bottom" className="p-0">
          <SheetHeader>
            <SheetTitle>Adicionar componente</SheetTitle>
          </SheetHeader>
          <div className="grid max-h-[70vh] grid-cols-2 gap-2 overflow-y-auto p-4">
            {activeToolbox.map((t) => (
              <button
                key={t}
                onClick={() => {
                  addField(t);
                  setToolboxOpen(false);
                }}
                className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-left text-sm hover:border-primary hover:bg-primary/5"
              >
                <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{FIELD_TYPE_LABELS[t]}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
