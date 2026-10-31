'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { PagesAdmin } from './PagesAdmin';
/**
 * Showcase demo for the `pages` plugin admin. Renders the real `PagesAdmin` — in the showcase
 * (no `/api/resources/pages` backend) it degrades to its empty/error state, which is itself a
 * useful preview of the master/detail chrome.
 */
export function PagesAdminShowcaseDemo() {
    return _jsx(PagesAdmin, { reservedSlugs: ['painel', 'busca', 'api'] });
}
//# sourceMappingURL=showcase-demo.js.map