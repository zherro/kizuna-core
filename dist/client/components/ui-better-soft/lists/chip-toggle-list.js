import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check } from 'lucide-react';
import { cn } from '../../../../lib/utils';
const ACCENT_CHIP = {
    brand: {
        active: 'border-brand bg-brand text-brand-foreground',
        idle: 'border-border bg-card hover:border-brand',
    },
    primary: {
        active: 'border-primary/45 bg-primary/10 font-semibold text-primary',
        idle: 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5',
    },
};
/** Row of toggleable pill chips, e.g. for picking several tags/specialties in one step. */
export function ChipToggleList({ options, value, onChange, accent = 'brand', }) {
    const selected = new Set(value);
    const tone = ACCENT_CHIP[accent];
    function toggle(id) {
        onChange(selected.has(id) ? value.filter((item) => item !== id) : [...value, id]);
    }
    return (_jsx("div", { className: "flex flex-wrap gap-2", children: options.map((option) => {
            const active = selected.has(option.id);
            return (_jsxs("button", { type: "button", onClick: () => toggle(option.id), className: cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition', active ? tone.active : tone.idle), children: [active ? _jsx(Check, { className: "h-3.5 w-3.5" }) : null, option.label] }, option.id));
        }) }));
}
//# sourceMappingURL=chip-toggle-list.js.map