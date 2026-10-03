'use client';

import { useEffect } from 'react';
import { useAuth, type PublicSession } from '../providers/auth-provider';
import { RegisterForm } from './auth/register-form';

/**
 * Full, working registration screen backed by the core auth handlers
 * (`POST /api/auth/register`). O formulário mora em `auth/register-form`
 * (reusado pelo `AuthModal`); aqui só o redirect.
 */
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
  /** Textos do cartão e visual "soft" — repassados ao `RegisterForm`. */
  title?: string;
  description?: string;
  soft?: boolean;
}

export function RegisterPageContent({
  onRegisterSuccess,
  redirectTo = '/painel',
  ...formProps
}: RegisterPageProps) {
  const { user } = useAuth();

  // Navegação completa (não `router.push`): o cache do roteador guarda a versão deslogada de
  // /painel (que redireciona para /login) e o usuário voltaria para cá depois de criar a conta.
  useEffect(() => {
    if (user) window.location.replace(redirectTo);
  }, [user, redirectTo]);

  return (
    <RegisterForm
      {...formProps}
      onSuccess={(u) => {
        onRegisterSuccess?.(u);
        // Recarrega de verdade: não depende do contexto de auth atualizar a tempo.
        window.location.replace(redirectTo);
      }}
    />
  );
}
