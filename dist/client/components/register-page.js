'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Yup from 'yup';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { TurnstileWidget } from './captcha';
import { useAuth } from '../providers/auth-provider';
import { useForm } from '../hooks/use-form';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
export function RegisterPageContent({ onRegisterSuccess, redirectTo = '/painel', registerEndpoint = '/api/auth/register', loginHref = '/login', termsHref = '/termos', }) {
    const router = useRouter();
    const { user, setUser } = useAuth();
    const [captchaToken, setCaptchaToken] = useState(null);
    const captchaRequired = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
    useEffect(() => {
        if (user)
            router.replace(redirectTo);
    }, [user, router, redirectTo]);
    const form = useForm({
        initialValues: {
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            acceptTerms: false,
        },
        validationSchema: Yup.object({
            name: Yup.string().trim().required('Informe seu nome.'),
            email: Yup.string().email('Informe um email valido.').required('Informe o email.'),
            password: Yup.string()
                .min(6, 'A senha deve ter pelo menos 6 caracteres.')
                .required('Informe a senha.'),
            confirmPassword: Yup.string()
                .oneOf([Yup.ref('password')], 'As senhas nao conferem.')
                .required('Confirme sua senha.'),
            acceptTerms: Yup.boolean().oneOf([true], 'Voce precisa aceitar os termos para continuar.'),
        }),
        onSubmit: async (values, { setError, setSuccess }) => {
            try {
                const response = await fetch(registerEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: values.name,
                        email: values.email,
                        password: values.password,
                        acceptTerms: values.acceptTerms,
                        captchaToken,
                    }),
                });
                const data = (await response.json());
                if (!response.ok) {
                    setError(data.message || 'Nao foi possivel criar a conta.');
                    setCaptchaToken(null);
                    return;
                }
                if (data.user) {
                    setUser(data.user);
                    onRegisterSuccess?.(data.user);
                }
                setSuccess(data.message || 'Conta criada com sucesso.');
                setTimeout(() => router.push(redirectTo), 900);
            }
            catch {
                setError('Erro de conexao com o servidor.');
            }
        },
    });
    const { formik } = form;
    return (_jsxs(Card, { className: "w-full max-w-md", children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Registre-se" }), _jsx(CardDescription, { children: "Crie sua conta para comecar." })] }), _jsx(CardContent, { children: _jsxs("form", { onSubmit: form.handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "name", children: "Nome" }), _jsx(Input, { id: "name", name: "name", type: "text", required: true, value: formik.values.name, onChange: formik.handleChange, onBlur: formik.handleBlur, placeholder: "Seu nome" }), formik.touched.name && formik.errors.name ? (_jsx("p", { className: "text-xs text-red-600 dark:text-red-300", children: formik.errors.name })) : null] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "email", children: "Email" }), _jsx(Input, { id: "email", name: "email", type: "email", required: true, value: formik.values.email, onChange: formik.handleChange, onBlur: formik.handleBlur, placeholder: "voce@empresa.com" }), formik.touched.email && formik.errors.email ? (_jsx("p", { className: "text-xs text-red-600 dark:text-red-300", children: formik.errors.email })) : null] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "password", children: "Senha" }), _jsx(Input, { id: "password", name: "password", type: "password", required: true, minLength: 6, value: formik.values.password, onChange: formik.handleChange, onBlur: formik.handleBlur, placeholder: "Minimo 6 caracteres" }), formik.touched.password && formik.errors.password ? (_jsx("p", { className: "text-xs text-red-600 dark:text-red-300", children: formik.errors.password })) : null] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "confirm-password", children: "Confirmar senha" }), _jsx(Input, { id: "confirm-password", name: "confirmPassword", type: "password", required: true, minLength: 6, value: formik.values.confirmPassword, onChange: formik.handleChange, onBlur: formik.handleBlur, placeholder: "Repita sua senha" }), formik.touched.confirmPassword && formik.errors.confirmPassword ? (_jsx("p", { className: "text-xs text-red-600 dark:text-red-300", children: formik.errors.confirmPassword })) : null] }), _jsxs("div", { className: "flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3", children: [_jsx("input", { id: "accept-terms", name: "acceptTerms", type: "checkbox", checked: formik.values.acceptTerms, onChange: formik.handleChange, onBlur: formik.handleBlur, className: "mt-1 h-4 w-4 rounded border-input accent-[var(--primary)]" }), _jsxs(Label, { htmlFor: "accept-terms", className: "text-sm leading-6 text-muted-foreground", children: ["Eu li e aceito os", ' ', _jsx(Link, { href: termsHref, className: "font-medium text-primary hover:underline", children: "termos de uso" }), "."] })] }), formik.touched.acceptTerms && formik.errors.acceptTerms ? (_jsx("p", { className: "text-xs text-red-600 dark:text-red-300", children: formik.errors.acceptTerms })) : null, form.error ? (_jsxs("div", { role: "alert", className: "flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300", children: [_jsx(AlertTriangle, { className: "mt-0.5 h-4 w-4 shrink-0", "aria-hidden": "true" }), _jsx("p", { children: form.error })] })) : null, form.success ? (_jsxs("div", { role: "status", className: "flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300", children: [_jsx(CheckCircle2, { className: "mt-0.5 h-4 w-4 shrink-0", "aria-hidden": "true" }), _jsx("p", { children: form.success })] })) : null, _jsx(TurnstileWidget, { onToken: setCaptchaToken }), _jsx(Button, { type: "submit", className: "w-full", disabled: form.submitting || (captchaRequired && !captchaToken), children: form.submitting ? 'Criando...' : 'Criar conta' }), loginHref ? (_jsxs("p", { className: "text-center text-sm text-muted-foreground", children: ["Ja tem conta?", ' ', _jsx(Link, { href: loginHref, className: "font-medium text-primary hover:underline", children: "Fazer login" })] })) : null] }) })] }));
}
//# sourceMappingURL=register-page.js.map