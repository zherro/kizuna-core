import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The core has no node_modules of its own — it is consumed via a tsconfig path alias. `npx vitest`
// run from here resolves vitest / @testing-library / jsdom from the parent project's node_modules.
export default defineConfig({
  resolve: {
    alias: {
      // Some core files import themselves via the consumer-facing `@kizuna/core/*` alias
      // (e.g. taxonomy-icon). The parent project's vitest config maps this; mirror it here so
      // tests run from inside the submodule resolve the same way.
      '@kizuna/core': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'cli/**/*.test.mjs'],
    environment: 'node',
    // per-file override via `// @vitest-environment jsdom` for the component/hook tests
  },
});
