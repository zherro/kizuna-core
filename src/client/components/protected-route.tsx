'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../providers/auth-provider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredAction?: 'view' | 'edit' | 'delete';
  redirectTo?: string;
}

/**
 * Client-side route protection.
 * Verifica se usuário está autenticado e (opcionalmente) tem permissão.
 *
 * Uso:
 * <ProtectedRoute requiredPermission="services" requiredAction="edit">
 *   <AdminPage />
 * </ProtectedRoute>
 */
export function ProtectedRoute({
  children,
  requiredPermission,
  requiredAction = 'view',
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.replace(redirectTo);
      return;
    }

    if (requiredPermission && !user.hasPerm(requiredPermission, requiredAction)) {
      router.replace('/unauthorized');
      return;
    }
  }, [user, router, requiredPermission, requiredAction, redirectTo]);

  if (!user) {
    return null; // ou loading component
  }

  if (requiredPermission && !user.hasPerm(requiredPermission, requiredAction)) {
    return null; // ou unauthorized component
  }

  return <>{children}</>;
}
