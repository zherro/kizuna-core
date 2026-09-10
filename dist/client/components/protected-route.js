'use client';
import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../providers/auth-provider';
/**
 * Client-side route protection.
 * Verifica se usuário está autenticado e (opcionalmente) tem permissão.
 *
 * Uso:
 * <ProtectedRoute requiredPermission="services" requiredAction="edit">
 *   <AdminPage />
 * </ProtectedRoute>
 */
export function ProtectedRoute({ children, requiredPermission, requiredAction = 'view', redirectTo = '/login', }) {
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
    return _jsx(_Fragment, { children: children });
}
//# sourceMappingURL=protected-route.js.map