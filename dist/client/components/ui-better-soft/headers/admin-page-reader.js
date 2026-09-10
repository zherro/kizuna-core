import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { buttonVariants } from '../../ui/button';
import { Typography } from '../../ui/typography';
import { cn } from '../../../../lib/utils';
export function AdminPageReader({ title, description, backHref = '/painel', backLabel = 'Ir ao painel', actions, className, }) {
    return (_jsxs("div", { className: cn('mb-6 flex flex-wrap items-start justify-between gap-4', className), children: [_jsxs("div", { className: "min-w-0", children: [backHref ? (_jsxs(Link, { href: backHref, className: cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mb-2 -ml-2 h-8 gap-1 text-muted-foreground'), children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), backLabel] })) : null, _jsx(Typography.H2, { children: title }), description ? (_jsx(Typography.P, { color: "muted", className: "mt-1 max-w-2xl", children: description })) : null] }), actions ? _jsx("div", { className: "flex flex-wrap gap-2", children: actions }) : null] }));
}
//# sourceMappingURL=admin-page-reader.js.map