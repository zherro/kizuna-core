'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as Yup from 'yup';
import { useForm } from '../hooks/use-form';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

/**
 * Tela aberta pelo link do email (`?token=...`): define a nova senha via
 * `POST /api/auth/reset-password`. Usa `useSearchParams` — a page do projeto deve envolver
 * este componente em `<Suspense>`.
 */

interface ResetPasswordPageProps {
  /** Endpoint que aceita `{ token, password }`. */
  endpoint?: string;
  loginHref?: string;
  forgotPasswordHref?: string;
}

export function ResetPasswordPageContent({
  endpoint = '/api/auth/reset-password',
  loginHref = '/login',
  forgotPasswordHref = '/esqueci-senha',
}: ResetPasswordPageProps) {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [done, setDone] = useState(false);

  const form = useForm({
    initialValues: { password: '', confirm: '' },
    validationSchema: Yup.object({
      password: Yup.string()
        .min(6, 'A senha precisa ter ao menos 6 caracteres.')
        .required('Informe a nova senha.'),
      confirm: Yup.string()
        .oneOf([Yup.ref('password')], 'As senhas nao conferem.')
        .required('Confirme a nova senha.'),
    }),
    onSubmit: async (values, { setError, setSuccess }) => {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password: values.password }),
        });
        const data = (await response.json().catch(() => ({}))) as { message?: string };

        if (!response.ok) {
          setError(data.message || 'Nao foi possivel redefinir a senha.');
          return;
        }

        setDone(true);
        setSuccess(data.message || 'Senha redefinida. Voce ja pode entrar.');
        setTimeout(() => router.push(loginHref), 1500);
      } catch {
        setError('Erro de conexao com o servidor.');
      }
    },
  });
  const { formik } = form;

  if (!token) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Link invalido</CardTitle>
          <CardDescription>
            O link de redefinicao esta incompleto. Peca um novo para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" className="w-full" onClick={() => router.push(forgotPasswordHref)}>
            Pedir novo link
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Nova senha</CardTitle>
        <CardDescription>Escolha uma nova senha para a sua conta.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              disabled={done}
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.password && formik.errors.password ? (
              <p className="text-xs text-red-600 dark:text-red-300">{formik.errors.password}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirme a nova senha</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              disabled={done}
              value={formik.values.confirm}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.confirm && formik.errors.confirm ? (
              <p className="text-xs text-red-600 dark:text-red-300">{formik.errors.confirm}</p>
            ) : null}
          </div>

          {form.error ? (
            <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
              {form.error}{' '}
              <Link href={forgotPasswordHref} className="font-medium underline">
                Pedir novo link
              </Link>
            </p>
          ) : null}

          {form.success ? (
            <p className="rounded-md border border-border bg-primary/10 px-3 py-2 text-sm text-foreground">
              {form.success}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={form.submitting || done}>
            {form.submitting ? 'Salvando...' : 'Salvar nova senha'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
