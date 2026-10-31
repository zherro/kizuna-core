'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { BsButton } from './buttons/bs-button';
import { ToggleRow } from './toggle-row';
/**
 * Saves one `auth.system_config` row's whole `value` through the generic
 * `/api/resources/system_config/<key>` resource route (any project consuming the `system_config`
 * plugin exposes this the same way — see `plugins/system_config/0001_system_config.sql`). PATCH
 * first (the row already exists once a project seeds its own config values); a 404 means a fresh
 * database that hasn't been seeded yet, so it falls back to POST-create with the same key/value.
 */
async function saveConfigKey(key, value) {
    const body = JSON.stringify({ key, value });
    const patchRes = await fetch(`/api/resources/system_config/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body,
    });
    if (patchRes.status === 404) {
        const postRes = await fetch('/api/resources/system_config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
        });
        const postData = await postRes.json().catch(() => ({}));
        return { ok: postRes.ok, message: postData?.message };
    }
    const patchData = await patchRes.json().catch(() => ({}));
    return { ok: patchRes.ok, message: patchData?.message };
}
function SaveFeedback({ state }) {
    if (state === 'saved') {
        return _jsx("p", { className: "text-xs font-medium text-emerald-600", children: "Salvo com sucesso." });
    }
    if (state === 'error') {
        return _jsx("p", { className: "text-xs font-medium text-destructive", children: "N\u00E3o foi poss\u00EDvel salvar." });
    }
    return null;
}
/**
 * One editable `auth.system_config` row, driven entirely by `fields` — a project defines which
 * keys of the jsonb `value` exist and how to edit them (toggle/select/textarea), this component
 * renders the card and handles save. Generic: knows nothing about what the config key actually
 * means (a project's own screen supplies that via `title`/`description`/field labels).
 */
export function SystemConfigSection({ configKey, title, description, fields, initialValue, }) {
    const [value, setValue] = useState(initialValue);
    const [saveState, setSaveState] = useState('idle');
    function setField(key, fieldValue) {
        setValue((current) => ({ ...current, [key]: fieldValue }));
        setSaveState('idle');
    }
    async function handleSave() {
        setSaveState('saving');
        const result = await saveConfigKey(configKey, value);
        setSaveState(result.ok ? 'saved' : 'error');
    }
    return (_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: title }), description ? _jsx(CardDescription, { children: description }) : null] }), _jsxs(CardContent, { className: "space-y-4", children: [fields.map((field) => {
                        const disabled = field.disabledWhen?.(value) ?? false;
                        if (field.type === 'toggle') {
                            return (_jsx(ToggleRow, { title: field.title, subtitle: field.subtitle, checked: Boolean(value[field.key]), disabled: disabled, onChange: (checked) => setField(field.key, checked) }, field.key));
                        }
                        if (field.type === 'select') {
                            return (_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: `${configKey}-${field.key}`, children: field.label }), _jsx("select", { id: `${configKey}-${field.key}`, className: "flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", value: String(value[field.key] ?? ''), disabled: disabled, onChange: (e) => setField(field.key, e.target.value), children: field.options.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }, field.key));
                        }
                        return (_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: `${configKey}-${field.key}`, children: field.label }), _jsx(Textarea, { id: `${configKey}-${field.key}`, rows: 3, placeholder: field.placeholder, disabled: disabled, value: value[field.key] ?? '', onChange: (e) => {
                                        const text = e.target.value;
                                        setField(field.key, text.trim() ? text : null);
                                    } }), field.helperText ? (_jsx("p", { className: "text-xs text-muted-foreground", children: field.helperText })) : null] }, field.key));
                    }), _jsxs("div", { className: "flex items-center justify-between gap-4 pt-2", children: [_jsx(SaveFeedback, { state: saveState }), _jsx(BsButton, { label: saveState === 'saving' ? 'Salvando...' : 'Salvar', icon: Save, disabled: saveState === 'saving', onClick: () => void handleSave() })] })] })] }));
}
//# sourceMappingURL=system-config-section.js.map