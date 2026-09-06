import { defineConfig } from 'vitest/config';

// The core has no node_modules of its own — it is consumed via a tsconfig path alias. `npx vitest`
// run from here resolves vitest / @testing-library / jsdom from the parent project's node_modules.
export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'cli/**/*.test.mjs'],
    environment: 'node',
    // per-file override via `// @vitest-environment jsdom` for the component/hook tests
  },
});
