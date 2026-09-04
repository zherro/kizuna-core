'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as Yup from 'yup';
import { useAuth, type PublicSession } from '../providers/auth-provider';
import { useForm } from '../hooks/use-form';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

/**
 * Full, working login screen backed by the core auth handlers (`POST /api/auth/login`).
 * A consuming project renders `<LoginPageContent />` directly (optionally inside its own
 * page chrome / centering wrapper) instead of reimplementing the form.
 */

type LoginResponse = { message: string; user?: PublicSession };

interface LoginPageProps {
  onLoginSuccess?: (user: PublicSession) => void;
  /** Where to send the user after a successful login (and if already authenticated). */
  redirectTo?: string;
  /** Endpoint that accepts `{ email, password }` and returns `{ message, user }`. */
  loginEndpoint?: string;
  /** Link to the registration screen. Pass `null` to hide the "sign up" line. */
  registerHref?: string | null;
}

export function LoginPageContent({
  onLoginSuccess,
  redirectTo = '/painel',
  loginEndpoint = '/api/auth/login',
  registerHref = '/registre-se',
}: LoginPageProps) {
  const router = useRouter();
  const { user, setUser } = useAuth();

  useEffect(() => {
    if (user) router.replace(redirectTo);
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

        const data = (await response.json()) as LoginResponse;

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
      } catch {
        setError('Erro de conexao com o servidor.');
      }
    },
  });
  const { formik } = form;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>Entre para acessar a plataforma.</CardDescription>
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
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="voce@empresa.com"
            />
            {formik.touched.email && formik.errors.email ? (
              <p className="text-xs text-red-600 dark:text-red-300">{formik.errors.email}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="Sua senha"
            />
            {formik.touched.password && formik.errors.password ? (
              <p className="text-xs text-red-600 dark:text-red-300">{formik.errors.password}</p>
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

          <Button type="submit" className="w-full" disabled={form.submitting}>
            {form.submitting ? 'Entrando...' : 'Entrar'}
          </Button>

          {registerHref ? (
            <p className="text-center text-sm text-muted-foreground">
              Ainda nao tem conta?{' '}
              <Link href={registerHref} className="font-medium text-primary hover:underline">
                Registre-se
              </Link>
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
