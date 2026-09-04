# API & Data Layer

How a consuming project talks to Postgres: everything goes through PostgREST over HTTP — no ORM,
no Supabase JS SDK. Two levels:

1. **Low-level** — `pgrstTable` / `pgrstRpc` (`@kizuna/core/server`), thin `fetch` wrappers over
   PostgREST's own querystring syntax. Server-only.
2. **Generic resource route** — one `/api/resources/[resource]` handler backed by a project's
   `ResourceConfig` registry, plus client hooks (`useTable`, `useForm`, …) that call it.

Reach for the generic route first. Only write a bespoke `/api/<x>` route when the generic
`mapInput` genuinely can't express the write (file upload, N:N table sync with no bulk endpoint,
a composite-key upsert with no id).

---

## 1. Low-level: `pgrstTable` / `pgrstRpc`

`@kizuna/core/server` (`server/postrest/conn.ts`). Server-only — they read the session cookie for
the `Authorization` header.

```ts
import { pgrstTable, pgrstRpc } from '@kizuna/core/server';

// GET
const res = await pgrstTable('/categories?active=eq.true&order=name.asc');
const rows = await res.json();

// POST (insert, return the row)
await pgrstTable(
  '/categories',
  { method: 'POST', body: JSON.stringify({ name: 'Foo' }) },
  // opts is only { auth?: string | null }; Prefer defaults to return=representation for POST/PUT
);

// PATCH
await pgrstTable('/categories?id=eq.123', { method: 'PATCH', body: JSON.stringify({ name: 'Bar' }) });

// DELETE
await pgrstTable('/categories?id=eq.123', { method: 'DELETE' });

// RPC
const r = await pgrstRpc('fn_search_things', { p_query: 'foo' }, { schema: 'public' });
```

Signatures:

```ts
pgrstTable(path: string, init?: RequestInit, opts?: { auth?: string | null }): Promise<Response>
pgrstRpc(name: string, body: unknown, opts?: { auth?: string | null; schema?: string }): Promise<Response>
```

- `auth`: omit → auth header comes from the request cookie. Pass `null` for an explicitly
  unauthenticated call (public reads). Pass a header string for a service call.
- Non-`public` schema: set `Accept-Profile` / `Content-Profile` headers in `init.headers`
  (`pgrstRpc` takes `schema` in `opts` and does this for you).
- Env: `POSTGREST_URL` (default `http://127.0.0.1:3000`). `DEBUG_HTTP=1` logs an equivalent
  `curl` for every call.
- There is **no** query-builder abstraction in the core — you write PostgREST's filter syntax
  (`?select=…&col=eq.5&order=col.desc`) directly. (foco-total ships its own `RestQueryBuilder` on
  top; that is a consuming-project convenience, not core.)

### Query syntax cheat-sheet (PostgREST)

| Need | Path |
|---|---|
| Select columns / embed | `?select=id,name,category:categories(id,name)` |
| Filter eq | `?status=eq.active` |
| Filter in | `?id=in.(1,2,3)` |
| Contains (array/jsonb) | `?tags=cs.{"a"}` |
| Order | `?order=created_at.desc` |
| Paginate | `Range: 0-19` header, or `?limit=20&offset=40` |
| Exact count | `Prefer: count=exact` → `Content-Range` response header |

---

## 2. Generic resource route — `/api/resources/[resource]`

A consuming project mounts one route file that delegates to the core CRUD handlers, backed by the
project's own `postgrestResources` registry (see §3).

```
GET    /api/resources/:resource        → listResource()      paginated list
POST   /api/resources/:resource        → createResource()  | executeRpcResource() (if RPC-typed)
GET    /api/resources/:resource/:id     → getResourceById()
PUT    /api/resources/:resource/:id     → updateResource()
PATCH  /api/resources/:resource/:id     → updateResource()
DELETE /api/resources/:resource/:id     → deleteResource()   (soft delete if softDeleteField set)
```

Handlers live in `@kizuna/core/server` (`postgrest-crud.ts` — see `STATUS.md` for the authoritative
export list; a dup `crud-handlers.ts` is being reconciled). Route template:

```ts
import { listResource, createResource, isRpcResource, executeRpcResource } from '@kizuna/core/server';

export async function GET(req: NextRequest, { params }: { params: { resource: string } }) {
  return listResource(params.resource, req);
}
export async function POST(req: NextRequest, { params }: { params: { resource: string } }) {
  if (isRpcResource(params.resource)) return executeRpcResource(params.resource, req);
  return createResource(params.resource, req);
}
```

### List query params

| Param | Example | Effect |
|---|---|---|
| `page` | `page=2` | 1-based pagination |
| `pageSize` | `pageSize=20` | default 20, capped at `config.maxPageSize ?? 100` |
| `search` | `search=text` | `ilike *text*` OR across `config.searchableColumns` |
| `orderBy` | `orderBy=created_at` | falls back to `config.defaultOrder` |
| `orderDirection` | `orderDirection=desc` | `asc` (default) \| `desc` |
| `filter.<col>` | `filter.active=true` | exact match (`eq.`) |
| `filter_cs.<col>` | `filter_cs.tags=["a"]` | contains (`cs.`) |

### Response shapes

