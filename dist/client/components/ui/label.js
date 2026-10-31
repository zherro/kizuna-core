'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../../../lib/utils';
import clsx from 'clsx';
export function Label({ className, ...props }) {
    return _jsx("label", { className: cn('text-sm font-medium text-foreground', className), ...props });
}
export function SectionLabel({ children, className }) {
    return (_jsx("p", { className: clsx(
        // Tamanho responsivo
        'text-[10px] sm:text-xs md:text-sm', 
        // Estilo
        'font-medium uppercase tracking-[0.22em]', 
        // Cor
        'text-primary', className), children: children }));
}
//# sourceMappingURL=label.js.map