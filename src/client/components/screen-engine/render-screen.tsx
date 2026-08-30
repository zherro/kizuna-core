import { cn } from '../../../lib/utils';
import type { ScreenConfig, ScreenContext } from '../../../types/screen';
import { SCREEN_COMPONENT_REGISTRY } from './registry';
import { resolveContextRefs } from './context';

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
    <div
      className={cn(
        // Same px-4/py-6/sm:px-6/lg:px-8 formula as /painel/agenda/feriados's own hand-rolled
        // container (this app's page-layout standard) — every screen-engine page shares one
        // spacing rhythm, not a per-screen approximation of it.
        'mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8',
        config.maxWidth === 'narrow' ? 'max-w-4xl' : 'max-w-6xl'
      )}
    >
      {config.blocks.map((block: ScreenConfig['blocks'][number], index: number) => {
        const entry = SCREEN_COMPONENT_REGISTRY[block.component];

        if (!entry) {
          throw new Error(
            `screen-engine: componente "${block.component}" nao esta registrado em SCREEN_COMPONENT_REGISTRY (tela "${config.id}").`
          );
        }

        const Component = entry.component;
        const props = context ? resolveContextRefs(block.props, context) : block.props;
        return <Component key={`${block.component}-${index}`} {...props} />;
      })}
    </div>
  );
}
