import { jsx as _jsx } from "react/jsx-runtime";
import { HelpCircle } from 'lucide-react';
import { resolveLucideIcon } from '@kizuna/core/lib/utils';
import { cn } from '@kizuna/core/lib/utils';
export function TaxonomyIcon({ icon, className }) {
    const Icon = resolveLucideIcon(icon) ?? HelpCircle;
    return _jsx(Icon, { className: cn('h-4 w-4', className), "aria-hidden": "true" });
}
//# sourceMappingURL=taxonomy-icon.js.map