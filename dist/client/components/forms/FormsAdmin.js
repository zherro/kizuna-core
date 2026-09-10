'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTable } from '../../hooks/use-table';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { ModalPanel } from '../ui-better-soft/overlay/modal-panel';
import { FormBuilder } from '../form-builder';
const EMPTY_SCHEMA = { title: '', description: '', fields: [] };
const SLUG_RE = /^[a-z][a-z0-9_]*$/;
function blankEdit() {
    return {
        id: null,
        formKey: '',
        title: '',
        description: '',
        isReusable: true,
        active: true,
        schema: EMPTY_SCHEMA,
    };
}
/**
 * Admin surface for the `forms` plugin table: list every form, create a new one, or edit an
 * existing one's metadata + `schema` (via the form-builder `FormBuilder`). Save is a
 * POST/PUT against the generic `forms` resource route. `version` is bumped server-side by the
 * `fn_forms_bump_version` trigger whenever `schema` actually changes.
 */
export function FormsAdmin() {
    const table = useTable({
        resource: 'forms',
        orderBy: 'title',
        orderDirection: 'asc',
        pageSize: 12,
    });
    const [edit, setEdit] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const openNew = useCallback(() => {
        setSaveError('');
        setEdit(blankEdit());
    }, []);
    const openEdit = useCallback((row) => {
        setSaveError('');
        setEdit({
            id: row.id,
            formKey: row.formKey,
            title: row.title,
            description: row.description ?? '',
            isReusable: row.isReusable,
            active: row.active,
            schema: row.schema && Object.keys(row.schema).length > 0 ? row.schema : EMPTY_SCHEMA,
        });
    }, []);
    const close = useCallback(() => setEdit(null), []);
    const save = useCallback(async () => {
        if (!edit)
            return;
        if (!SLUG_RE.test(edit.formKey.trim())) {
            setSaveError('form_key invalido — use minusculas, comecando por letra (ex.: eventos_som).');
            return;
        }
        if (!edit.title.trim()) {
            setSaveError('Informe um titulo.');
            return;
        }
        setSaving(true);
        setSaveError('');
        try {
            const body = {
                formKey: edit.formKey.trim(),
                title: edit.title.trim(),
                description: edit.description.trim(),
                isReusable: edit.isReusable,
                active: edit.active,
                schema: edit.schema,
            };
            const url = edit.id ? `/api/resources/forms/${edit.id}` : '/api/resources/forms';
            const response = await fetch(url, {
                method: edit.id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = (await response.json().catch(() => null));
            if (!response.ok) {
                setSaveError(data?.message || 'Nao foi possivel salvar o formulario.');
                return;
            }
            close();
            await table.refresh();
        }
        catch {
            setSaveError('Erro de conexao ao salvar o formulario.');
        }
        finally {
            setSaving(false);
        }
    }, [edit, close, table]);
    useEffect(() => {
        if (!edit)
            setSaveError('');
    }, [edit]);
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("form", { ...table.searchFormProps, className: "flex-1", children: _jsx(Input, { ...table.searchInputProps, placeholder: "Buscar por chave, titulo ou descricao" }) }), _jsxs(Button, { onClick: openNew, children: [_jsx(Plus, { className: "mr-1 h-4 w-4" }), " Novo formulario"] })] }), table.error ? _jsx("p", { className: "text-xs text-red-400", children: table.error }) : null, _jsx("ul", { className: "divide-y divide-border rounded-md border border-border", children: table.loading ? (_jsx("li", { className: "px-3 py-3 text-sm text-muted-foreground", children: "Carregando..." })) : table.items.length === 0 ? (_jsx("li", { className: "px-3 py-3 text-sm text-muted-foreground", children: "Nenhum formulario cadastrado." })) : (table.items.map((row) => (_jsxs("li", { className: "flex items-center justify-between gap-3 px-3 py-3", children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("p", { className: "truncate text-sm font-medium text-foreground", children: [row.title, ' ', _jsxs("span", { className: "text-xs font-normal text-muted-foreground", children: ["(", row.formKey, ")"] })] }), _jsxs("p", { className: "truncate text-xs text-muted-foreground", children: ["v", row.version, " \u00B7 ", row.isReusable ? 'reutilizavel' : 'exclusivo', " \u00B7", ' ', row.active ? 'ativo' : 'inativo'] })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => openEdit(row), children: "Editar" })] }, String(row.id))))) }), table.totalPages > 1 ? (_jsxs("div", { className: "flex items-center justify-between text-xs text-muted-foreground", children: [_jsx(Button, { variant: "ghost", size: "sm", disabled: !table.canGoPrevious, onClick: () => void table.goToPage(table.page - 1), children: "Anterior" }), _jsxs("span", { children: ["Pagina ", table.page, " de ", table.totalPages] }), _jsx(Button, { variant: "ghost", size: "sm", disabled: !table.canGoNext, onClick: () => void table.goToPage(table.page + 1), children: "Proxima" })] })) : null, _jsx(ModalPanel, { open: Boolean(edit), onClose: close, title: edit?.id ? 'Editar formulario' : 'Novo formulario', description: "Metadados e o esquema de campos (form-builder).", wide: true, headerFixed: true, footerFixed: true, footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "ghost", onClick: close, disabled: saving, children: "Cancelar" }), _jsx(Button, { onClick: () => void save(), disabled: saving, children: saving ? 'Salvando...' : 'Salvar' })] }), children: edit ? (_jsxs("div", { className: "space-y-4", children: [saveError ? _jsx("p", { className: "text-xs text-red-400", children: saveError }) : null, _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "form-key", children: "Chave (form_key)" }), _jsx(Input, { id: "form-key", value: edit.formKey, disabled: Boolean(edit.id), onChange: (e) => setEdit((cur) => (cur ? { ...cur, formKey: e.target.value } : cur)), placeholder: "ex.: eventos_som_iluminacao" }), edit.id ? (_jsx("p", { className: "text-xs text-muted-foreground", children: "A chave nao pode ser alterada depois de criada." })) : null] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "form-title", children: "Titulo" }), _jsx(Input, { id: "form-title", value: edit.title, onChange: (e) => setEdit((cur) => (cur ? { ...cur, title: e.target.value } : cur)) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "form-desc", children: "Descricao" }), _jsx(Input, { id: "form-desc", value: edit.description, onChange: (e) => setEdit((cur) => (cur ? { ...cur, description: e.target.value } : cur)) })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Switch, { checked: edit.isReusable, onCheckedChange: (v) => setEdit((cur) => (cur ? { ...cur, isReusable: v } : cur)) }), _jsx("span", { className: "text-sm", children: "Reutilizavel (aparece nos seletores)" })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Switch, { checked: edit.active, onCheckedChange: (v) => setEdit((cur) => (cur ? { ...cur, active: v } : cur)) }), _jsx("span", { className: "text-sm", children: "Ativo" })] }), _jsx("div", { className: "border-t border-border pt-4", children: _jsx(FormBuilder, { value: edit.schema, onChange: (schema) => setEdit((cur) => (cur ? { ...cur, schema } : cur)) }) })] })) : null })] }));
}
//# sourceMappingURL=FormsAdmin.js.map