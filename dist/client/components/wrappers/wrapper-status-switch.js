'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Switch } from '../ui/switch';
import { cn } from '../../../lib/utils';
export function WrapperStatusSwitch({ checked, onToggle, activeLabel = 'Ativo', inactiveLabel = 'Inativo', disabled = false, className, }) {
    const [pending, setPending] = useState(false);
    return (_jsxs("div", { className: cn('flex items-center gap-2', className), children: [_jsx(Switch, { checked: checked, disabled: disabled || pending, onCheckedChange: (nextChecked) => {
                    setPending(true);
                    void Promise.resolve(onToggle(nextChecked)).finally(() => {
                        setPending(false);
                    });
                } }), _jsx("span", { className: "text-xs text-muted-foreground", children: checked ? activeLabel : inactiveLabel })] }));
}
//# sourceMappingURL=wrapper-status-switch.js.map