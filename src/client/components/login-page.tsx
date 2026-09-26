'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, type PublicSession } from '../providers/auth-provider';
import { LoginForm } from './auth/login-form';

/**
 * Full, working login screen backed by the core auth handlers (`POST /api/auth/login`).
 * O formulário mora em `auth/login-form` (reusado pelo `AuthModal`); aqui só o redirect.
 */
interface LoginPageProps {
  onLoginSuccess?: (user: PublicSession) => void;
  /** Where to send the user after a successful login (and if already authenticated). */
  redirectTo?: string;
  /** Endpoint that accepts `{ email, password }` and returns `{ message, user }`. */
  loginEndpoint?: string;
  /** Link to the registration screen. Pass `null` to hide the "sign up" line. */
  registerHref?: string | null;
  /** Link para "Esqueci minha senha". Pass `null` to hide. */
  forgotPasswordHref?: string | null;
}

const OAUTH_ERRORS: Record<string, string> = {
  cancelado: 'Login cancelado. Tente de novo quando quiser.',
  sessao_expirada: 'A tentativa de login expirou. Tente de novo.',
  falha_provedor: 'Nao conseguimos falar com o provedor de login. Tente de novo.',
  email_nao_verificado:
    'Este email ja tem conta aqui e nao foi verificado pelo provedor. Entre com email e senha.',
  conta_bloqueada: 'Esta conta esta bloqueada.',
  provedor_indisponivel: 'Este metodo de login nao esta disponivel.',
  falha_login: 'Nao foi possivel entrar agora. Tente de novo.',
};

export function LoginPageContent({
  onLoginSuccess,
  redirectTo = '/painel',
  ...formProps
}: LoginPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [oauthError, setOauthError] = useState<string | null>(null);

  // `?returnTo=` (vindo de um login social que falhou ou de um link) vence o padrão, se for local.
  const [target, setTarget] = useState(redirectTo);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('erro');
    if (code) setOauthError(OAUTH_ERRORS[code] ?? OAUTH_ERRORS.falha_login!);
    const back = params.get('returnTo');
    if (back && back.startsWith('/') && !back.startsWith('//') && !back.startsWith('/\\')) {
      setTarget(back);
    }
  }, []);

  useEffect(() => {
    if (user) router.replace(target);
  }, [user, router, target]);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {oauthError ? (
        <p
          role="alert"
          className="w-full max-w-md rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300"
        >
          {oauthError}
        </p>
      ) : null}
      <LoginForm
        {...formProps}
        onSuccess={(u) => {
          onLoginSuccess?.(u);
          setTimeout(() => router.push(target), 800);
        }}
      />
    </div>
  );
}
