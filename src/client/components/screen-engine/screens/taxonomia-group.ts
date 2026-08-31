import type { ScreenConfig } from '../../../../types/screen';
import { TAXONOMIA_SCREEN } from './taxonomia';
import { CATEGORIAS_SCREEN } from './categorias';
import { SUBCATEGORIAS_SCREEN } from './subcategorias';

/**
 * The 3 taxonomy-plugin screens, keyed by slug for `createScreenGroupPage`'s catch-all route
 * (`/painel/taxonomia/[slug]`) — replaces what used to be 3 separate routes/`page.tsx` files
 * (`/painel/administracao/taxonomia`, `/painel/categorias`, `/painel/subcategorias`). All 3 stay
 * exactly as they were; only the routing collapsed into one file, the same way ROOT screens
 * already share `/painel/root/[slug]`.
 */
export const TAXONOMIA_SCREEN_GROUP: Record<string, ScreenConfig> = {
  arvore: TAXONOMIA_SCREEN,
  categorias: CATEGORIAS_SCREEN,
  subcategorias: SUBCATEGORIAS_SCREEN,
};
