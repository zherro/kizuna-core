'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { AlertTriangle, Code, Copy, Eye, GripVertical, Laptop, Monitor, Plus, Settings2, Smartphone, Tablet, Trash2, } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { collectKeyIssues, createField, FIELD_TYPE_LABELS, uid, } from './types';
import { FormRenderer } from './FormRenderer';
import { FieldEditor } from './FieldEditor';
import { FormResultViewer } from './FormResultViewer';
const DEVICE_WIDTH = {
    mobile: 390,
    tablet: 768,
    notebook: 1024,
    desktop: 1280,
};
const TOOLBOX = [
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
const SIMPLE_TOOLBOX = [
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
export function FormBuilder({ value: schema, onChange }) {
    const [selectedId, setSelectedId] = useState(null);
    const [values, setValues] = useState({});
    const [device, setDevice] = useState('desktop');
    const [dragIndex, setDragIndex] = useState(null);
    const [toolboxOpen, setToolboxOpen] = useState(false);
    const [editorOpen, setEditorOpen] = useState(false);
    const [mode, setMode] = useState('simple');
    const activeToolbox = mode === 'simple' ? SIMPLE_TOOLBOX : TOOLBOX;
    const keyIssues = useMemo(() => collectKeyIssues(schema), [schema]);
    const hasKeyIssues = Object.keys(keyIssues).length > 0;
    const update = (next) => onChange(next);
    const addField = (type) => {
        const f = createField(type);
        update({ ...schema, fields: [...schema.fields, f] });
        setSelectedId(f.id);
    };
    const updateField = (id, patch) => {
        update({ ...schema, fields: schema.fields.map((f) => (f.id === id ? patch : f)) });
    };
    const deleteField = (id) => {
        update({ ...schema, fields: schema.fields.filter((f) => f.id !== id) });
        if (selectedId === id)
            setSelectedId(null);
    };
    const duplicateField = (id) => {
        const idx = schema.fields.findIndex((f) => f.id === id);
        if (idx < 0)
            return;
        const orig = schema.fields[idx];
        const copy = {
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
    const moveField = (from, to) => {
        if (from === to)
            return;
        const next = [...schema.fields];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        update({ ...schema, fields: next });
    };
    const selectedIndex = schema.fields.findIndex((f) => f.id === selectedId);
    const selected = selectedIndex >= 0 ? schema.fields[selectedIndex] : null;
    const priorFields = selectedIndex >= 0 ? schema.fields.slice(0, selectedIndex) : [];
    const renderEditor = () => selected ? (_jsx(FieldEditor, { field: selected, mode: mode, priorFields: priorFields, keyError: keyIssues[selected.id], onChange: (f) => updateField(selected.id, f), onDelete: () => {
            deleteField(selected.id);
            setEditorOpen(false);
        }, onDuplicate: () => duplicateField(selected.id) })) : (_jsx("p", { className: "rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground", children: "Selecione um campo para editar suas propriedades." }));
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2 border-b bg-card px-4 py-2", children: [_jsxs("div", { className: "flex min-w-0 items-center gap-2", children: [_jsx(Settings2, { className: "h-4 w-4 text-muted-foreground" }), _jsx(Input, { value: schema.title, onChange: (e) => update({ ...schema, title: e.target.value }), className: "h-8 w-64", placeholder: "T\u00EDtulo do formul\u00E1rio" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "flex items-center gap-1 rounded-md border p-0.5 text-xs", children: [
                                    ['simple', 'Simples'],
                                    ['advanced', 'Avançado'],
                                ].map(([m, label]) => (_jsx(Button, { size: "sm", variant: mode === m ? 'default' : 'ghost', className: "h-7 px-2 text-xs", onClick: () => setMode(m), children: label }, m))) }), _jsx("div", { className: "flex items-center gap-1 rounded-md border p-0.5", children: [
                                    ['mobile', Smartphone],
                                    ['tablet', Tablet],
                                    ['notebook', Laptop],
                                    ['desktop', Monitor],
                                ].map(([d, Icon]) => (_jsx(Button, { size: "sm", variant: device === d ? 'default' : 'ghost', className: "h-7 px-2", onClick: () => setDevice(d), title: d, children: _jsx(Icon, { className: "h-4 w-4" }) }, d))) })] })] }), hasKeyIssues && (_jsxs("div", { className: "flex items-center gap-2 border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive", children: [_jsx(AlertTriangle, { className: "h-4 w-4 shrink-0" }), "Corrija as chaves dos campos destacados antes de salvar."] })), _jsxs("div", { className: "grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_320px]", children: [_jsxs("div", { className: "hidden border-r bg-muted/30 lg:block", children: [_jsx("div", { className: "border-b px-3 py-2 text-xs font-semibold uppercase text-muted-foreground", children: "Componentes" }), _jsx("div", { className: "max-h-[calc(100vh-16rem)] overflow-y-auto", children: _jsx("div", { className: "grid grid-cols-1 gap-1.5 p-2", children: activeToolbox.map((t) => (_jsxs("button", { onClick: () => addField(t), className: "flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-left text-xs hover:border-primary hover:bg-primary/5", children: [_jsx(Plus, { className: "h-3 w-3 text-muted-foreground" }), _jsx("span", { className: "truncate", children: FIELD_TYPE_LABELS[t] })] }, t))) }) })] }), _jsx("div", { className: "min-w-0 border-r", children: _jsxs(Tabs, { defaultValue: "builder", children: [_jsx("div", { className: "border-b px-3 py-1.5", children: _jsxs(TabsList, { className: "h-8", children: [_jsxs(TabsTrigger, { value: "builder", className: "text-xs", children: [_jsx(Settings2, { className: "mr-1 h-3 w-3" }), " Estrutura"] }), _jsxs(TabsTrigger, { value: "preview", className: "text-xs", children: [_jsx(Eye, { className: "mr-1 h-3 w-3" }), " Preview"] })] }) }), _jsx(TabsContent, { value: "builder", className: "m-0", children: _jsx("div", { className: "h-[500px] overflow-y-auto lg:h-[calc(100vh-19rem)]", children: _jsxs("div", { className: "space-y-2 p-3", children: [_jsxs(Button, { type: "button", variant: "outline", className: "w-full justify-center border-dashed lg:hidden", onClick: () => setToolboxOpen(true), children: [_jsx(Plus, { className: "mr-1 h-4 w-4" }), " Adicionar componente"] }), schema.fields.length === 0 && (_jsx("div", { className: "rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground", children: "Adicione campos pela barra lateral." })), schema.fields.map((f, idx) => (_jsxs("div", { draggable: true, onDragStart: () => setDragIndex(idx), onDragOver: (e) => e.preventDefault(), onDrop: () => {
                                                        if (dragIndex !== null)
                                                            moveField(dragIndex, idx);
                                                        setDragIndex(null);
                                                    }, onClick: () => setSelectedId(f.id), className: cn('group flex items-center gap-2 rounded-md border bg-card p-2 text-sm transition-colors', keyIssues[f.id]
                                                        ? 'border-destructive'
                                                        : selectedId === f.id
                                                            ? 'border-primary ring-1 ring-primary'
                                                            : 'hover:border-primary/40'), children: [_jsx(GripVertical, { className: "h-4 w-4 shrink-0 cursor-grab text-muted-foreground" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate font-medium", children: f.label || 'Sem título' }), _jsxs("p", { className: "truncate text-xs text-muted-foreground", children: [FIELD_TYPE_LABELS[f.type], " \u00B7 ", f.key || '(sem chave)'] }), keyIssues[f.id] && (_jsx("p", { className: "truncate text-xs text-destructive", children: keyIssues[f.id] }))] }), _jsxs(Button, { size: "sm", variant: "ghost", className: "h-7 px-2 text-xs lg:hidden", onClick: (e) => {
                                                                e.stopPropagation();
                                                                setSelectedId(f.id);
                                                                setEditorOpen(true);
                                                            }, children: [_jsx(Settings2, { className: "mr-1 h-3.5 w-3.5" }), " Configurar"] }), _jsx(Button, { size: "icon", variant: "ghost", className: "h-7 w-7", onClick: (e) => {
                                                                e.stopPropagation();
                                                                duplicateField(f.id);
                                                            }, children: _jsx(Copy, { className: "h-3.5 w-3.5" }) }), _jsx(Button, { size: "icon", variant: "ghost", className: "h-7 w-7", onClick: (e) => {
                                                                e.stopPropagation();
                                                                deleteField(f.id);
                                                            }, children: _jsx(Trash2, { className: "h-3.5 w-3.5 text-destructive" }) })] }, f.id)))] }) }) }), _jsx(TabsContent, { value: "preview", className: "m-0", children: _jsxs("div", { className: "bg-muted/20 p-4", children: [_jsx("div", { className: "mx-auto overflow-hidden rounded-lg border bg-background shadow-sm transition-all", children: _jsx("div", { style: { width: `min(100%, ${DEVICE_WIDTH[device]}px)` }, className: "mx-auto p-4", children: _jsx(FormRenderer, { schema: schema, values: values, onChange: setValues, widthOverride: DEVICE_WIDTH[device] }) }) }), _jsx("div", { className: "mt-4", children: _jsx(FormResultViewer, { schema: schema, values: values }) })] }) })] }) }), _jsxs("div", { className: "hidden bg-muted/20 lg:block", children: [_jsx("div", { className: "border-b px-3 py-2 text-xs font-semibold uppercase text-muted-foreground", children: "Propriedades" }), _jsx("div", { className: "h-[calc(100vh-16rem)] overflow-y-auto p-3", children: renderEditor() })] })] }), _jsx("div", { className: "border-t bg-card px-4 py-2", children: _jsx(Accordion, { type: "single", collapsible: true, children: _jsxs(AccordionItem, { value: "json", className: "border-b-0", children: [_jsx(AccordionTrigger, { className: "text-xs font-semibold uppercase text-muted-foreground", children: _jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Code, { className: "h-3.5 w-3.5" }), " JSONs (Configura\u00E7\u00E3o e Respostas)"] }) }), _jsx(AccordionContent, { children: _jsxs("div", { className: "grid grid-cols-1 gap-3 pt-2 lg:grid-cols-2", children: [_jsx("pre", { className: "max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs", children: JSON.stringify(schema, null, 2) }), _jsx("pre", { className: "max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs", children: JSON.stringify(values, null, 2) })] }) })] }) }) }), _jsx(Sheet, { open: editorOpen, onOpenChange: setEditorOpen, children: _jsxs(SheetContent, { side: "right", className: "max-w-md p-0", children: [_jsx(SheetHeader, { children: _jsx(SheetTitle, { children: "Configurar campo" }) }), _jsx("div", { className: "max-h-[calc(100vh-4rem)] overflow-y-auto p-4", children: renderEditor() })] }) }), _jsx(Sheet, { open: toolboxOpen, onOpenChange: setToolboxOpen, children: _jsxs(SheetContent, { side: "bottom", className: "p-0", children: [_jsx(SheetHeader, { children: _jsx(SheetTitle, { children: "Adicionar componente" }) }), _jsx("div", { className: "grid max-h-[70vh] grid-cols-2 gap-2 overflow-y-auto p-4", children: activeToolbox.map((t) => (_jsxs("button", { onClick: () => {
                                    addField(t);
                                    setToolboxOpen(false);
                                }, className: "flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-left text-sm hover:border-primary hover:bg-primary/5", children: [_jsx(Plus, { className: "h-3.5 w-3.5 shrink-0 text-muted-foreground" }), _jsx("span", { className: "truncate", children: FIELD_TYPE_LABELS[t] })] }, t))) })] }) })] }));
}
//# sourceMappingURL=FormBuilder.js.map