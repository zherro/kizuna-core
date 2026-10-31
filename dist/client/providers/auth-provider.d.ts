import type { PermissionMap } from '../../types/auth';
export interface PublicSession {
    user_id: string;
    display_name?: string;
    login?: string;
    tenant_type?: string;
    is_root?: boolean;
    perms?: PermissionMap;
}
export interface AuthUser extends PublicSession {
    name: string;
    subtitle: string;
    initials: string;
    canManageCatalog: boolean;
    hasPerm: (resource: string, action?: keyof PermissionMap[string]) => boolean;
}
interface AuthContextValue {
    user: AuthUser | null;
    setUser: (raw: PublicSession | null) => void;
    logout: () => Promise<void>;
}
export declare function AuthProvider({ children, initialUser, }: {
    children: React.ReactNode;
    initialUser: PublicSession | null;
}): import("react/jsx-runtime").JSX.Element;
export declare function useAuth(): AuthContextValue;
export {};
//# sourceMappingURL=auth-provider.d.ts.map