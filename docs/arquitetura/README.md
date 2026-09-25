# Architecture

## Layout

```
kizuna-core/
├── sql/                        core auth schema + RBAC + plugin registry (0001-0108, apply in order)
├── plugins/<name>/0001_*.sql   optional, independent tables — see docs/PLUGINS.md
├── scripts/install.sh          fresh-install: sql/ then requested plugins
└── src/
    ├── types/                  ResourceConfig, ScreenConfig, AuthContext, PermissionMap, ...
    ├── client/
    │   ├── hooks/               useTable, useForm, useResourceOptions, ... — see docs/COMPONENTS.md
    │   └── components/
    │       ├── ui/               shadcn kit
    │       ├── ui-better-soft/   richer domain-flavored kit
    │       ├── screen-engine/    JSON-driven screen composition
    │       └── showcase/         live component catalog (runs at /showcase)
    ├── server/                  auth handlers, session, PostgREST wrappers, resource CRUD
    └── lib/                     cn, isShowcaseEnabled, Temporal polyfill
```

Consumed via a tsconfig path alias, not an npm package:

```json
"@kizuna/core/*": ["./kizuna-core/src/*"],
"@kizuna/core": ["./kizuna-core/src"]
```

Full public API surface (exact export list per entry point): `STATUS.md`.

## `ResourceConfig` vs `ScreenConfig`

Two orthogonal config shapes:

- `ResourceConfig` — **what** a table exposes over HTTP (table, select, primary key, searchable
  columns, `mapInput`/`mapOutput`). Powers the generic `/api/resources/[resource]` route.
- `ScreenConfig` — **how** a page is assembled from blocks (`{ component, props }[]`), resolved
  against `SCREEN_COMPONENT_REGISTRY` and rendered by `RenderScreen`.

One resource can be used by multiple screens; a screen composes one or more resources. Keeping
them separate is what lets simple CRUD (`ResourceScreen` + a `ResourceScreenConfig`) become pure
JSON with no per-screen component.

## Context references (`$params`, `$session`, `$searchParams`)

A `ScreenConfig`'s props can reference `ScreenContext` values (`$params.categoryId`,
`$session.tenant_id`, ...) instead of hardcoding them — resolved server-side at render time, so a
screen never needs a bespoke function to inject a dynamic value, and nothing client-controlled
leaks into a query that should be scoped by the JWT.
