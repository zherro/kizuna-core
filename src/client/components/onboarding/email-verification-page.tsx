'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@kizuna/core/client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kizuna/core/client/components/ui/card';
import { Input } from '@kizuna/core/client/components/ui/input';
import { Label } from '@kizuna/core/client/components/ui/label';
import { CheckCircle2, Mail, ArrowLeft } from 'lucide-react';

type EmailVerificationPageProps = {
  userEmail?: string;
};

export function EmailVerificationPage({ userEmail }: EmailVerificationPageProps) {
  const router = useRouter();
  const [emailCode, setEmailCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [codeRequested, setCodeRequested] = useState(false);
  const [verified, setVerified] = useState(false);

  const displayEmail = userEmail ? (
    <>
      {userEmail.slice(0, 3)}
      <span className="text-muted-foreground">••••••</span>
      {userEmail.slice(-6)}
    </>
  ) : (
    'seu e-mail'
  );

  async function requestCode() {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const response = await fetch('/api/onboarding/email/request-code', {
        method: 'POST',
      });
      const data = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
      } | null;
      if (!response.ok) {
        setError(data?.error ?? 'Não foi possível enviar o código.');
        return;
      }
      setCodeRequested(true);
      setSuccess(data?.message ?? 'Código enviado para seu e-mail.');
    } finally {
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

      const data = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
      } | null;
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
    } finally {
      setLoading(false);
    }
  }

  if (verified) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4 py-8 md:px-6">
        <div className="rounded-full bg-emerald-100 p-4 dark:bg-emerald-950">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-semibold">E-mail verificado!</h2>
          <p className="mt-2 text-sm text-muted-foreground">Redirecionando para minha conta...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
      <button
        onClick={() => router.back()}
        className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      <div>
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary">Step 2</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Verificação de e-mail</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirme seu e-mail para continuar o onboarding e ativar a plataforma.
        </p>
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Receba seu código</CardTitle>
              <CardDescription className="mt-1">
                Enviaremos um código de 6 dígitos para{' '}
                <span className="font-medium">{displayEmail}</span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {codeRequested ? (
            <>
              <div className="rounded-lg border border-emerald-200/50 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  ✓ Código enviado! Verifique sua caixa de entrada ou spam.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Código de verificação</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-lg tracking-widest"
                />
              </div>

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              {success && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => void verifyCode()}
                  disabled={loading || emailCode.length !== 6}
                  className="flex-1"
                >
                  {loading ? 'Validando...' : 'Validar código'}
                </Button>
                <Button variant="outline" onClick={() => void requestCode()} disabled={loading}>
                  {loading ? 'Enviando...' : 'Reenviar'}
                </Button>
              </div>
            </>
          ) : (
            <>
              {error && (
                <div className="rounded-lg border border-red-200/50 bg-red-50/50 p-3 dark:border-red-900/50 dark:bg-red-950/20">
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}
              <Button
                onClick={() => void requestCode()}
                disabled={loading}
                size="lg"
                className="w-full"
              >
                {loading ? 'Enviando código...' : 'Começar verificação'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium">Dica:</span> O código de verificação expira em 10 minutos.
          Se não recebeu, verifique sua pasta de spam ou solicite um novo código.
        </p>
      </div>
    </div>
  );
}
