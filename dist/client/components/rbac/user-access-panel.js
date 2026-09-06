'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../providers/auth-provider';
import { callRbacRpc } from './rbac-rpc';
export function UserAccessPanel({ users, roles, groups, roleGrants, initialOverrides, }) {
    const { user: me } = useAuth();
    const { success, error } = useToast();
    const isRoot = me?.is_root === true;
    const [selectedId, setSelectedId] = useState(users[0]?.user_id ?? null);
    const [userRole, setUserRole] = useState(() => Object.fromEntries(users.map((u) => [u.user_id, u.role_id])));
    const [overrides, setOverrides] = useState(() => {
        const map = {};
        for (const o of initialOverrides)
            map[`${o.user_id}:${o.permission_id}`] = o.effect;
        return map;
    });
    const [busy, setBusy] = useState(false);
    const selected = users.find((u) => u.user_id === selectedId) ?? null;
    const roleGrantIds = useMemo(() => {
        const map = new Map();
        for (const g of roleGrants) {
            if (!map.has(g.role_id))
                map.set(g.role_id, new Set());
            map.get(g.role_id).add(g.permission_id);
        }
        return map;
    }, [roleGrants]);
    const callerCanGrant = (perm) => isRoot ||
        me?.perms?.[perm.resource]?.[perm.action] === true;
    async function changeRole(nextRoleId) {
        if (!selected)
            return;
        setBusy(true);
        const res = await callRbacRpc('fn_rbac__set_user_role', {
            p_user_id: selected.user_id,
            p_role_id: nextRoleId,
        });
        setBusy(false);
        if (!res.ok) {
            error(res.message ?? 'Não foi possível alterar o papel.');
            return;
        }
        setUserRole((prev) => ({ ...prev, [selected.user_id]: nextRoleId }));
        success('Papel atualizado.');
    }
    async function changeOverride(perm, next) {
        if (!selected)
            return;
        const k = `${selected.user_id}:${perm.id}`;
        const prev = overrides[k] ?? 'inherit';
        setOverrides((o) => ({ ...o, [k]: next }));
        setBusy(true);
        const res = await callRbacRpc('fn_rbac__set_user_override', {
            p_user_id: selected.user_id,
            p_permission_id: perm.id,
            p_effect: next === 'inherit' ? null : next,
        });
        setBusy(false);
        if (!res.ok) {
            setOverrides((o) => ({ ...o, [k]: prev }));
            error(res.message ?? 'Não foi possível salvar o ajuste.');
            return;
        }
        success('Acesso atualizado.');
    }
    async function copyFrom(sourceUserId) {
        if (!selected || !sourceUserId)
            return;
        setBusy(true);
        const res = await callRbacRpc('fn_rbac__copy_user_access', {
            p_source_user: sourceUserId,
            p_target_user: selected.user_id,
        });
        setBusy(false);
        if (!res.ok) {
            error(res.message ?? 'Não foi possível copiar o acesso.');
            return;
        }
        success('Acesso copiado. Recarregando…');
        if (typeof window !== 'undefined')
            window.location.reload();
    }
    if (users.length === 0) {
        return (_jsx("p", { className: "rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground", children: "Nenhum membro neste tenant." }));
    }
    const currentRoleId = selected ? userRole[selected.user_id] ?? null : null;
    const inheritedIds = currentRoleId ? roleGrantIds.get(currentRoleId) ?? new Set() : new Set();
    return (_jsxs("div", { className: "grid gap-6 md:grid-cols-[260px_1fr]", children: [_jsx("aside", { className: "rounded-xl border border-border", children: _jsx("ul", { className: "max-h-[70vh] divide-y divide-border overflow-y-auto", children: users.map((u) => {
                        const label = u.display_name || u.full_name || u.email || u.user_id.slice(0, 8);
                        const active = u.user_id === selectedId;
                        return (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => setSelectedId(u.user_id), className: `flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`, children: [_jsxs("span", { className: "font-medium", children: [label, u.is_root ? ' · root' : ''] }), u.email ? (_jsx("span", { className: `text-xs ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`, children: u.email })) : null] }) }, u.user_id));
                    }) }) }), selected ? (_jsxs("section", { className: "flex flex-col gap-6", children: [_jsxs("div", { className: "flex flex-wrap items-end gap-4 rounded-xl border border-border p-4", children: [_jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [_jsx("span", { className: "font-medium", children: "Papel base" }), _jsxs("select", { className: "h-9 rounded-md border border-border bg-background px-2 text-sm", value: currentRoleId ?? '', disabled: busy || selected.is_root, onChange: (e) => void changeRole(Number(e.target.value)), children: [currentRoleId == null ? _jsx("option", { value: "", children: "\u2014" }) : null, roles.map((r) => (_jsx("option", { value: r.id, children: r.name }, r.id)))] })] }), _jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [_jsx("span", { className: "font-medium", children: "Copiar acesso de\u2026" }), _jsxs("select", { className: "h-9 rounded-md border border-border bg-background px-2 text-sm", defaultValue: "", disabled: busy, onChange: (e) => {
                                            void copyFrom(e.target.value);
                                            e.target.value = '';
                                        }, children: [_jsx("option", { value: "", children: "Selecionar usu\u00E1rio" }), users
                                                .filter((u) => u.user_id !== selected.user_id)
                                                .map((u) => (_jsx("option", { value: u.user_id, children: u.display_name || u.full_name || u.email || u.user_id.slice(0, 8) }, u.user_id)))] })] })] }), _jsx("div", { className: "space-y-5", children: groups.map((group) => (_jsxs("div", { className: "rounded-xl border border-border", children: [_jsx("p", { className: "border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground", children: group.resource }), _jsx("ul", { className: "divide-y divide-border/60", children: group.items.map((perm) => {
                                        const k = `${selected.user_id}:${perm.id}`;
                                        const state = overrides[k] ?? 'inherit';
                                        const inherited = inheritedIds.has(perm.id);
                                        const canAllow = callerCanGrant(perm);
                                        return (_jsxs("li", { className: "flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm", children: [_jsxs("span", { children: [_jsx("span", { className: "font-medium", children: perm.action }), perm.name ? (_jsx("span", { className: "ml-2 text-xs text-muted-foreground", children: perm.name })) : null, _jsxs("span", { className: "ml-2 text-[11px] text-muted-foreground", children: ["(papel: ", inherited ? 'concede' : 'não concede', ")"] })] }), _jsx("span", { className: "flex gap-1", children: ['inherit', 'allow', 'deny'].map((opt) => (_jsx("button", { type: "button", disabled: busy || (opt === 'allow' && !canAllow), onClick: () => void changeOverride(perm, opt), className: `rounded-md border px-2 py-1 text-xs transition disabled:opacity-40 ${state === opt
                                                            ? 'border-primary bg-primary text-primary-foreground'
                                                            : 'border-border hover:bg-accent'}`, children: opt === 'inherit' ? 'Herdar' : opt === 'allow' ? 'Permitir' : 'Negar' }, opt))) })] }, perm.id));
                                    }) })] }, group.resource))) })] })) : null] }));
}
//# sourceMappingURL=user-access-panel.js.map