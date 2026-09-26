'use client';

import Link from 'next/link';
import { useState } from 'react';
import * as Yup from 'yup';
import { useAuth, type PublicSession } from '../../providers/auth-provider';
import { TurnstileWidget } from '../captcha';
import { useForm } from '../../hooks/use-form';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { SocialLoginButtons } from './social-login-buttons';
import { PhoneLoginForm } from './phone-login-form';

type LoginResponse = { message: string; user?: PublicSession };

type LoginFormProps = {
  onSuccess?: (user: PublicSession) => void;
  /** Endpoint that accepts `{ email, password }` and returns `{ message, user }`. */
  loginEndpoint?: string;
  /** Link para "Esqueci minha senha". Pass `null` to hide. */
  forgotPasswordHref?: string | null;
  /** Rodapé "Ainda não tem conta?": href navega; onSwitchToRegister troca aba (modal). */
  registerHref?: string | null;
  onSwitchToRegister?: () => void;
};

export function LoginForm({
  onSuccess,
  loginEndpoint = '/api/auth/login',
  forgotPasswordHref = '/esqueci-senha',
  registerHref = '/registre-se',
  onSwitchToRegister,
}: LoginFormProps) {
  const { setUser } = useAuth();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [usePhone, setUsePhone] = useState(false);
  const captchaRequired = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

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
          body: JSON.stringify({ ...values, captchaToken }),
        });

        const data = (await response.json()) as LoginResponse;

        if (!response.ok) {
          setError(data.message || 'Nao foi possivel autenticar.');
          setCaptchaToken(null);
          return;
        }

        if (data.user) {
          setUser(data.user);
          onSuccess?.(data.user);
        }
        setSuccess(data.message || 'Login realizado com sucesso.');
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
      <CardContent className="space-y-4">
        {usePhone ? (
          <PhoneLoginForm onSuccess={onSuccess} onBack={() => setUsePhone(false)} />
        ) : (
          <>
            <SocialLoginButtons onPhoneLogin={() => setUsePhone(true)} />
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  {forgotPasswordHref ? (
                    <Link
                      href={forgotPasswordHref}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Esqueci minha senha
                    </Link>
                  ) : null}
                </div>
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

              <TurnstileWidget onToken={setCaptchaToken} />

              <Button
                type="submit"
                className="w-full"
                disabled={form.submitting || (captchaRequired && !captchaToken)}
              >
                {form.submitting ? 'Entrando...' : 'Entrar'}
              </Button>

              {onSwitchToRegister ? (
                <p className="text-center text-sm text-muted-foreground">
                  Ainda nao tem conta?{' '}
                  <button
                    type="button"
                    onClick={onSwitchToRegister}
                    className="font-medium text-primary hover:underline"
                  >
                    Registre-se
                  </button>
                </p>
              ) : registerHref ? (
                <p className="text-center text-sm text-muted-foreground">
                  Ainda nao tem conta?{' '}
                  <Link href={registerHref} className="font-medium text-primary hover:underline">
                    Registre-se
                  </Link>
                </p>
              ) : null}
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
