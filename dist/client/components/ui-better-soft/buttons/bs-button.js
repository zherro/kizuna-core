import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from '../../ui/button';
import { cn } from '../../../../lib/utils';
const VARIANT_CLASSES = {
    default: 'bg-brand text-brand-foreground hover:bg-brand/90',
    outline: '',
};
export function BsButton({ label, variant = 'default', icon: Icon, onClick, disabled, }) {
    return (_jsxs(Button, { type: "button", variant: variant === 'default' ? 'default' : 'outline', onClick: onClick, disabled: disabled, className: cn(VARIANT_CLASSES[variant]), children: [Icon ? _jsx(Icon, { className: "mr-1.5 h-4 w-4" }) : null, label] }));
}
//# sourceMappingURL=bs-button.js.map