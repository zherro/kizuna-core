'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { DynamicFormStep } from '../../forms';
export function getDynamicFormHolder(ctx) {
    const entities = ctx.entities;
    if (!entities.dynamicFormRef)
        entities.dynamicFormRef = { current: null };
    return entities.dynamicFormRef;
}
export function dynamicFormCategory(ctx) {
    const categories = ctx.entities.categories ?? [];
    return categories.find((c) => String(c.id) === String(ctx.state.categoryId));
}
/**
 * Passo dinâmico por categoria (plugin `forms`). Só aparece quando a categoria escolhida tem
 * `formKey` E o `services` já existe (precisa de `referenceId`). Envolve o `DynamicFormStep`
 * (handle imperativo): guarda o handle no holder de `entities` pro `persist` do registry, e
 * reporta validade via `patch({ dynamicFormValid })`.
 */
export function StepDynamicForm(props) {
    const { patch, resourceId } = props;
    const localRef = useRef(null);
    const category = dynamicFormCategory(props);
    const formKey = String(category?.formKey ?? '').trim();
    const holder = getDynamicFormHolder(props);
    useEffect(() => {
        holder.current = localRef.current;
        return () => {
            holder.current = null;
        };
    });
    if (!formKey || resourceId == null)
        return null;
    return (_jsx(DynamicFormStep, { ref: localRef, formKey: formKey, domain: "service", referenceId: String(resourceId), onValidChange: (valid) => patch({ dynamicFormValid: valid }) }));
}
//# sourceMappingURL=step-dynamic-form.js.map