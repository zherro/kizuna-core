'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import * as Yup from 'yup';
import { AlertTriangle, CheckCircle2, Inbox, Pencil, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { DynamicField } from './dynamic-field';
import { useDelete, useForm, useResourceOptions, useTable } from '../hooks';
import { formatDateTime } from '../../lib/helper/date.helper';
function isRelationField(field) {
    return field.type === 'relation';
}
function defaultValueFor(field) {
    return field.type === 'switch' ? (field.defaultValue ?? true) : '';
}
function buildInitialValues(fields) {
    const values = {};
    for (const field of fields)
        values[field.name] = defaultValueFor(field);
    return values;
}
function valuesFromItem(fields, item) {
    const values = {};
    for (const field of fields) {
        const raw = item[field.name];
        values[field.name] = field.type === 'switch' ? Boolean(raw) : (raw?.toString() ?? '');
    }
    return values;
}
function buildValidationSchema(fields) {
    const shape = {};
    for (const field of fields) {
        if (field.type === 'textarea') {
            const max = field.maxLength ?? 240;
            shape[field.name] = Yup.string().max(max, `Use no maximo ${max} caracteres.`);
        }
        else if (field.type === 'switch') {
            shape[field.name] = Yup.boolean().required('Informe o status.');
        }
        else {
            shape[field.name] =
                field.required === false
                    ? Yup.string()
                    : Yup.string().trim().required(`Informe ${field.label.toLowerCase()}.`);
        }
    }
    return Yup.object(shape);
}
/**
 * Generic "form + searchable/paginated list" CRUD block, driven entirely by
 * `ResourceScreenConfig`. Backs every screen registered as `resource-screen`
 * in `screen-engine/registry.ts` — `categorias` and `subcategorias` are two
 * independent resources rendered by this exact same component, which is the
 * point: the component carries no resource-specific code, only the config
 * does.
 */
export function ResourceScreen({ config }) {
    const relationField = config.fields.find(isRelationField) ?? null;
    const [selectedItem, setSelectedItem] = useState(null);
    const relationOptions = useResourceOptions({
        resource: relationField?.optionsResource ?? '__none__',
        labelField: relationField?.optionsLabelField ?? 'name',
        filter: relationField?.optionsFilter,
    });
    const relationLabelField = relationField?.optionsLabelField ?? 'name';
    const relationOptionsById = useMemo(() => {
        const map = new Map();
        for (const item of relationOptions.options) {
            map.set(String(item.id), String(item[relationLabelField] ?? item.id));
        }
        return map;
    }, [relationOptions.options, relationLabelField]);
    const initialValues = useMemo(() => buildInitialValues(config.fields), [config.fields]);
    const validationSchema = useMemo(() => buildValidationSchema(config.fields), [config.fields]);
    const blockedByMissingRelation = Boolean(config.requireRelationToCreate) &&
        Boolean(relationField) &&
        !relationOptions.loading &&
        relationOptions.options.length === 0;
    const { items, loading, error: tableError, clearError, search, setSearch, page, total, totalPages, load, goToPage, submitSearch, } = useTable({
        resource: config.resource,
        pageSize: config.pageSize ?? 8,
        orderBy: config.orderBy ?? 'name',
        orderDirection: config.orderDirection ?? 'asc',
    });
    function selectItem(item) {
        setSelectedItem(item);
        formik.setValues(valuesFromItem(config.fields, item));
        formik.setTouched({});
        formik.setErrors({});
        form.clearFeedback();
        clearError();
    }
    const messages = config.messages ?? {};
    const form = useForm({
        initialValues,
        validationSchema,
        onReset: () => setSelectedItem(null),
        resourceSubmit: {
            resource: config.resource,
            selectedId: selectedItem?.id ?? null,
            errorMessage: messages.saveError ?? `Nao foi possivel salvar o registro.`,
            successMessage: messages.saveSuccess ?? `Registro salvo com sucesso.`,
            connectionErrorMessage: messages.connectionError ?? `Erro de conexao com a API.`,
            onSuccess: async (data, { reset }) => {
                const wasEditing = Boolean(selectedItem);
                await load(page, search);
                if (wasEditing && data.item) {
                    selectItem(data.item);
                }
                else {
                    reset();
                }
            },
        },
    });
    const { formik } = form;
    const selectedId = selectedItem?.id ?? null;
    const isEditing = Boolean(selectedItem);
    const error = form.error || tableError;
    const success = form.success;
    const deleteAction = useDelete({
        resource: config.resource,
        selectedId,
        errorMessage: messages.deleteError ?? `Nao foi possivel remover o registro.`,
        successMessage: messages.deleteSuccess ?? `Registro removido com sucesso.`,
        connectionErrorMessage: messages.connectionError ?? `Erro de conexao com a API.`,
        setError: form.setError,
        setSuccess: form.setSuccess,
        onSuccess: async () => {
            form.reset();
            const nextPage = items.length === 1 && page > 1 ? page - 1 : page;
            await load(nextPage, search);
        },
    });
    useEffect(() => {
        const timer = window.setTimeout(() => {
            void load(1, '');
        }, 0);
        return () => {
            window.clearTimeout(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (_jsxs("div", { className: "grid gap-6 lg:grid-cols-[1.1fr_0.9fr]", children: [error ? (_jsxs("div", { className: "flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300 lg:col-span-2", children: [_jsx(AlertTriangle, { className: "mt-0.5 h-4 w-4 shrink-0", "aria-hidden": "true" }), _jsx("p", { children: error })] })) : null, success ? (_jsxs("div", { className: "flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300 lg:col-span-2", children: [_jsx(CheckCircle2, { className: "mt-0.5 h-4 w-4 shrink-0", "aria-hidden": "true" }), _jsx("p", { children: success })] })) : null, _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: isEditing ? `Editar ${config.entitySingular}` : `Nova ${config.entitySingular}` }), _jsx(CardDescription, { children: isEditing
                                    ? 'Atualize os dados e salve para refletir na listagem.'
                                    : `Preencha os campos abaixo para adicionar uma nova ${config.entitySingular}.` })] }), _jsx(CardContent, { children: _jsxs("form", { onSubmit: form.handleSubmit, className: "space-y-4", children: [config.fields.map((field) => {
                                    const touched = Boolean(formik.touched[field.name]);
                                    const errorValue = formik.errors[field.name];
                                    return (_jsx(DynamicField, { field: field, value: formik.values[field.name], error: touched && typeof errorValue === 'string' ? errorValue : undefined, onChange: (value) => void formik.setFieldValue(field.name, value), onBlur: () => void formik.setFieldTouched(field.name, true), relationOptions: field.type === 'relation'
                                            ? relationOptions.options.map((item) => ({
                                                value: String(item.id),
                                                label: String(item[relationLabelField] ?? item.id),
                                            }))
                                            : undefined }, field.name));
                                }), _jsxs("div", { className: "flex flex-col gap-2 sm:flex-row", children: [_jsxs(Button, { type: "submit", className: "sm:flex-1", disabled: form.submitting || blockedByMissingRelation, children: [_jsx(Pencil, { className: "h-4 w-4" }), form.submitting
                                                    ? 'Salvando...'
                                                    : isEditing
                                                        ? 'Salvar alteracoes'
                                                        : `Criar ${config.entitySingular}`] }), _jsx(Button, { type: "button", variant: "outline", onClick: form.reset, disabled: form.submitting || deleteAction.deleting, children: "Limpar" }), isEditing ? (_jsxs(Button, { type: "button", variant: "outline", onClick: () => void deleteAction.remove(), disabled: form.submitting || deleteAction.deleting, className: "border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-900/70 dark:text-red-300 dark:hover:bg-red-950/40", children: [_jsx(Trash2, { className: "h-4 w-4" }), deleteAction.deleting ? 'Removendo...' : 'Excluir'] })) : null] }), blockedByMissingRelation ? (_jsxs("p", { className: "text-xs text-amber-700 dark:text-amber-300", children: ["Cadastre ao menos um registro ativo em \"", relationField?.label, "\" antes de criar ", config.entityPlural, "."] })) : null] }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Listagem" }), _jsx(CardDescription, { children: "Selecione um registro para editar ou remova quando necessario." })] }), _jsxs("span", { className: "rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground", children: [total, " registro(s)"] })] }) }), _jsxs(CardContent, { children: [_jsxs("form", { onSubmit: (event) => {
                                    void submitSearch(event);
                                    form.clearFeedback();
                                }, className: "mb-4 flex gap-2", children: [_jsx(Input, { value: search, onChange: (event) => setSearch(event.target.value), placeholder: config.searchPlaceholder ?? `Buscar ${config.entityPlural}` }), _jsx(Button, { type: "submit", variant: "outline", children: "Buscar" })] }), loading ? (_jsx("p", { className: "text-sm text-muted-foreground", children: "Carregando..." })) : items.length === 0 ? (_jsxs("div", { className: "rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center", children: [_jsx(Inbox, { className: "mx-auto h-8 w-8 text-muted-foreground", "aria-hidden": "true" }), _jsx("p", { className: "mt-3 text-sm text-muted-foreground", children: config.emptyMessage ?? `Nenhum registro de ${config.entityPlural} ainda.` })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "space-y-3", children: items.map((item) => {
                                            const active = item.id === selectedId;
                                            const statusValue = config.list.statusField
                                                ? Boolean(item[config.list.statusField])
                                                : null;
                                            return (_jsxs("button", { type: "button", onClick: () => selectItem(item), className: `w-full rounded-xl border px-4 py-3 text-left transition ${active
                                                    ? 'border-primary bg-primary/5 shadow-sm'
                                                    : 'border-border bg-background hover:border-primary/40 hover:bg-accent/40'}`, children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium text-foreground", children: String(item[config.list.primaryField] ?? '') }), config.list.secondaryField ? (_jsx("p", { className: "mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground", children: String(item[config.list.secondaryField] ?? '') })) : null] }), _jsx("span", { className: "rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground", children: formatDateTime(String(item.createdAt ?? item.updatedAt ?? '')) })] }), relationField && config.list.relationLabelPrefix ? (_jsxs("p", { className: "mt-2 text-xs text-muted-foreground", children: [config.list.relationLabelPrefix, relationOptionsById.get(String(item[relationField.name])) ?? '-'] })) : null, statusValue !== null ? (_jsxs("p", { className: "mt-2 text-xs font-semibold text-muted-foreground", children: ["Status: ", statusValue ? 'ATIVO' : 'INATIVO'] })) : null, config.list.descriptionField && item[config.list.descriptionField] ? (_jsx("p", { className: "mt-3 text-sm text-muted-foreground", children: String(item[config.list.descriptionField]) })) : null] }, item.id));
                                        }) }), _jsxs("div", { className: "mt-4 flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3 py-2", children: [_jsxs("p", { className: "text-xs text-muted-foreground", children: ["Pagina ", page, " de ", totalPages || 1] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", variant: "outline", size: "sm", onClick: () => void goToPage(page - 1), disabled: page <= 1 || loading, children: "Anterior" }), _jsx(Button, { type: "button", variant: "outline", size: "sm", onClick: () => void goToPage(page + 1), disabled: totalPages === 0 || page >= totalPages || loading, children: "Proxima" })] })] })] }))] })] })] }));
}
//# sourceMappingURL=resource-screen.js.map