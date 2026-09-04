# Utils & Shared Helpers

Small, dependency-light helpers shipped by the core. Entry points:

## `@kizuna/core/lib/utils`

| Export | Signature | Notes |
|---|---|---|
| `cn` | `cn(...inputs: ClassValue[]): string` | `clsx` + `tailwind-merge` |
| `submitResource` | see `API.md` §4 | POST/PUT against `/api/resources/:resource`; used by `useForm`'s `resourceSubmit` |
| `resolveLucideIcon` | `(name?: string \| null) => LucideIcon \| null` | resolves a DB-stored `lucide-react` export name (e.g. `"Wrench"`) to the component; `null` for unknown/empty |
| `isShowcaseEnabled` | `() => boolean` | reads `SHOWCASE_ENABLED` / `NEXT_PUBLIC_SHOWCASE_ENABLED` (`1`/`true`/`on`/`yes`) |

## `@kizuna/core/lib/api-error-message`

```ts
translateApiErrorMessage(raw: string | undefined, fallback: string): string
```

Maps a Postgres/PostgREST error string to a friendly pt-BR message. Rules today: unique-violation
on a `slug` column, any other unique violation. No match → returns `raw` (or `fallback` if `raw`
is empty). Called inside `submitResource` and the CRUD handlers.

## `@kizuna/core/lib/temporal-global`

Side-effect import — polyfills `globalThis.Temporal`. Import once at the app root when you need
`Temporal` for precise date/time math.

## Path imports (no barrel)

- `lib/shared/brazil-ufs` → `BRAZIL_UF_OPTIONS` (27 state codes).
- `lib/shared/currency-mask` → `formatCurrencyMask(value: string | number)`,
  `parseCurrencyMask(str) → cents`, `formatCurrency(cents) → "R$ 1.234"`. Price is stored in the
  DB as **integer cents** — convert before saving, format on display.
- `lib/helper/date.helper` → `formatDate(iso)`, `formatDateTime(value)`, `nowDateString()`,
  `nowDateTimeString()`.
- `lib/helper/text.helper` → `textWrap(text, limit)` (word-boundary truncate with `…`; prefer CSS
  `text-ellipsis` in the DOM, keep this for email/meta text).
- `lib/feature-flags` → `isShowcaseEnabled` (also re-exported from `lib/utils`).

A consuming project keeps its own country/document-specific helpers (CPF/CNPJ validators, a
query-builder, locale date formatters) in its own `src/lib/` — those are not core.
