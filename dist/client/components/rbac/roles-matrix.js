'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../providers/auth-provider';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { cn } from '../../../lib/utils';
import { callRbacRpc } from './rbac-rpc';
const key = (roleId, permId) => `${roleId}:${permId}`;
/** `service_moderations` -> "Service moderations" — just readable, not a translation. */
function humanizeResource(resource) {
    const spaced = resource.replace(/[_-]+/g, ' ').trim();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
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
    return (_jsxs("div", { className: "flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "h-2.5 w-2.5 rounded-sm bg-primary" }), " concedida"] }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "h-2.5 w-2.5 rounded-sm bg-muted" }), " n\u00E3o concedida"] }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "h-2.5 w-2.5 rounded-sm bg-muted opacity-40" }), " sem permiss\u00E3o pra conceder"] }), _jsx("div", { className: "mt-2 w-full overflow-x-auto rounded-xl border border-border", children: _jsxs("table", { className: "w-full min-w-[560px] border-collapse text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border bg-muted/60", children: [_jsx("th", { className: "sticky left-0 z-20 bg-muted/60 px-4 py-3 text-left font-semibold", children: "Permiss\u00E3o" }), roles.map((role) => (_jsx("th", { className: "min-w-[104px] px-3 py-3 text-center font-semibold whitespace-nowrap", children: _jsxs("div", { className: "flex flex-col items-center gap-1", children: [_jsx("span", { children: role.name }), _jsx(Badge, { variant: role.tenant_id == null ? 'secondary' : 'outline', className: "text-[10px] font-normal", children: role.tenant_id == null ? 'global' : 'próprio' })] }) }, role.id)))] }) }), _jsx("tbody", { children: groups.map((group) => (_jsx(FragmentGroup, { group: group, roles: roles, grants: grants, pending: pending, canEditRole: canEditRole, callerCanGrant: callerCanGrant, onToggle: toggle }, group.resource))) })] }) })] }));
}
function FragmentGroup({ group, roles, grants, pending, canEditRole, callerCanGrant, onToggle, }) {
    return (_jsxs(_Fragment, { children: [_jsx("tr", { className: "border-t border-border bg-muted/30", children: _jsx("td", { colSpan: roles.length + 1, className: "sticky left-0 z-10 bg-muted/30 px-4 py-2 text-xs font-semibold tracking-wide text-foreground/80", children: _jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsx(KeyRound, { className: "h-3.5 w-3.5 text-muted-foreground", "aria-hidden": true }), humanizeResource(group.resource), _jsx(Badge, { variant: "outline", className: "ml-1 text-[10px] font-normal text-muted-foreground", children: group.items.length })] }) }) }), group.items.map((perm, idx) => (_jsxs("tr", { className: cn('border-t border-border/60 hover:bg-muted/20', idx % 2 === 1 && 'bg-muted/10'), children: [_jsx("td", { className: "sticky left-0 z-10 bg-background px-4 py-2.5", children: _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx(Badge, { variant: "outline", className: "font-mono text-[10px] uppercase", children: perm.action }), perm.name ? (_jsx("span", { className: "text-xs text-muted-foreground", children: perm.name })) : null] }) }), roles.map((role) => {
                        const k = key(role.id, perm.id);
                        const granted = grants.has(k);
                        const disabled = pending.has(k) || !canEditRole(role) || !callerCanGrant(perm);
                        return (_jsx("td", { className: cn('px-3 py-2.5 text-center transition-colors', granted && 'bg-primary/5'), children: _jsx(Checkbox, { className: cn(pending.has(k) && 'animate-pulse'), checked: granted, disabled: disabled, onCheckedChange: () => onToggle(role, perm), "aria-label": `${role.name} — ${group.resource}.${perm.action}` }) }, role.id));
                    })] }, perm.id)))] }));
}
//# sourceMappingURL=roles-matrix.js.map