'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { AlertTriangle, CheckCircle2, FlaskConical, Play, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { Button, buttonVariants } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
const initialValues = {
    schema: 'public',
    functionName: '',
    params: '{}',
};
const validationSchema = Yup.object({
    schema: Yup.string().trim().required('Informe o schema.'),
    functionName: Yup.string()
        .trim()
        .required('Informe o nome da funcao.')
        .matches(/^[a-zA-Z0-9_]+$/, 'Use apenas letras, numeros e underscore.'),
    params: Yup.string()
        .required('Informe os parametros em JSON.')
        .test('is-json', 'JSON invalido.', (value) => {
        if (!value)
            return false;
        try {
            JSON.parse(value);
            return true;
        }
        catch {
            return false;
        }
    }),
});
/**
 * Formulário genérico de teste de função RPC contra um endpoint PostgREST — schema, nome da
 * função e parâmetros em JSON, mostrando status HTTP e payload de resposta. Sem nenhuma
 * taxonomia/regra de negócio: qualquer projeto que exponha `pgrstRpc` atrás de uma rota
 * `POST` pode usar como está.
 */
export function RpcTester({ endpoint = '/api/postgrest/rpc', backHref, backLabel = 'Voltar', title = 'Teste de funcoes RPC', description = 'Execute funcoes do banco pelo PostgREST com o mesmo token da sua sessao atual.', eyebrow = 'Ferramentas', } = {}) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [result, setResult] = useState(null);
    const formik = useFormik({
        initialValues,
        validationSchema,
        onSubmit: async (values) => {
            setSubmitting(true);
            setError('');
            setSuccess('');
            try {
                const parsedParams = JSON.parse(values.params);
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        schema: values.schema.trim(),
                        functionName: values.functionName.trim(),
                        params: parsedParams,
                    }),
                });
                const data = (await response
                    .json()
                    .catch(() => ({ message: 'Resposta sem JSON.' })));
                const payload = {
                    ok: response.ok,
                    status: response.status,
                    data,
                };
                setResult(payload);
                if (!response.ok) {
                    setError('Falha ao executar funcao no PostgREST.');
                    return;
                }
                setSuccess('Funcao executada com sucesso.');
            }
            catch {
                setError('Nao foi possivel processar os dados da requisicao.');
            }
            finally {
                setSubmitting(false);
            }
        },
    });
    function resetForm() {
        formik.resetForm({ values: initialValues });
        formik.setTouched({});
        formik.setErrors({});
        setError('');
        setSuccess('');
        setResult(null);
    }
    return (_jsxs("div", { className: "mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6", children: [_jsxs("div", { className: "flex flex-col gap-3 md:flex-row md:items-end md:justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium uppercase tracking-[0.22em] text-primary", children: eyebrow }), _jsx("h1", { className: "text-3xl font-semibold tracking-tight", children: title }), _jsx("p", { className: "mt-2 max-w-2xl text-sm text-muted-foreground", children: description })] }), backHref ? (_jsx("div", { className: "flex gap-2", children: _jsx(Link, { href: backHref, className: buttonVariants({ variant: 'outline' }), children: backLabel }) })) : null] }), error ? (_jsxs("div", { className: "flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300", children: [_jsx(AlertTriangle, { className: "mt-0.5 h-4 w-4 shrink-0", "aria-hidden": "true" }), _jsx("p", { children: error })] })) : null, success ? (_jsxs("div", { className: "flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300", children: [_jsx(CheckCircle2, { className: "mt-0.5 h-4 w-4 shrink-0", "aria-hidden": "true" }), _jsx("p", { children: success })] })) : null, _jsxs("div", { className: "grid gap-6 lg:grid-cols-[1fr_1fr]", children: [_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "rounded-xl bg-primary/10 p-3 text-primary", children: _jsx(FlaskConical, { className: "h-5 w-5" }) }), _jsxs("div", { children: [_jsx(CardTitle, { children: "Executar funcao" }), _jsx(CardDescription, { children: "Informe schema, nome da funcao e parametros JSON." })] })] }) }), _jsx(CardContent, { children: _jsxs("form", { onSubmit: formik.handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "rpc-schema", children: "Schema" }), _jsx(Input, { id: "rpc-schema", name: "schema", value: formik.values.schema, onChange: formik.handleChange, onBlur: formik.handleBlur, placeholder: "public" }), formik.touched.schema && formik.errors.schema ? (_jsx("p", { className: "text-xs text-red-600 dark:text-red-300", children: formik.errors.schema })) : null] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "rpc-function", children: "Funcao" }), _jsx(Input, { id: "rpc-function", name: "functionName", value: formik.values.functionName, onChange: formik.handleChange, onBlur: formik.handleBlur, placeholder: "fun_nome_da_funcao" }), formik.touched.functionName && formik.errors.functionName ? (_jsx("p", { className: "text-xs text-red-600 dark:text-red-300", children: formik.errors.functionName })) : null] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "rpc-params", children: "Parametros (JSON)" }), _jsx("textarea", { id: "rpc-params", name: "params", value: formik.values.params, onChange: formik.handleChange, onBlur: formik.handleBlur, className: "min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring", spellCheck: false, placeholder: '{"id": 1}' }), formik.touched.params && formik.errors.params ? (_jsx("p", { className: "text-xs text-red-600 dark:text-red-300", children: formik.errors.params })) : null] }), _jsxs("div", { className: "flex flex-col gap-2 sm:flex-row", children: [_jsxs(Button, { type: "submit", className: "sm:flex-1", disabled: submitting, children: [_jsx(Play, { className: "h-4 w-4" }), submitting ? 'Executando...' : 'Executar'] }), _jsxs(Button, { type: "button", variant: "outline", onClick: resetForm, disabled: submitting, children: [_jsx(RotateCcw, { className: "h-4 w-4" }), "Limpar"] })] })] }) })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Resultado" }), _jsx(CardDescription, { children: "Status HTTP e payload retornado pela funcao via PostgREST." })] }), _jsx(CardContent, { children: result ? (_jsxs("div", { className: "space-y-3", children: [_jsxs("p", { className: "text-sm text-muted-foreground", children: ["Status: ", _jsx("span", { className: "font-semibold text-foreground", children: result.status })] }), _jsx("pre", { className: "max-h-[420px] overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs leading-relaxed", children: JSON.stringify(result.data, null, 2) })] })) : (_jsx("p", { className: "text-sm text-muted-foreground", children: "Execute uma funcao para visualizar o retorno aqui." })) })] })] })] }));
}
//# sourceMappingURL=rpc-tester.js.map