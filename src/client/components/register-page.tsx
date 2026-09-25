'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
}

export function RegisterPageContent({
  onRegisterSuccess,
  redirectTo = '/painel',
  ...formProps
}: RegisterPageProps) {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) router.replace(redirectTo);
  }, [user, router, redirectTo]);

  return (
    <RegisterForm
      {...formProps}
      onSuccess={(u) => {
        onRegisterSuccess?.(u);
        setTimeout(() => router.push(redirectTo), 900);
      }}
    />
  );
}