```jsonc
// list
{ "items": [...], "page": 1, "pageSize": 20, "total": 100, "totalPages": 5 }
// getById
{ "item": {...} }
// create → 201
{ "message": "Registro criado com sucesso.", "item": {...} }
// update
{ "message": "Registro atualizado com sucesso.", "item": {...} }
// error (any status) — the one canonical error shape
{ "message": "Mensagem pt-BR", "details": "raw hint (optional)" }
```

`total` from `Content-Range`. When `count=exact` is disabled in a deployment, set
`returnCountPreferDisabled: true` on the config and derive counts client-side (`useTable` already
floors `total` at `items.length`).

### Auth

Every handler except a `listRequiresAuth: false` list calls `ensureAuthenticated()` — valid
session **and** `session.role === 'auth_user'`. `tenant_id` / `created_by` / `uid` are never read
from the body; the DB column defaults (`auth.fun_auth_current_tenant_id()` etc.) resolve them from
the JWT. See `AUTH.md`.

### `updateResource` is not a partial patch

`updateResource` runs `config.mapInput()` over the **whole** body and PATCHes every column it
returns, defaulting anything the body omitted. A multi-step form that saves one step at a time
must **read-merge-write**: spread the last-loaded record into the payload, then override only the
current step's fields. Pass `{ skipMapInput: true }` to PATCH the raw body as-is. (See the
`novo-wizard` skill.)

### Direct server-side reads — `serverFetchResource`

```ts
const rows = await serverFetchResource<Thing>('things', { active: 'true' }, { auth: null, limit: 50 });
```

Applies the config's `select` + `mapOutput`, skips the HTTP layer. `auth` is explicit — `null`
for public resources, a header string otherwise.

---

## 3. `ResourceConfig` / `RpcConfig`

The registry the generic route reads. A project keeps its own `postgrestResources` /
`postgrestRpcs` objects (see the `criar-recurso` skill); plugin-owned resources ship from the core
and are spread in.

```ts
type ResourceConfig = {
  schema?: string;                 // default 'public'
  table: string;                   // PostgREST table/view name
  select: string;                  // required — SELECT columns / embeds
  primaryKey: string;              // e.g. 'id'
  defaultOrder?: string;           // 'name' | 'created_at.desc' (column[.dir], a plain string)
  searchableColumns: string[];     // used by ?search=
  listRequiresAuth?: boolean;      // default true — set false for public reads
  returnRepresentation?: boolean;
  returnCountPreferDisabled?: boolean; // deployment has count=exact disabled
  maxPageSize?: number;            // overrides the 100-row cap (small reference tables / trees)
  requiredFields?: string[];       // validated post-mapInput on create/update → 400 if blank
  softDeleteField?: string;        // boolean col — DELETE becomes PATCH {field:true}; lists exclude true
  mapInput?:  (input: Record<string, unknown>) => Record<string, unknown>;  // camelCase form → snake_case cols
  mapOutput?: (record: Record<string, unknown>) => Record<string, unknown>; // snake_case row → camelCase
};

type RpcConfig = { schema?: string; requiresAuth?: boolean };
```

`parseActive` / `makeSlug` are exported from `@kizuna/core/types` for use inside `mapInput`.
Worked `mapInput`/`mapOutput` examples: `SCHEMAS.md`.

---

## 4. Client hooks — `@kizuna/core/client`

All call `/api/resources/:resource`. See `COMPONENTS.md` for the full list; the load-bearing ones:

| Hook | Use |
|---|---|
| `useTable` | paginated + searchable list for an admin table |
| `useForm` | Formik + `resourceSubmit` (POST if no `selectedId`, PUT if set) |
| `useDelete` | delete-with-confirmation |
| `useToggleActive` | flip a soft-delete / active flag |
| `useResourceOptions` | one resource → combobox options, re-fetches on `filter` change |
| `useResourceMap` | N independent resources in parallel, each slice resolves on its own |
| `useTenantResource` | tenant-scoped rows where no id is known upfront (one-row-per-tenant, fixed multi-row, variable list) |

`useTable`, `useForm`, `useDelete`, `useResourceOptions`, `useResourceMap`, `useToggleActive` are
in the `@kizuna/core/client` barrel; the rest (`useTenantResource`, `useToast`, `useUserLocation`,
`useOnboardingSteps`/`useOnboardingProgress`) import by path — see `STATUS.md` / `COMPONENTS.md`.

```ts
const table = useTable<Thing>({ resource: 'things', pageSize: 20, filters: { active: true } });

const { formik, submitting, error } = useForm<Values, Payload, Thing>({
  initialValues: { name: '' },
  validationSchema: Yup.object({ name: Yup.string().required() }),
  resourceSubmit: { resource: 'things', selectedId: editId, toPayload: (v) => v, onSuccess: table.refresh },
});

const { remove } = useDelete({ resource: 'things', onSuccess: table.refresh });
```

`submitResource` (`@kizuna/core/lib/utils`) is the same POST/PUT helper `useForm` uses — call it
directly from a wizard's `persist()`.

## 5. Error handling

- Route handlers translate Postgres errors to pt-BR via `translateApiErrorMessage(raw, fallback)`
  (`@kizuna/core/lib/api-error-message`) — known rules today: unique-violation on a `slug` column,
  any other unique violation; unknown → the fallback string.
- Client hooks expose `error: string | null`, safe to render directly.
- Toasts: `useToast()` → `{ success, error, info }` (Sonner).
