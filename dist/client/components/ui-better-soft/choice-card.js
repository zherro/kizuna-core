import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Badge } from '../ui/badge';
import { cn } from '../../../lib/utils';
export function ChoiceCard({ selected, onSelect, title, description, badge, }) {
    return (_jsxs("button", { type: "button", onClick: onSelect, className: cn('flex flex-col items-start gap-1.5 rounded-2xl border-2 p-4 text-left transition-all', selected ? 'border-brand bg-brand-soft' : 'border-border bg-card hover:border-brand/40'), children: [_jsxs("div", { className: "flex w-full items-center justify-between gap-2", children: [_jsx("span", { className: "font-semibold", children: title }), badge ? (_jsx(Badge, { variant: "outline", className: cn('border-transparent text-[10px]', selected ? 'bg-brand text-brand-foreground' : 'bg-muted'), children: badge })) : null] }), _jsx("p", { className: "text-xs text-muted-foreground", children: description })] }));
}
//# sourceMappingURL=choice-card.js.map