'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as Yup from 'yup';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth, type PublicSession } from '../providers/auth-provider';
import { useForm } from '../hooks/use-form';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

/**
 * Full, working registration screen backed by the core auth handlers
 * (`POST /api/auth/register`). A consuming project renders `<RegisterPageContent />`
 * directly (optionally inside its own page chrome) instead of reimplementing the form.
 */

type RegisterResponse = { message: string; user?: PublicSession };

interface RegisterPageProps {
  onRegisterSuccess?: (user: PublicSession) => void;
  /** Where to send the user after a successful registration (and if already authenticated). */
  redirectTo?: string;
  /** Endpoint that accepts `{ name, email, password, acceptTerms }`. */
  registerEndpoint?: string;
  /** Link to the login screen. Pass `null` to hide the "already have an account" line. */
  loginHref?: string | null;
  /** Link to the terms-of-use page shown next to the accept checkbox. */
  termsHref?: string;
}

export function RegisterPageContent({
  onRegisterSuccess,
  redirectTo = '/painel',
  registerEndpoint = '/api/auth/register',
  loginHref = '/login',
  termsHref = '/termos',
}: RegisterPageProps) {
  const router = useRouter();
  const { user, setUser } = useAuth();

  useEffect(() => {
    if (user) router.replace(redirectTo);
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
          }),
        });

        const data = (await response.json()) as RegisterResponse;

        if (!response.ok) {
          setError(data.message || 'Nao foi possivel criar a conta.');
          return;
        }

        if (data.user) {
          setUser(data.user);
          onRegisterSuccess?.(data.user);
        }
        setSuccess(data.message || 'Conta criada com sucesso.');
        setTimeout(() => router.push(redirectTo), 900);
      } catch {
        setError('Erro de conexao com o servidor.');
      }
    },
  });
  const { formik } = form;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Registre-se</CardTitle>
        <CardDescription>Crie sua conta para comecar.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="Seu nome"
            />
            {formik.touched.name && formik.errors.name ? (
              <p className="text-xs text-red-600 dark:text-red-300">{formik.errors.name}</p>
            ) : null}
          </div>

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
              placeholder="Minimo 6 caracteres"
            />
            {formik.touched.password && formik.errors.password ? (
              <p className="text-xs text-red-600 dark:text-red-300">{formik.errors.password}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar senha</Label>
            <Input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              value={formik.values.confirmPassword}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="Repita sua senha"
            />
            {formik.touched.confirmPassword && formik.errors.confirmPassword ? (
              <p className="text-xs text-red-600 dark:text-red-300">
                {formik.errors.confirmPassword}
              </p>
            ) : null}
          </div>

          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
            <input
              id="accept-terms"
              name="acceptTerms"
              type="checkbox"
              checked={formik.values.acceptTerms}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="mt-1 h-4 w-4 rounded border-input accent-[var(--primary)]"
            />
            <Label htmlFor="accept-terms" className="text-sm leading-6 text-muted-foreground">
              Eu li e aceito os{' '}
              <Link href={termsHref} className="font-medium text-primary hover:underline">
                termos de uso
              </Link>
              .
            </Label>
          </div>
          {formik.touched.acceptTerms && formik.errors.acceptTerms ? (
            <p className="text-xs text-red-600 dark:text-red-300">{formik.errors.acceptTerms}</p>
          ) : null}

          {form.error ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{form.error}</p>
            </div>
          ) : null}

          {form.success ? (
            <div
              role="status"
              className="flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{form.success}</p>
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={form.submitting}>
            {form.submitting ? 'Criando...' : 'Criar conta'}
          </Button>

          {loginHref ? (
            <p className="text-center text-sm text-muted-foreground">
              Ja tem conta?{' '}
              <Link href={loginHref} className="font-medium text-primary hover:underline">
                Fazer login
              </Link>
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
