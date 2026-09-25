'use client';

import Link from 'next/link';
import { useState } from 'react';
import * as Yup from 'yup';
import { TurnstileWidget } from './captcha';
import { useForm } from '../hooks/use-form';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

/**
 * "Esqueci minha senha": pede o email e dispara `POST /api/auth/forgot-password`, que envia o
 * link de redefinição. A resposta é sempre a mesma exista ou não a conta.
 */

interface ForgotPasswordPageProps {
  /** Endpoint que aceita `{ email, captchaToken }`. */
  endpoint?: string;
  /** Link de volta para o login. `null` esconde. */
  loginHref?: string | null;
}

export function ForgotPasswordPageContent({
  endpoint = '/api/auth/forgot-password',
  loginHref = '/login',
}: ForgotPasswordPageProps) {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const captchaRequired = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

  const form = useForm({
    initialValues: { email: '' },
    validationSchema: Yup.object({
      email: Yup.string().email('Informe um email valido.').required('Informe o email.'),
    }),
    onSubmit: async (values, { setError, setSuccess }) => {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...values, captchaToken }),
        });
        const data = (await response.json().catch(() => ({}))) as { message?: string };

        if (!response.ok) {
          setError(data.message || 'Nao foi possivel enviar o pedido.');
          setCaptchaToken(null);
          return;
        }

        setSent(true);
        setSuccess(
          data.message ||
            'Se existir uma conta com este email, enviaremos um link para redefinir a senha.'
        );
      } catch {
        setError('Erro de conexao com o servidor.');
      }
    },
  });
  const { formik } = form;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Esqueci minha senha</CardTitle>
        <CardDescription>
          Informe o email da sua conta. Enviaremos um link para criar uma nova senha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              disabled={sent}
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="voce@empresa.com"
            />
            {formik.touched.email && formik.errors.email ? (
              <p className="text-xs text-red-600 dark:text-red-300">{formik.errors.email}</p>
            ) : null}
          </div>

          {form.error ? (
            <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
              {form.error}
            </p>
          ) : null}

          {form.success ? (
            <p className="rounded-md border border-border bg-primary/10 px-3 py-2 text-sm text-foreground">
              {form.success}
            </p>
          ) : null}

          {!sent ? (
            <>
              <TurnstileWidget onToken={setCaptchaToken} />
              <Button
                type="submit"
                className="w-full"
                disabled={form.submitting || (captchaRequired && !captchaToken)}
              >
                {form.submitting ? 'Enviando...' : 'Enviar link'}
              </Button>
            </>
          ) : null}

          {loginHref ? (
            <p className="text-center text-sm text-muted-foreground">
              Lembrou a senha?{' '}
              <Link href={loginHref} className="font-medium text-primary hover:underline">
                Voltar ao login
              </Link>
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
