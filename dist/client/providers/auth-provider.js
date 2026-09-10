'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, } from 'react';
function buildAuthUser(raw) {
    const displayName = raw.display_name?.trim();
    const login = raw.login?.trim();
    const canManageCatalog = (raw.tenant_type ?? '').toUpperCase() === 'ADMIN';
    const perms = raw.perms ?? {};
    // Mirrors auth.fun_auth_has_perm's bypass on the DB side: a root session isn't granted every
    // permission row (plugins never auto-grant, see plugins/README.md), it bypasses the check
    // entirely — so the client-side gate (nav items, page guards keyed off `permResource`) must
    // bypass the same way, or a root-only feature with no explicit grant just disappears for root.
    const hasPerm = (resource, action = 'view') => raw.is_root === true || perms[resource]?.[action] === true || resource === 'default';
    const makeInitials = (str) => str
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
        const name = (login.split('@')[0] ?? 'Usuario')
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
const AuthContext = createContext(null);
export function AuthProvider({ children, initialUser, }) {
    const [user, setUserRaw] = useState(initialUser ? buildAuthUser(initialUser) : null);
    const setUser = useCallback((raw) => {
        setUserRaw(raw ? buildAuthUser(raw) : null);
    }, []);
    // Hidratação client-side: quando o layout raiz NÃO passa `initialUser` (para
    // as páginas públicas poderem ser estáticas — ver docs/HARDENING.md), busca a
    // sessão uma vez via `GET /api/auth/me`. Se `initialUser` veio do servidor
    // (ex.: layout de /painel), pula. Um `setUser` manual (pós login/registro)
    // também trava a hidratação.
    const hydrated = useRef(initialUser != null);
    useEffect(() => {
        if (hydrated.current)
            return;
        hydrated.current = true;
        const ac = new AbortController();
        fetch('/api/auth/me', { credentials: 'same-origin', signal: ac.signal })
            .then((r) => (r.ok ? r.json() : { user: null }))
            .then((d) => {
            if (d?.user)
                setUserRaw(buildAuthUser(d.user));
        })
            .catch(() => { });
        return () => ac.abort();
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
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
//# sourceMappingURL=auth-provider.js.map