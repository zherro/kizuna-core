import { jsx as _jsx } from "react/jsx-runtime";
import Link from 'next/link';
import { buttonVariants } from './ui/button';
import { AdminPageReader } from './ui-better-soft/headers/admin-page-reader';
import { PageHeader } from './ui-better-soft/headers/page-header';
/**
 * Server-safe screen-engine block wrapping either `PageHeader` (already cataloged in showcase, id
 * `page-header`) or, when `variant: 'admin-reader'`, `AdminPageReader`. Takes only serializable
 * props — the back link is built here from `backHref`, never passed in as JSX, so a screen config
 * can stay plain JSON.
 */
export function PageHeaderBlock({ eyebrow, title, description, backHref, backLabel, variant = 'default', }) {
    if (variant === 'admin-reader') {
        return (_jsx(AdminPageReader, { title: title, description: description, backHref: backHref, backLabel: backLabel, 
            // RenderScreen already spaces blocks with its own gap-6 — cancel AdminPageReader's
            // built-in mb-6 so the header isn't double-spaced from the block below it.
            className: "mb-0" }));
    }
    return (_jsx(PageHeader, { eyebrow: eyebrow, title: title, description: description, actions: backHref ? (_jsx(Link, { href: backHref, className: buttonVariants({ variant: 'outline' }), children: backLabel ?? 'Voltar ao painel' })) : null }));
}
//# sourceMappingURL=page-header-block.js.map