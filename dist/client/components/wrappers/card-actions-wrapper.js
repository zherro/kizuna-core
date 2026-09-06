import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from 'next/link';
import { Save } from 'lucide-react';
import { Button, buttonVariants } from '../ui/button';
import { cn } from '../../../lib/utils';
export function CardActionsWrapper({ children, cancelHref, action, submitting, className, }) {
    const submitLabel = action === 'update' ? 'Atualizar' : 'Salvar';
    const submittingLabel = action === 'update' ? 'Atualizando...' : 'Salvando...';
    return (_jsxs("div", { className: cn('flex flex-col gap-3 border-t pt-2 sm:flex-row sm:items-center sm:justify-between', className), children: [_jsx("div", { className: "text-sm text-muted-foreground", children: children }), _jsxs("div", { className: "flex flex-wrap gap-2 sm:justify-end", children: [_jsx(Link, { href: cancelHref, className: cn(buttonVariants({ variant: 'outline' }), 'sm:w-auto'), children: "Cancelar" }), _jsxs(Button, { type: "submit", disabled: submitting, children: [_jsx(Save, { className: "mr-2 h-4 w-4" }), submitting ? submittingLabel : submitLabel] })] })] }));
}
//# sourceMappingURL=card-actions-wrapper.js.map