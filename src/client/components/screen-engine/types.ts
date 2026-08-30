/**
 * A screen = an ordered list of blocks. Each block names a component
 * registered in `registry.tsx` and a bag of JSON-serializable props for it.
 *
 * Hard rule (see .claude/skills/padrao-de-projeto/SKILL.md, "Frente — motor
 * de telas genérico"): `props` must stay plain data — strings, numbers,
 * booleans, arrays/objects of those. Never a function or JSX. Any block that
 * needs behavior (a click handler, a "new item" reset...) owns that behavior
 * inside its own component, not via a prop passed down from the screen
 * config.
 */
export type ScreenBlock = {
  component: string;
  props: Record<string, unknown>;
};

export type ScreenConfig = {
  id: string;
  /**
   * Outer container width. `'default'` (max-w-6xl, most screens) or `'narrow'` (max-w-4xl, the
   * single-column /painel/agenda/feriados layout). Optional — omit for `'default'`.
   */
  maxWidth?: 'default' | 'narrow';
  blocks: ScreenBlock[];
};

/**
 * Per-request values a screen wasn't able to know at config-authoring time —
 * the route's dynamic segments, query string, and (optionally) a few plain
 * fields off the caller's session. Still just data (see `resolveContextRefs`
 * in `context.ts`): a block never receives a function, it receives the
 * already-resolved value.
 *
 * `session` is opt-in per page — most screens don't pass it. A page that
 * needs to scope a `list`/`resource-screen` block to the caller's own tenant
 * (e.g. `/painel/meus-servicos`) builds it from `getSession()` itself and
 * passes it to `RenderScreen`; nothing here reads cookies/auth on its own.
 */
export type ScreenContext = {
  params: Record<string, string>;
  searchParams: Record<string, string | string[] | undefined>;
  session?: Record<string, string>;
};
