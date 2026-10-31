import type { ScreenConfig } from '../../../../types/screen';
/**
 * The 3 taxonomy-plugin screens, keyed by slug for `createScreenGroupPage`'s catch-all route
 * (`/painel/taxonomia/[slug]`) — replaces what used to be 3 separate routes/`page.tsx` files
 * (`/painel/administracao/taxonomia`, `/painel/categorias`, `/painel/subcategorias`). All 3 stay
 * exactly as they were; only the routing collapsed into one file, the same way ROOT screens
 * already share `/painel/root/[slug]`.
 */
export declare const TAXONOMIA_SCREEN_GROUP: Record<string, ScreenConfig>;
//# sourceMappingURL=taxonomia-group.d.ts.map