import { cn } from '../../../lib/utils';
import type { ScreenConfig, ScreenContext } from '../../../types/screen';
import { SCREEN_COMPONENT_REGISTRY } from './registry';
import { resolveContextRefs } from './context';
import { SCREEN_CONTAINER_CLASS } from './screen-container';

/**
 * Resolves a `ScreenConfig` (a plain, JSON-serializable block list) against
 * the component registry and renders it. Server Component by default —
 * every block that IS server-safe (see registry.ts) streams as real HTML;
 * a block that isn't (declares 'use client') still renders fine as this
 * Server Component's child, Next.js does that natively. No block here ever
 * decides business logic — it only lays the page out.
 *
 * `context` (route params / searchParams) is optional — most screens don't
 * need it. When passed, any `"$params.x"` / `"$searchParams.x"` string
 * inside a block's `props` is resolved against it first — see
 * `resolveContextRefs` in `context.ts`.
 */
export function RenderScreen({
  config,
  context,
}: {
  config: ScreenConfig;
  context?: ScreenContext;
}) {
  return (
    // Every screen-engine page shares one spacing rhythm (SCREEN_CONTAINER_CLASS), not a
    // per-screen approximation of it. `maxWidth: 'narrow'` hoje usa a mesma largura.
    <div className={cn(SCREEN_CONTAINER_CLASS, 'gap-6')}>
      {config.blocks.map((block: ScreenConfig['blocks'][number], index: number) => {
        const entry = SCREEN_COMPONENT_REGISTRY[block.component];

        if (!entry) {
          throw new Error(
            `screen-engine: componente "${block.component}" nao esta registrado em SCREEN_COMPONENT_REGISTRY (tela "${config.id}").`
          );
        }

        const Component = entry.component;
        const props = resolveContextRefs(block.props, context);
        return <Component key={`${block.component}-${index}`} {...props} />;
      })}
    </div>
  );
}
