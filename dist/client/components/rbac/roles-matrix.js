'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../providers/auth-provider';
import { callRbacRpc } from './rbac-rpc';
const key = (roleId, permId) => `${roleId}:${permId}`;
export function RolesMatrix({ roles, groups, initialGrants }) {
    const { user } = useAuth();
    const { success, error } = useToast();
    const isRoot = user?.is_root === true;
    const [grants, setGrants] = useState(() => new Set(initialGrants.map((g) => key(g.role_id, g.permission_id))));
    const [pending, setPending] = useState(() => new Set());
    const canEditRole = useMemo(() => (role) => isRoot || role.tenant_id != null, [isRoot]);
    const callerCanGrant = (perm) => isRoot ||
        user?.perms?.[perm.resource]?.[perm.action] === true;
    async function toggle(role, perm) {
        const k = key(role.id, perm.id);
        const next = !grants.has(k);
        setPending((p) => new Set(p).add(k));
        setGrants((prev) => {
            const s = new Set(prev);
            if (next)
                s.add(k);
            else
                s.delete(k);
            return s;
        });
        const res = await callRbacRpc('fn_rbac__set_role_grant', {
            p_role_id: role.id,
            p_permission_id: perm.id,
            p_granted: next,
        });
        setPending((p) => {
            const s = new Set(p);
            s.delete(k);
            return s;
        });
        if (!res.ok) {
            setGrants((prev) => {
                const s = new Set(prev);
                if (next)
                    s.delete(k);
                else
                    s.add(k);
                return s;
            });
            error(res.message ?? 'Não foi possível salvar.');
            return;
        }
        success('Permissão atualizada.');
    }
    return (_jsx("div", { className: "overflow-x-auto rounded-xl border border-border", children: _jsxs("table", { className: "w-full border-collapse text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-muted/50", children: [_jsx("th", { className: "sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left font-semibold", children: "Permiss\u00E3o" }), roles.map((role) => (_jsxs("th", { className: "px-3 py-2 text-center font-semibold whitespace-nowrap", children: [role.name, role.tenant_id == null ? (_jsx("span", { className: "ml-1 text-[10px] font-normal text-muted-foreground", children: "global" })) : null] }, role.id)))] }) }), _jsx("tbody", { children: groups.map((group) => (_jsx(FragmentGroup, { group: group, roles: roles, grants: grants, pending: pending, canEditRole: canEditRole, callerCanGrant: callerCanGrant, onToggle: toggle }, group.resource))) })] }) }));
}
function FragmentGroup({ group, roles, grants, pending, canEditRole, callerCanGrant, onToggle, }) {
    return (_jsxs(_Fragment, { children: [_jsx("tr", { className: "border-t border-border bg-background", children: _jsx("td", { colSpan: roles.length + 1, className: "px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground", children: group.resource }) }), group.items.map((perm) => (_jsxs("tr", { className: "border-t border-border/60", children: [_jsxs("td", { className: "sticky left-0 z-10 bg-background px-3 py-2", children: [_jsx("span", { className: "font-medium", children: perm.action }), perm.name ? (_jsx("span", { className: "ml-2 text-xs text-muted-foreground", children: perm.name })) : null] }), roles.map((role) => {
                        const k = key(role.id, perm.id);
                        const disabled = pending.has(k) || !canEditRole(role) || !callerCanGrant(perm);
                        return (_jsx("td", { className: "px-3 py-2 text-center", children: _jsx("input", { type: "checkbox", className: "h-4 w-4 accent-primary disabled:opacity-40", checked: grants.has(k), disabled: disabled, onChange: () => onToggle(role, perm) }) }, role.id));
                    })] }, perm.id)))] }));
}
//# sourceMappingURL=roles-matrix.js.map