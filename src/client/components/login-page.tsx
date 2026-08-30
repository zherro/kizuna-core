'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as Yup from 'yup';
import { useAuth, type PublicSession } from '../providers/auth-provider';

/**
 * Generic LoginPage component.
 * Novo projeto pode renderizar diretamente ou estender com branding.
 *
 * Dependências esperadas em novo projeto:
 * - @/components/ui/button (Button)
 * - @/components/ui/card (Card, CardContent, CardDescription, CardHeader, CardTitle)
 * - @/components/ui/input (Input)
 * - @/components/ui/label (Label)
 * - @/hooks/use-form (useForm)
 */

type LoginResponse = { message: string; user?: PublicSession };

interface LoginPageProps {
  onLoginSuccess?: (user: PublicSession) => void;
  redirectTo?: string;
}

export function LoginPageContent({ onLoginSuccess, redirectTo = '/painel' }: LoginPageProps) {
  const router = useRouter();
  const { user, setUser } = useAuth();

  useEffect(() => {
    if (user) router.replace(redirectTo);
  }, [user, router, redirectTo]);

  // Este é um template — novo projeto importa Button, Input, etc da sua pasta ui/
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Login</h1>
        <p className="text-sm text-muted-foreground">Entre para acessar a plataforma.</p>
      </div>

      <form className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="voce@empresa.com"
            required
            className="w-full rounded-md border px-3 py-2"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium">
            Senha
          </label>
          <input
            id="password"
            type="password"
            placeholder="Sua senha"
            required
            minLength={6}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
        >
          Entrar
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Ainda não tem conta?{' '}
        <Link href="/registre-se" className="font-medium text-blue-600 hover:underline">
          Registre-se
        </Link>
      </p>
    </div>
  );
}
