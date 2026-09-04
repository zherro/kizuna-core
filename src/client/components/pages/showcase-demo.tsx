'use client';

import { PagesAdmin } from './PagesAdmin';

/**
 * Showcase demo for the `pages` plugin admin. Renders the real `PagesAdmin` — in the showcase
 * (no `/api/resources/pages` backend) it degrades to its empty/error state, which is itself a
 * useful preview of the master/detail chrome.
 */
export function PagesAdminShowcaseDemo() {
  return <PagesAdmin reservedSlugs={['painel', 'busca', 'api']} />;
}
