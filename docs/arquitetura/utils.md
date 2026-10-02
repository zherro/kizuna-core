# Utils & Shared Helpers

Small, dependency-light helpers shipped by the core. Entry points:

## `@kizuna/core/lib/utils`

| Export              | Signature                                       | Notes                                                                                                        |
| ------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `cn`                | `cn(...inputs: ClassValue[]): string`           | `clsx` + `tailwind-merge`                                                                                    |
| `submitResource`    | see [`api.md`](api.md) §4                                 | POST/PUT against `/api/resources/:resource`; used by `useForm`'s `resourceSubmit`                            |
| `resolveLucideIcon` | `(name?: string \| null) => LucideIcon \| null` | resolves a DB-stored `lucide-react` export name (e.g. `"Wrench"`) to the component; `null` for unknown/empty |
| `isShowcaseEnabled` | `() => boolean`                                 | reads `SHOWCASE_ENABLED` / `NEXT_PUBLIC_SHOWCASE_ENABLED` (`1`/`true`/`on`/`yes`)                            |

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
- `lib/helper/text.helper` → `stripHtml(value)` (strip tags/entities, collapse whitespace — for
  length checks/counters on rich-text output). For truncation in the DOM use CSS
  (`text-ellipsis overflow-hidden` / `line-clamp`), not JS.
- `lib/feature-flags` → `isShowcaseEnabled` (also re-exported from `lib/utils`).

## `lib/helper/local-storage.helper`

localStorage que nunca lança: sem `window` (SSR), storage bloqueado (aba anônima, cookies
desligados), quota cheia ou JSON corrompido viram `null` na leitura e `false` na escrita. Valores
são gravados como JSON. Use para conveniência do visitante (preferência, card dispensado), nunca
para dado que precisa persistir ou ser compartilhado.

| Função          | Assinatura                                              | Retorno                                        |
| --------------- | ------------------------------------------------------- | ---------------------------------------------- |
| `readStorage`   | `readStorage<T>(key: string)`                           | valor parseado ou `null`                       |
| `writeStorage`  | `writeStorage(key: string, value: unknown)`             | `true` se gravou                               |
| `removeStorage` | `removeStorage(key: string)`                            | —                                              |
| `snooze`        | `snooze(key: string, days: number, now?: number)`       | grava `{ until }`; `true` se gravou            |
| `isSnoozed`     | `isSnoozed(key: string, now?: number)`                  | `true` enquanto o prazo não venceu             |

`isSnoozed` apaga a chave quando o prazo vence. Exemplo (card que some por 15 dias ao fechar):

```tsx
const [hidden, setHidden] = useState(true);
useEffect(() => setHidden(isSnoozed('meu-card')), []);

function fechar() {
  snooze('meu-card', 15);
  setHidden(true);
}
```

{% hint style="warning" %}
Leia o storage num `useEffect`, não no render. No servidor ele não existe, e ler durante o render
gera HTML diferente do cliente (erro de hidratação). Por isso o exemplo começa com `hidden = true`.
{% endhint %}

A consuming project keeps its own country/document-specific helpers (CPF/CNPJ validators, a
query-builder, locale date formatters) in its own `src/lib/` — those are not core.
