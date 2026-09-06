'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as Yup from 'yup';
import { useAuth } from '../providers/auth-provider';
import { useForm } from '../hooks/use-form';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
export function LoginPageContent({ onLoginSuccess, redirectTo = '/painel', loginEndpoint = '/api/auth/login', registerHref = '/registre-se', }) {
    const router = useRouter();
    const { user, setUser } = useAuth();
    useEffect(() => {
        if (user)
            router.replace(redirectTo);
    }, [user, router, redirectTo]);
    const form = useForm({
        initialValues: { email: '', password: '' },
        validationSchema: Yup.object({
            email: Yup.string().email('Informe um email valido.').required('Informe o email.'),
            password: Yup.string()
                .min(6, 'A senha precisa ter ao menos 6 caracteres.')
                .required('Informe a senha.'),
        }),
        onSubmit: async (values, { setError, setSuccess }) => {
            try {
                const response = await fetch(loginEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(values),
                });
                const data = (await response.json());
                if (!response.ok) {
                    setError(data.message || 'Nao foi possivel autenticar.');
                    return;
                }
                if (data.user) {
                    setUser(data.user);
                    onLoginSuccess?.(data.user);
                }
                setSuccess(data.message || 'Login realizado com sucesso.');
                setTimeout(() => router.push(redirectTo), 800);
            }
            catch {
                setError('Erro de conexao com o servidor.');
            }
        },
    });
    const { formik } = form;
    return (_jsxs(Card, { className: "w-full max-w-md", children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Login" }), _jsx(CardDescription, { children: "Entre para acessar a plataforma." })] }), _jsx(CardContent, { children: _jsxs("form", { onSubmit: form.handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "email", children: "Email" }), _jsx(Input, { id: "email", name: "email", type: "email", required: true, value: formik.values.email, onChange: formik.handleChange, onBlur: formik.handleBlur, placeholder: "voce@empresa.com" }), formik.touched.email && formik.errors.email ? (_jsx("p", { className: "text-xs text-red-600 dark:text-red-300", children: formik.errors.email })) : null] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "password", children: "Senha" }), _jsx(Input, { id: "password", name: "password", type: "password", required: true, minLength: 6, value: formik.values.password, onChange: formik.handleChange, onBlur: formik.handleBlur, placeholder: "Sua senha" }), formik.touched.password && formik.errors.password ? (_jsx("p", { className: "text-xs text-red-600 dark:text-red-300", children: formik.errors.password })) : null] }), form.error ? (_jsx("p", { className: "rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300", children: form.error })) : null, form.success ? (_jsx("p", { className: "rounded-md border border-border bg-primary/10 px-3 py-2 text-sm text-foreground", children: form.success })) : null, _jsx(Button, { type: "submit", className: "w-full", disabled: form.submitting, children: form.submitting ? 'Entrando...' : 'Entrar' }), registerHref ? (_jsxs("p", { className: "text-center text-sm text-muted-foreground", children: ["Ainda nao tem conta?", ' ', _jsx(Link, { href: registerHref, className: "font-medium text-primary hover:underline", children: "Registre-se" })] })) : null] }) })] }));
}
//# sourceMappingURL=login-page.js.map