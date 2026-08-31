'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
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

function buildAuthUser(raw: PublicSession): AuthUser {
  const displayName = raw.display_name?.trim();
  const login = raw.login?.trim();
  const canManageCatalog = (raw.tenant_type ?? '').toUpperCase() === 'ADMIN';
  const perms = raw.perms ?? {};
  // Mirrors auth.fun_auth_has_perm's bypass on the DB side: a root session isn't granted every
  // permission row (plugins never auto-grant, see plugins/README.md), it bypasses the check
  // entirely — so the client-side gate (nav items, page guards keyed off `permResource`) must
  // bypass the same way, or a root-only feature with no explicit grant just disappears for root.
  const hasPerm = (resource: string, action: keyof PermissionMap[string] = 'view') =>
    raw.is_root === true || perms[resource]?.[action] === true || resource === 'default';

  const makeInitials = (str: string) =>
    str
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');

  if (displayName) {
    return {
      ...raw,
      name: displayName,
      subtitle: login || 'Conta autenticada',
      initials: makeInitials(displayName),
      canManageCatalog,
      hasPerm,
    };
  }

  if (login) {
    const name =
      (login.split('@')[0] ?? 'Usuario')
        .replace(/[._-]+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ') || 'Usuario';
    return {
      ...raw,
      name,
      subtitle: login,
      initials: makeInitials(name),
      canManageCatalog,
      hasPerm,
    };
  }

  return {
    ...raw,
    name: 'Usuario',
    subtitle: 'Conta autenticada',
    initials: 'US',
    canManageCatalog,
    hasPerm,
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  setUser: (raw: PublicSession | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: PublicSession | null;
}) {
  const [user, setUserRaw] = useState<AuthUser | null>(
    initialUser ? buildAuthUser(initialUser) : null
  );

  const setUser = useCallback((raw: PublicSession | null) => {
    setUserRaw(raw ? buildAuthUser(raw) : null);
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    // Hard redirect on purpose: a client-side router.push() re-renders the tree with
    // user=null while still on the old /painel/* route, and panel-shell's
    // checkPagePermission() hits notFound() before the navigation lands — the user gets
    // stuck on a 404 inside /painel instead of reaching /login. A full reload discards
    // that tree instead of racing it.
    window.location.href = '/login';
  }, []);

  const value = useMemo(() => ({ user, setUser, logout }), [user, setUser, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
