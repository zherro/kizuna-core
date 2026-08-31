import type { ComponentType } from 'react';
import { PageHeaderBlock } from '../page-header-block';
import { ResourceScreen } from '../resource-screen';
import { ListBlock } from '../list-block';
import { TaxonomyManager } from '../taxonomy/taxonomy-manager';
import { AccountForm } from '../onboarding/user-data-form';

export type RegistryEntry = {
  /** Heterogeneous registry: each entry has its own prop type, resolved dynamically from screen-config JSON, not statically. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>;
  /** True when the component has no 'use client' directive and can render on the server. */
  serverSafe: boolean;
};

/**
 * Every component a screen config can reference by name. Adding a screen
 * never means writing a one-off page component — it means either reusing a
 * block already here, or registering a new one once so every future screen
 * can reuse it too.
 *
 * `serverSafe` is metadata for humans/AI composing a screen, not something
 * this file enforces — Next.js already lets a Server Component
 * (`render-screen.tsx`) render a Client Component as a child natively, so a
 * `serverSafe: false` entry works here too. It's there so a screen author
 * knows which blocks stream real HTML immediately (`page-header`) and which
 * ones wait for hydration (`resource-screen`, `taxonomy-manager`).
 */
export const SCREEN_COMPONENT_REGISTRY: Record<string, RegistryEntry> = {
  'page-header': { component: PageHeaderBlock, serverSafe: true },
  'resource-screen': { component: ResourceScreen, serverSafe: false },
  'taxonomy-manager': { component: TaxonomyManager, serverSafe: false },
  list: { component: ListBlock, serverSafe: false },
  'account-form': { component: AccountForm, serverSafe: false },
};
