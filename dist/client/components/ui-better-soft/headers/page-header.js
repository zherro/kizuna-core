import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Grid } from '../../ui/grid';
import { Typography } from '../../ui/typography';
import { SectionLabel } from '../../ui/label';
import { buttonVariants } from '../../ui/button';
import { activeTheme } from '../../../lib/ui-theme';
import { cn } from '../../../../lib/utils';
/**
 * List/manager page header: eyebrow + title + description on the left,
 * actions (back link, primary action…) on the right, laid out on the
 * app's 12-col `Grid` so it stacks cleanly at every breakpoint instead of
 * only flipping once at `md`.
 */
export function PageHeader({ eyebrow, title, description, backHref, backLabel = 'Ir ao painel', actions, className, }) {
    return (_jsxs(Grid, { container: true, containerSize: "fluid", padding: "none", gap: 3, className: cn('items-end', className), children: [_jsxs(Grid, { xs: 12, sm: 9, md: 9, lg: 8, children: [backHref ? (_jsxs(Link, { href: backHref, className: cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mb-2 -ml-2 h-8 gap-1 text-muted-foreground'), children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), backLabel] })) : null, eyebrow ? _jsx(SectionLabel, { children: eyebrow }) : null, _jsx(Typography.H2, { size: activeTheme.pageHeaderTitleSize, weight: activeTheme.pageHeaderTitleWeight, children: title }), description ? (_jsx(Typography.P, { className: "text-muted-foreground", children: description })) : null] }), actions ? (_jsx(Grid, { xs: 12, sm: 3, md: 3, lg: 4, className: "flex flex-wrap gap-2 justify-end", children: actions })) : null] }));
}
//# sourceMappingURL=page-header.js.map