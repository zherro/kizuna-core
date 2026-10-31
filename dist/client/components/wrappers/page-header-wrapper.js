import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from 'next/link';
import { buttonVariants } from '../ui/button';
import { cn } from '../../../lib/utils';
export function PageHeaderWrapper({ badge, title, description, action, className, }) {
    return (_jsx("section", { className: cn('rounded-2xl border border-border bg-card px-6 py-5', className), children: _jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", children: [_jsxs("div", { children: [badge ? (_jsx("p", { className: "text-sm font-medium uppercase tracking-[0.22em] text-primary", children: badge })) : null, _jsx("h1", { className: cn('text-2xl font-semibold tracking-tight', badge ? 'mt-2' : ''), children: title }), description ? _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: description }) : null] }), action ? (_jsxs(Link, { href: action.href, className: cn(buttonVariants({
                        variant: action.variant ?? 'default',
                        size: action.size ?? 'default',
                    }), 'gap-2 self-start'), children: [action.icon, action.label] })) : null] }) }));
}
//# sourceMappingURL=page-header-wrapper.js.map