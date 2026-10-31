import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../../../lib/utils';
export function Divider({ width = 100, my = 2, px = 0, invisible = false, className, }) {
    return (_jsx("div", { className: cn('flex justify-center', className), style: {
            paddingTop: `${my * 0.25}rem`,
            paddingBottom: `${my * 0.25}rem`,
            paddingLeft: px ? `${px * 0.25}rem` : undefined,
            paddingRight: px ? `${px * 0.25}rem` : undefined,
        }, children: _jsx("hr", { className: cn('border-t', invisible ? 'border-none' : 'border-border'), style: { width: `${Math.min(100, Math.max(1, width))}%` } }) }));
}
//# sourceMappingURL=divider.js.map