'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@kizuna/core/client/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from '@kizuna/core/client/components/ui/card';
import { Input } from '@kizuna/core/client/components/ui/input';
import { Label } from '@kizuna/core/client/components/ui/label';
import { CheckCircle2, Mail, ArrowLeft } from 'lucide-react';
export function EmailVerificationPage({ userEmail }) {
    const router = useRouter();
    const [emailCode, setEmailCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [codeRequested, setCodeRequested] = useState(false);
    const [verified, setVerified] = useState(false);
    const displayEmail = userEmail ? (_jsxs(_Fragment, { children: [userEmail.slice(0, 3), _jsx("span", { className: "text-muted-foreground", children: "\u2022\u2022\u2022\u2022\u2022\u2022" }), userEmail.slice(-6)] })) : ('seu e-mail');
    async function requestCode() {
        setError(null);
        setSuccess(null);
        setLoading(true);
        try {
            const response = await fetch('/api/onboarding/email/request-code', {
                method: 'POST',
            });
            const data = (await response.json().catch(() => null));
            if (!response.ok) {
                setError(data?.error ?? 'Não foi possível enviar o código.');
                return;
            }
            setCodeRequested(true);
            setSuccess(data?.message ?? 'Código enviado para seu e-mail.');
        }
        finally {
            setLoading(false);
        }
    }
    async function verifyCode() {
        setError(null);
        setSuccess(null);
        const code = emailCode.trim();
        if (!/^\d{6}$/.test(code)) {
            setError('Informe o código com 6 dígitos.');
            return;
        }
        setLoading(true);
        try {
            const response = await fetch('/api/onboarding/email/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });
            const data = (await response.json().catch(() => null));
            if (!response.ok) {
                setError(data?.error ?? 'Não foi possível validar o código.');
                return;
            }
            setVerified(true);
            setEmailCode('');
            setSuccess(data?.message ?? 'E-mail verificado com sucesso!');
            setTimeout(() => {
                router.push('/painel/minha-conta');
            }, 1500);
        }
        finally {
            setLoading(false);
        }
    }
    if (verified) {
        return (_jsxs("div", { className: "mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4 py-8 md:px-6", children: [_jsx("div", { className: "rounded-full bg-emerald-100 p-4 dark:bg-emerald-950", children: _jsx(CheckCircle2, { className: "h-8 w-8 text-emerald-600 dark:text-emerald-400" }) }), _jsxs("div", { className: "text-center", children: [_jsx("h2", { className: "text-2xl font-semibold", children: "E-mail verificado!" }), _jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Redirecionando para minha conta..." })] })] }));
    }
    return (_jsxs("div", { className: "mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 md:px-6", children: [_jsxs("button", { onClick: () => router.back(), className: "inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground", children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), "Voltar"] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium uppercase tracking-[0.22em] text-primary", children: "Step 2" }), _jsx("h1", { className: "mt-2 text-2xl font-semibold tracking-tight", children: "Verifica\u00E7\u00E3o de e-mail" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Confirme seu e-mail para continuar o onboarding e ativar a plataforma." })] }), _jsxs(Card, { className: "border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10", children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "rounded-lg bg-primary/10 p-2.5 text-primary", children: _jsx(Mail, { className: "h-5 w-5" }) }), _jsxs("div", { children: [_jsx(CardTitle, { children: "Receba seu c\u00F3digo" }), _jsxs(CardDescription, { className: "mt-1", children: ["Enviaremos um c\u00F3digo de 6 d\u00EDgitos para", ' ', _jsx("span", { className: "font-medium", children: displayEmail })] })] })] }) }), _jsx(CardContent, { className: "space-y-4", children: codeRequested ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "rounded-lg border border-emerald-200/50 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20", children: _jsx("p", { className: "text-sm text-emerald-700 dark:text-emerald-300", children: "\u2713 C\u00F3digo enviado! Verifique sua caixa de entrada ou spam." }) }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "code", children: "C\u00F3digo de verifica\u00E7\u00E3o" }), _jsx(Input, { id: "code", inputMode: "numeric", pattern: "[0-9]*", maxLength: 6, value: emailCode, onChange: (e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6)), placeholder: "000000", className: "text-center text-lg tracking-widest" })] }), error && _jsx("p", { className: "text-sm text-red-600 dark:text-red-400", children: error }), success && (_jsx("p", { className: "text-sm text-emerald-600 dark:text-emerald-400", children: success })), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { onClick: () => void verifyCode(), disabled: loading || emailCode.length !== 6, className: "flex-1", children: loading ? 'Validando...' : 'Validar código' }), _jsx(Button, { variant: "outline", onClick: () => void requestCode(), disabled: loading, children: loading ? 'Enviando...' : 'Reenviar' })] })] })) : (_jsxs(_Fragment, { children: [error && (_jsx("div", { className: "rounded-lg border border-red-200/50 bg-red-50/50 p-3 dark:border-red-900/50 dark:bg-red-950/20", children: _jsx("p", { className: "text-sm text-red-700 dark:text-red-300", children: error }) })), _jsx(Button, { onClick: () => void requestCode(), disabled: loading, size: "lg", className: "w-full", children: loading ? 'Enviando código...' : 'Começar verificação' })] })) })] }), _jsx("div", { className: "rounded-lg border border-border/50 bg-muted/20 p-4", children: _jsxs("p", { className: "text-xs leading-relaxed text-muted-foreground", children: [_jsx("span", { className: "font-medium", children: "Dica:" }), " O c\u00F3digo de verifica\u00E7\u00E3o expira em 10 minutos. Se n\u00E3o recebeu, verifique sua pasta de spam ou solicite um novo c\u00F3digo."] }) })] }));
}
//# sourceMappingURL=email-verification-page.js.map