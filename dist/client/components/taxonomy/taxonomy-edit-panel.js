'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import * as Yup from 'yup';
import { HelpCircle } from 'lucide-react';
import { Label } from '@kizuna/core/client/components/ui/label';
import { Input } from '@kizuna/core/client/components/ui/input';
import { Button } from '@kizuna/core/client/components/ui/button';
import { SearchableSelect } from '@kizuna/core/client/components/ui/searchable-select';
import { ModalPanel } from '@kizuna/core/client/components/ui-better-soft/overlay/modal-panel';
import { FormField } from '@kizuna/core/client/components/ui-better-soft/forms/form-field';
import { useForm } from '@kizuna/core/client';
import { resolveLucideIcon } from '@kizuna/core/lib/utils';
import { TAXONOMY_LEVEL_LABEL, TAXONOMY_RESOURCE_BY_LEVEL, slugify, } from './taxonomy-types';
const EMPTY_VALUES = {
    name: '',
    slug: '',
    description: '',
    active: true,
    categoryId: '',
    categorySubId: '',
    groupId: '',
    tags: '',
    sortOrder: '0',
    icon: '',
    formKey: '',
    requestFormKey: '',
};
function buildInitialValues(target) {
    if (!target)
        return EMPTY_VALUES;
    if (target.level === 'group') {
        const item = target.item;
        return {
            ...EMPTY_VALUES,
            name: item?.name ?? '',
            slug: item?.slug ?? '',
            description: item?.description ?? '',
            tags: item?.tags ?? '',
            icon: item?.icon ?? '',
            active: item?.active ?? true,
            sortOrder: String(item?.sortOrder ?? target.defaultSortOrder ?? 0),
        };
    }
    if (target.level === 'category') {
        const item = target.item;
        return {
            ...EMPTY_VALUES,
            name: item?.name ?? '',
            slug: item?.slug ?? '',
            description: item?.description ?? '',
            icon: item?.icon ?? '',
            formKey: item?.formKey ?? '',
            requestFormKey: item?.requestFormKey ?? '',
            active: item?.active ?? true,
            groupId: item?.categoryGroupId != null ? String(item.categoryGroupId) : '',
        };
    }
    if (target.level === 'subcategory') {
        const item = target.item;
        return {
            ...EMPTY_VALUES,
            name: item?.name ?? '',
            slug: item?.slug ?? '',
            description: item?.description ?? '',
            active: item?.active ?? true,
            categoryId: String(item?.categoryId ?? target.defaultCategoryId ?? ''),
        };
    }
    const item = target.item;
    return {
        ...EMPTY_VALUES,
        name: item?.name ?? '',
        slug: item?.slug ?? '',
        description: item?.description ?? '',
        active: item?.active ?? true,
        categoryId: String(item?.categoryId ?? target.defaultCategoryId ?? ''),
        categorySubId: String(item?.categorySubId ?? target.defaultCategorySubId ?? ''),
    };
}
async function checkSlugTaken(resource, slug, excludeId) {
    const normalized = slug.trim();
    if (!normalized)
        return false;
    const query = new URLSearchParams({ 'filter.slug': normalized, page: '1', pageSize: '5' });
    try {
        const response = await fetch(`/api/resources/${resource}?${query.toString()}`, {
            cache: 'no-store',
        });
        if (!response.ok)
            return false;
        const data = (await response.json().catch(() => null)) ?? null;
        const items = data?.items ?? [];
        return items.some((item) => String(item.id) !== String(excludeId ?? ''));
    }
    catch {
        return false;
    }
}
function SlugField({ formik, resource, excludeId, status, onStatusChange, }) {
    const error = formik.touched.slug && typeof formik.errors.slug === 'string' ? formik.errors.slug : '';
    async function handleBlur() {
        formik.setFieldTouched('slug', true);
        const value = formik.values.slug.trim();
        if (!value) {
            onStatusChange('idle');
            return;
        }
        onStatusChange('checking');
        const taken = await checkSlugTaken(resource, value, excludeId);
        onStatusChange(taken ? 'taken' : 'available');
        if (taken) {
            formik.setFieldError('slug', 'Esse slug ja esta em uso. Escolha outro.');
        }
    }
    function handleGenerate() {
        const generated = slugify(formik.values.name);
        void formik.setFieldValue('slug', generated);
        onStatusChange('idle');
    }
    return (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Label, { htmlFor: "taxonomy-slug", children: "Slug" }), _jsx("button", { type: "button", onClick: handleGenerate, className: "text-xs font-medium text-primary hover:underline", children: "Gerar do nome" })] }), _jsx(Input, { id: "taxonomy-slug", name: "slug", value: formik.values.slug, onChange: (event) => {
                    void formik.setFieldValue('slug', event.target.value);
                    onStatusChange('idle');
                }, onBlur: () => void handleBlur(), placeholder: "ex.: troca-de-chuveiro" }), status === 'checking' ? (_jsx("p", { className: "text-xs text-muted-foreground", children: "Verificando disponibilidade..." })) : null, status === 'available' && !error ? (_jsx("p", { className: "text-xs text-emerald-600 dark:text-emerald-400", children: "Slug disponivel." })) : null, error ? _jsx("p", { className: "text-xs text-red-400", children: error }) : null] }));
}
export function TaxonomyEditPanel({ target, groups, categories, subcategories, onClose, onSaved, }) {
    const [slugStatus, setSlugStatus] = useState('idle');
    const level = target?.level ?? 'tag';
    const resource = TAXONOMY_RESOURCE_BY_LEVEL[level];
    const levelLabel = TAXONOMY_LEVEL_LABEL[level];
    const isEditing = Boolean(target?.item);
    const selectedId = target?.item?.id != null ? String(target.item.id) : null;
    const validationSchema = useMemo(() => Yup.object({
        name: Yup.string().trim().required('Informe o nome.'),
        slug: Yup.string()
            .trim()
            .required('Informe o slug.')
            .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use apenas letras minusculas, numeros e hifen.'),
        description: Yup.string().max(240, 'Use no maximo 240 caracteres.'),
        tags: Yup.string().max(240, 'Use no maximo 240 caracteres.'),
        active: Yup.boolean().required(),
        categoryId: level === 'subcategory' || level === 'tag'
            ? Yup.string().required('Selecione a categoria.')
            : Yup.string(),
        categorySubId: level === 'tag' ? Yup.string().required('Selecione a especialidade.') : Yup.string(),
    }), [level]);
    const form = useForm({
        initialValues: EMPTY_VALUES,
        validationSchema,
        resourceSubmit: {
            resource,
            selectedId,
            toPayload: (values) => {
                if (level === 'group') {
                    return {
                        name: values.name.trim(),
                        slug: values.slug.trim(),
                        description: values.description.trim(),
                        tags: values.tags.trim(),
                        icon: values.icon.trim(),
                        sortOrder: Number(values.sortOrder) || 0,
                        active: values.active,
                    };
                }
                const base = {
                    name: values.name.trim(),
                    slug: values.slug.trim(),
                    description: values.description.trim(),
                    active: values.active,
                };
                if (level === 'category') {
                    base.icon = values.icon.trim();
                    base.categoryGroupId = values.groupId ? values.groupId : null;
                    base.formKey = values.formKey.trim() || null;
                    base.requestFormKey = values.requestFormKey.trim() || null;
                }
                if (level === 'subcategory')
                    base.categoryId = Number(values.categoryId);
                if (level === 'tag') {
                    base.categoryId = Number(values.categoryId);
                    base.categorySubId = Number(values.categorySubId);
                }
                return base;
            },
            errorMessage: `Nao foi possivel salvar a ${levelLabel}.`,
            successMessage: `${levelLabel.charAt(0).toUpperCase()}${levelLabel.slice(1)} salva com sucesso.`,
            connectionErrorMessage: 'Erro de conexao com a API.',
            onSuccess: async (data) => {
                if (data.item)
                    onSaved(level, data.item);
                onClose();
            },
        },
    });
    const { formik } = form;
    const targetKey = target
        ? `${target.level}:${target.item?.id ?? 'new'}:${target.item?.slug ?? ''}`
        : 'closed';
    useEffect(() => {
        if (!target)
            return;
        const timer = window.setTimeout(() => {
            formik.resetForm({ values: buildInitialValues(target) });
            formik.setTouched({});
            formik.setErrors({});
            setSlugStatus('idle');
        }, 0);
        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetKey]);
    const IconPreview = useMemo(() => resolveLucideIcon(formik.values.icon), [formik.values.icon]);
    const groupOptions = useMemo(() => groups.map((group) => ({ value: String(group.id), label: group.name })), [groups]);
    const categoryOptions = useMemo(() => categories.map((category) => ({ value: String(category.id), label: category.name })), [categories]);
    const subcategoryOptions = useMemo(() => {
        if (!formik.values.categoryId)
            return [];
        return subcategories
            .filter((subcategory) => String(subcategory.categoryId) === formik.values.categoryId)
            .map((subcategory) => ({ value: String(subcategory.id), label: subcategory.name }));
    }, [subcategories, formik.values.categoryId]);
    useEffect(() => {
        if (level !== 'tag' || !formik.values.categorySubId)
            return;
        const stillValid = subcategories.some((subcategory) => String(subcategory.id) === formik.values.categorySubId &&
            String(subcategory.categoryId) === formik.values.categoryId);
        if (!stillValid) {
            void formik.setFieldValue('categorySubId', '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formik.values.categoryId]);
    return (_jsx(ModalPanel, { open: Boolean(target), onClose: onClose, title: `${isEditing ? 'Editar' : 'Nova'} ${levelLabel}`, description: level === 'group'
            ? 'Grupo de topo — contexto de vida usado para guiar o usuario.'
            : level === 'category'
                ? 'Categoria — contexto de necessidade do usuario, dentro de um grupo.'
                : level === 'subcategory'
                    ? 'Especialidade dentro de uma categoria — tipo de profissional.'
                    : 'Tag de busca dentro de uma especialidade.', footerFixed: true, headerFixed: true, footer: _jsxs(_Fragment, { children: [_jsx(Button, { type: "button", variant: "ghost", onClick: onClose, children: "Cancelar" }), _jsx(Button, { type: "button", onClick: () => void formik.submitForm(), disabled: form.submitting, children: form.submitting ? 'Salvando...' : 'Salvar' })] }), children: _jsxs("div", { className: "space-y-4", children: [level === 'category' ? (_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "taxonomy-group", children: "Grupo" }), _jsx(SearchableSelect, { id: "taxonomy-group", value: formik.values.groupId, onChange: (value) => void formik.setFieldValue('groupId', value), onBlur: () => formik.setFieldTouched('groupId', true), options: groupOptions, placeholder: "Selecione um grupo", disabled: groupOptions.length === 0 })] })) : null, level === 'subcategory' || level === 'tag' ? (_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "taxonomy-category", children: "Categoria" }), _jsx(SearchableSelect, { id: "taxonomy-category", value: formik.values.categoryId, onChange: (value) => void formik.setFieldValue('categoryId', value), onBlur: () => formik.setFieldTouched('categoryId', true), options: categoryOptions, placeholder: "Selecione uma categoria", disabled: categoryOptions.length === 0 }), formik.touched.categoryId && formik.errors.categoryId ? (_jsx("p", { className: "text-xs text-red-400", children: formik.errors.categoryId })) : null] })) : null, level === 'tag' ? (_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "taxonomy-subcategory", children: "Especialidade" }), _jsx(SearchableSelect, { id: "taxonomy-subcategory", value: formik.values.categorySubId, onChange: (value) => void formik.setFieldValue('categorySubId', value), onBlur: () => formik.setFieldTouched('categorySubId', true), options: subcategoryOptions, placeholder: formik.values.categoryId
                                ? 'Selecione uma especialidade'
                                : 'Escolha a categoria primeiro', disabled: !formik.values.categoryId }), formik.touched.categorySubId && formik.errors.categorySubId ? (_jsx("p", { className: "text-xs text-red-400", children: formik.errors.categorySubId })) : null] })) : null, _jsx(FormField, { formik: formik, field: "name", label: "Nome", placeholder: "Ex.: Eletricista" }), _jsx(SlugField, { formik: formik, resource: resource, excludeId: selectedId, status: slugStatus, onStatusChange: setSlugStatus }), _jsx(FormField, { formik: formik, field: "description", as: "textarea", label: "Descricao", placeholder: "Opcional", rows: 3 }), level === 'group' ? (_jsx(FormField, { formik: formik, field: "tags", label: "Tags de destaque", placeholder: "Ex.: casa, reforma, reparo" })) : null, level === 'group' || level === 'category' ? (_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "taxonomy-icon", children: "Icone" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/30", children: IconPreview ? (_jsx(IconPreview, { className: "h-4 w-4 text-foreground" })) : (_jsx(HelpCircle, { className: "h-4 w-4 text-muted-foreground" })) }), _jsx(Input, { id: "taxonomy-icon", name: "icon", value: formik.values.icon, onChange: (event) => void formik.setFieldValue('icon', event.target.value.trim()), placeholder: "Nome do icone (lucide-react), ex.: Home" })] }), _jsxs("p", { className: "text-xs text-muted-foreground", children: ["Nome de um icone de", ' ', _jsx("a", { href: "https://lucide.dev/icons", target: "_blank", rel: "noreferrer", className: "underline", children: "lucide.dev/icons" }), ", ex.: Home, Car, Sparkles."] })] })) : null, level === 'category' ? (_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "taxonomy-form-key", children: "Formulario dinamico (form_key)" }), _jsx(Input, { id: "taxonomy-form-key", name: "formKey", value: formik.values.formKey, onChange: (event) => void formik.setFieldValue('formKey', event.target.value.trim()), placeholder: "ex.: eventos_som_iluminacao (opcional)" }), _jsxs("p", { className: "text-xs text-muted-foreground", children: ["Chave de um formulario ativo em", ' ', _jsx("a", { href: "/painel/administracao/formularios", className: "underline", children: "Formularios" }), ". Quando preenchida, o wizard de servicos mostra as perguntas desse formulario para esta categoria."] })] })) : null, level === 'category' ? (_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "taxonomy-request-form-key", children: "Formul\u00E1rio de solicita\u00E7\u00E3o (request_form_key)" }), _jsx(Input, { id: "taxonomy-request-form-key", name: "requestFormKey", value: formik.values.requestFormKey, onChange: (event) => void formik.setFieldValue('requestFormKey', event.target.value.trim()), placeholder: "ex.: solicitacao_orcamento_eventos (opcional)" }), _jsxs("p", { className: "text-xs text-muted-foreground", children: ["Chave de um formulario ativo em", ' ', _jsx("a", { href: "/painel/administracao/formularios", className: "underline", children: "Formularios" }), ". Quando preenchida, o comprador preenche esse formulario ao solicitar um orcamento ou fechar um pedido nesta categoria."] })] })) : null, _jsx(FormField, { formik: formik, field: "active", as: "switch", label: "Ativo" })] }) }));
}
//# sourceMappingURL=taxonomy-edit-panel.js.map