import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { buttonVariants } from '../ui/button';
import { CardHeader } from '../ui/card';
import { cn } from '../../../lib/utils';
export function CardHeaderBackLinkWrapper({ href, label, className, }) {
    return (_jsx(CardHeader, { className: cn('border-b bg-gradient-to-br from-muted/70 via-background to-background', className), children: _jsx("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", children: _jsxs(Link, { href: href, className: cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2'), children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), label] }) }) }));
}
//# sourceMappingURL=card-header-back-link-wrapper.js.map