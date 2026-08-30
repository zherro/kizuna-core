'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, type PublicSession } from '../providers/auth-provider';

/**
 * Generic RegisterPage component.
 * Novo projeto pode renderizar diretamente ou estender com branding.
 *
 * Dependências esperadas em novo projeto:
 * - @/components/ui/button (Button)
 * - @/components/ui/card (Card, CardContent, CardDescription, CardHeader, CardTitle)
 * - @/components/ui/input (Input)
 * - @/components/ui/label (Label)
 * - @/hooks/use-form (useForm)
 */

type RegisterResponse = { message: string; user?: PublicSession };

interface RegisterPageProps {
  onRegisterSuccess?: (user: PublicSession) => void;
  redirectTo?: string;
}

export function RegisterPageContent({
  onRegisterSuccess,
  redirectTo = '/painel',
}: RegisterPageProps) {
  const router = useRouter();
  const { user, setUser } = useAuth();

  useEffect(() => {
    if (user) router.replace(redirectTo);
  }, [user, router, redirectTo]);

  // Este é um template — novo projeto importa Button, Input, etc da sua pasta ui/
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Registre-se</h1>
        <p className="text-sm text-muted-foreground">Crie sua conta para começar.</p>
      </div>

      <form className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium">
            Nome
          </label>
          <input
            id="name"
            type="text"
            placeholder="Seu nome"
            required
            className="w-full rounded-md border px-3 py-2"
          />
        </div>

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
            placeholder="Mínimo 6 caracteres"
            required
            minLength={6}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="confirm-password" className="block text-sm font-medium">
            Confirmar Senha
          </label>
          <input
            id="confirm-password"
            type="password"
            placeholder="Repita sua senha"
            required
            minLength={6}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>

        <div className="flex items-start gap-2">
          <input
            id="accept-terms"
            type="checkbox"
            required
            className="mt-1 h-4 w-4 rounded border accent-blue-600"
          />
          <label htmlFor="accept-terms" className="text-sm leading-6 text-muted-foreground">
            Eu li e aceito os{' '}
            <Link href="/termos" className="font-medium text-blue-600 hover:underline">
              termos de uso
            </Link>
            .
          </label>
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
        >
          Criar Conta
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{' '}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Faça login
        </Link>
      </p>
    </div>
  );
}
