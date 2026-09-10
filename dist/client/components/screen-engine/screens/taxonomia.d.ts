import type { ScreenConfig } from '../../../../types/screen';
/**
 * `taxonomy-manager` is NOT a generic `resource-screen` — it's the existing
 * bespoke group→category→subcategory→tag tree editor
 * (`kizuna-core/src/client/components/taxonomy/taxonomy-manager.tsx`), registered as-is. This is
 * the other half of the validation: the engine composes a page from a mix
 * of generic blocks (`page-header`) and one-off registered blocks
 * (`taxonomy-manager`) side by side — it doesn't force every screen into
 * the flat CRUD shape. Only the page-level layout moved into JSON; the
 * tree's own logic was intentionally left untouched.
 */
export declare const TAXONOMIA_SCREEN: ScreenConfig;
//# sourceMappingURL=taxonomia.d.ts.map