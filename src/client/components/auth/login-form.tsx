'use client';

import Link from 'next/link';
import { useState } from 'react';
import * as Yup from 'yup';
import { useAuth, type PublicSession } from '../../providers/auth-provider';
import { TurnstileWidget } from '../captcha';
import { useForm } from '../../hooks/use-form';
import { cn } from '../../../lib/utils';
import { Button, buttonVariants } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { PasswordInput } from '../ui/password-input';
import { Label } from '../ui/label';
import { SocialLoginButtons } from './social-login-buttons';
import { PhoneLoginForm } from './phone-login-form';

type LoginResponse = { message: string; user?: PublicSession };

/** Botão "Criar conta" em destaque: contorno e texto na cor primária, mais alto que o "Entrar". */
const CREATE_ACCOUNT_CLASS =
  'h-11 w-full border-2 border-primary bg-background text-base font-semibold text-primary hover:bg-primary/10 hover:text-primary';

type LoginFormProps = {
  onSuccess?: (user: PublicSession) => void;
  /** Endpoint that accepts `{ email, password }` and returns `{ message, user }`. */
  loginEndpoint?: string;
  /** Link para "Esqueci minha senha". Pass `null` to hide. */
  forgotPasswordHref?: string | null;
  /** Rodapé "Ainda não tem conta?": href navega; onSwitchToRegister troca aba (modal). */
  registerHref?: string | null;
  onSwitchToRegister?: () => void;
  /** Título/descrição do cartão. Padrão: "Login" / "Entre para acessar a plataforma.". */
  title?: string;
  description?: string;
  /**
   * `link` (padrão): linha discreta "Ainda não tem conta? Registre-se".
   * `button`: chamada em destaque, um botão "Criar conta" de largura total no fim do cartão.
   */
  registerAs?: 'link' | 'button';
  /**
   * Cartão "soft": cantos bem arredondados, sem borda, sombra larga e difusa na cor do tema e
   * levemente translúcido — para flutuar sobre um fundo decorativo (ex.: círculo do tema).
   */
  soft?: boolean;
};

export function LoginForm({
  onSuccess,
  loginEndpoint = '/api/auth/login',
  forgotPasswordHref = '/esqueci-senha',
  registerHref = '/registre-se',
  onSwitchToRegister,
  title = 'Login',
  description = 'Entre para acessar a plataforma.',
  registerAs = 'link',
  soft = false,
}: LoginFormProps) {
  const { setUser } = useAuth();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  // Token do Turnstile é de uso único: após cada tentativa, `captchaKey` recria o widget para
  // gerar outro — sem isso o botão ficava travado depois de um erro (ex.: senha errada).
  const [captchaKey, setCaptchaKey] = useState(0);
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
          setCaptchaKey((k) => k + 1);
          return;
        }

        if (data.user) {
          setUser(data.user);
          onSuccess?.(data.user);
        }
        setSuccess(data.message || 'Login realizado com sucesso.');
      } catch {
        setError('Erro de conexao com o servidor.');
        setCaptchaToken(null);
        setCaptchaKey((k) => k + 1);
      }
    },
  });
  const { formik } = form;

  return (
    <Card
      className={cn(
        'w-full max-w-md',
        soft &&
          'rounded-3xl border-0 bg-card/90 p-2 shadow-[0_28px_70px_-24px_color-mix(in_oklch,var(--primary)_55%,transparent)] backdrop-blur-sm sm:p-4',
      )}
    >
      <CardHeader>
        <CardTitle className={soft ? 'font-display text-2xl' : undefined}>{title}</CardTitle>
        <CardDescription className={soft ? 'text-base' : undefined}>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {usePhone ? (
          <PhoneLoginForm onSuccess={onSuccess} onBack={() => setUsePhone(false)} />
        ) : (
          <>
            <SocialLoginButtons large={soft} onPhoneLogin={() => setUsePhone(true)} />
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
                  placeholder="seuemail@exemplo.com"
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
                <PasswordInput
                  id="password"
                  name="password"
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

              <TurnstileWidget key={captchaKey} onToken={setCaptchaToken} />

              <Button
                type="submit"
                className="w-full"
                disabled={form.submitting || (captchaRequired && !captchaToken)}
              >
                {form.submitting ? 'Entrando...' : 'Entrar'}
              </Button>

              {registerAs === 'button' && (onSwitchToRegister || registerHref) ? (
                <div className="space-y-2 border-t border-border pt-4 text-center">
                  <p className="text-sm text-muted-foreground">Ainda não tem conta?</p>
                  {onSwitchToRegister ? (
                    <button
                      type="button"
                      onClick={onSwitchToRegister}
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'lg' }),
                        CREATE_ACCOUNT_CLASS,
                      )}
                    >
                      Criar conta
                    </button>
                  ) : (
                    <Link
                      href={registerHref as string}
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'lg' }),
                        CREATE_ACCOUNT_CLASS,
                      )}
                    >
                      Criar conta
                    </Link>
                  )}
                </div>
              ) : onSwitchToRegister ? (
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
