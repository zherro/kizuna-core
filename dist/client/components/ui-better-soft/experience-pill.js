import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Zap } from 'lucide-react';
import { cn } from '../../../lib/utils';
export function ExperiencePill({ text = 'Experiencia rapida para comprar e vender local', className, }) {
    return (_jsxs("span", { className: cn('inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary', className), children: [_jsx(Zap, { className: "h-3.5 w-3.5" }), text] }));
}
//# sourceMappingURL=experience-pill.js.map