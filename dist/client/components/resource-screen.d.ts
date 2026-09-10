import type { ResourceScreenConfig } from '../../types/resource-screen';
/**
 * Generic "form + searchable/paginated list" CRUD block, driven entirely by
 * `ResourceScreenConfig`. Backs every screen registered as `resource-screen`
 * in `screen-engine/registry.ts` — `categorias` and `subcategorias` are two
 * independent resources rendered by this exact same component, which is the
 * point: the component carries no resource-specific code, only the config
 * does.
 */
export declare function ResourceScreen({ config }: {
    config: ResourceScreenConfig;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=resource-screen.d.ts.map