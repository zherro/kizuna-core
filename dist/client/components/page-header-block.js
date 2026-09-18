import { jsx as _jsx } from "react/jsx-runtime";
import { PageHeader } from './ui-better-soft/headers/page-header';
/**
 * Server-safe screen-engine block wrapping `PageHeader` (cataloged in showcase, id `page-header`).
 * Takes only serializable props — the back link is built here from `backHref`, never passed in as
 * JSX, so a screen config can stay plain JSON.
 */
export function PageHeaderBlock({ eyebrow, title, description, backHref, backLabel, }) {
    return (_jsx(PageHeader, { eyebrow: eyebrow, title: title, description: description, backHref: backHref, backLabel: backLabel }));
}
//# sourceMappingURL=page-header-block.js.map