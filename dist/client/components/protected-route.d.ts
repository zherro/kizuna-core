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
export declare function ProtectedRoute({ children, requiredPermission, requiredAction, redirectTo, }: ProtectedRouteProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=protected-route.d.ts.map