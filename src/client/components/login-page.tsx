'use client';

import { useEffect } from 'react';
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

export function LoginPageContent({
  onLoginSuccess,
  redirectTo = '/painel',
  ...formProps
}: LoginPageProps) {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) router.replace(redirectTo);
  }, [user, router, redirectTo]);

  return (
    <LoginForm
      {...formProps}
      onSuccess={(u) => {
        onLoginSuccess?.(u);
        setTimeout(() => router.push(redirectTo), 800);
      }}
    />
  );
}
