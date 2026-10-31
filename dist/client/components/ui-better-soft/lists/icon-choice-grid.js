import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '../../../../lib/utils';
const ACCENT_CARD = {
    brand: {
        active: 'border-brand ring-2 ring-brand/30',
        idle: 'border-border bg-card hover:border-brand hover:shadow-sm',
    },
    primary: {
        active: 'border-primary/50 bg-primary/10 text-primary shadow-sm',
        idle: 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5',
    },
};
const ACCENT_ICON = {
    brand: { active: 'bg-brand text-brand-foreground', idle: 'bg-muted group-hover:bg-brand/10' },
    primary: { active: 'bg-primary text-primary-foreground', idle: 'bg-muted' },
};
/** Grid of selectable cards (icon + title + description), e.g. for a category/group picker step. */
export function IconChoiceGrid({ items, value, onChange, accent = 'brand', disabled, layout = 'vertical', columnsClassName, emptyMessage = 'Nenhuma opção disponível.', }) {
    if (items.length === 0) {
        return (_jsx("p", { className: "rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground", children: emptyMessage }));
    }
    const cardTone = ACCENT_CARD[accent];
    const iconTone = ACCENT_ICON[accent];
    return (_jsx("div", { className: cn('grid gap-3', columnsClassName ?? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'), children: items.map((item) => {
            const active = value === item.id;
            return (_jsxs("button", { type: "button", disabled: disabled, onClick: () => onChange(item.id), className: cn('group flex gap-2 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60', layout === 'horizontal' ? 'items-start gap-3' : 'flex-col items-start', active ? cardTone.active : cardTone.idle), children: [_jsx("div", { className: cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl transition', active ? iconTone.active : iconTone.idle), children: item.icon }), _jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-sm font-semibold", children: item.title }), item.description ? (_jsx("div", { className: "line-clamp-2 text-xs text-muted-foreground", children: item.description })) : null] })] }, item.id));
        }) }));
}
//# sourceMappingURL=icon-choice-grid.js.map