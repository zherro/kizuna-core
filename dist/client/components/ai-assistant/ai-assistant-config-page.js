'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
/** Provedores conhecidos. Só `gemini` está implementado hoje; os demais aparecem desabilitados. */
const PROVIDER_OPTIONS = [
    { value: 'gemini', label: 'Gemini (Google)', enabled: true },
    { value: 'openai', label: 'OpenAI — em breve', enabled: false },
    { value: 'claude', label: 'Claude (Anthropic) — em breve', enabled: false },
];
/**
 * Tela de configuração do plugin `ai_assistant` (provedor + modelo + contextos ligados).
 *
 * O core NÃO lê nem grava `system_config` — recebe os valores atuais por `value` e devolve a
 * edição por `onSave` (decisão do spec §2.3: mantém o core sem depender de um resource específico).
 * O componente só renderiza o formulário, rastreia a edição local e chama `onSave` no submit.
 */
export function AiAssistantConfigPage({ contexts, value, onSave, statusConfigured, loading = false, }) {
    const [provider, setProvider] = React.useState(value?.provider ?? 'gemini');
    const [model, setModel] = React.useState(value?.model ?? '');
    const [contextState, setContextState] = React.useState(() => Object.fromEntries(contexts.map((c) => [c, value?.contexts?.[c] !== false])));
    const [saving, setSaving] = React.useState(false);
    const [feedback, setFeedback] = React.useState('idle');
    // Ressincroniza quando o app termina de carregar os valores.
    React.useEffect(() => {
        if (value?.provider !== undefined)
            setProvider(value.provider);
        if (value?.model !== undefined)
            setModel(value.model);
    }, [value?.provider, value?.model]);
    React.useEffect(() => {
        setContextState((prev) => Object.fromEntries(contexts.map((c) => [c, value?.contexts?.[c] ?? prev[c] ?? true])));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contexts.join('|'), value?.contexts]);
    const disabled = loading || saving;
    async function handleSubmit(e) {
        e.preventDefault();
        if (!onSave)
            return;
        setSaving(true);
        setFeedback('idle');
        try {
            await onSave({ provider, model: model.trim(), contexts: contextState });
            setFeedback('saved');
        }
        catch {
            setFeedback('error');
        }
        finally {
            setSaving(false);
        }
    }
    return (_jsxs("form", { onSubmit: handleSubmit, className: "max-w-xl space-y-6", children: [statusConfigured === false ? (_jsx("div", { role: "alert", className: "rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-700", children: "A chave de API do provedor n\u00E3o est\u00E1 configurada no servidor. A IA vai operar em modo manual at\u00E9 a vari\u00E1vel de ambiente ser definida." })) : null, _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "ai-provider", children: "Provedor" }), _jsx("select", { id: "ai-provider", value: provider, disabled: disabled, onChange: (e) => setProvider(e.target.value), className: "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", children: PROVIDER_OPTIONS.map((opt) => (_jsx("option", { value: opt.value, disabled: !opt.enabled, children: opt.label }, opt.value))) }), _jsx("p", { className: "text-xs text-muted-foreground", children: "OpenAI e Claude ainda n\u00E3o t\u00EAm adapter implementado (em breve)." })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "ai-model", children: "Modelo" }), _jsx(Input, { id: "ai-model", value: model, disabled: disabled, placeholder: "gemini-2.0-flash", onChange: (e) => setModel(e.target.value) })] }), _jsxs("fieldset", { className: "space-y-2", disabled: disabled, children: [_jsx("legend", { className: "text-sm font-medium text-foreground", children: "Contextos ativos" }), contexts.length === 0 ? (_jsx("p", { className: "text-xs text-muted-foreground", children: "Nenhum contexto de IA registrado." })) : (contexts.map((ctx) => (_jsxs("label", { className: "flex items-center gap-2 text-sm text-foreground", children: [_jsx("input", { type: "checkbox", checked: contextState[ctx] ?? true, onChange: (e) => setContextState((prev) => ({ ...prev, [ctx]: e.target.checked })) }), _jsx("span", { children: ctx })] }, ctx))))] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Button, { type: "submit", disabled: disabled || !onSave, children: saving ? 'Salvando...' : 'Salvar' }), feedback === 'saved' ? (_jsx("span", { className: "text-xs font-medium text-emerald-600", children: "Salvo com sucesso." })) : null, feedback === 'error' ? (_jsx("span", { className: "text-xs font-medium text-destructive", children: "N\u00E3o foi poss\u00EDvel salvar." })) : null] })] }));
}
//# sourceMappingURL=ai-assistant-config-page.js.map