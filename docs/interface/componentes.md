# Components & Hooks — Map

Where things live, one line each. Not the API reference — read the component/hook itself (+ JSDoc
where present) for exact props/signatures.

## `client/components/ui/*` — shadcn kit

Standard shadcn-style primitives: `Button`, `Card` (+ `CardHeader/Title/Description/Content/
Footer`), `Input`, `Label`, `Badge`, `Switch`, `Table`, `Textarea`, `Typography`, `Progress`,
`Grid`, `Select`, `Checkbox`, `Tabs`, `Sheet`, `Slider`, `Separator`, `Divider`,
`DropdownMenu`, `SearchableSelect`, `MarkdownEditor`, `QuillEditor`. Unstyled-opinion baseline —
these have no domain meaning, just visual primitives.

## `client/components/ui-better-soft/*` — richer, domain-flavored kit

Grouped by folder:

- `buttons/` — `BsButton` (fixed styling, optional icon).
- `forms/` — `FormField` (Formik-bound input/textarea/switch), `NumberField` (stepper with
  suffix/hint).
- `headers/` — `PageHeader` (listing/management page header), `AdminPageReader` (admin page
  header with back link + actions).
- `lists/` — card/list shells: `FilterStatCard`, `EntityListCard`, `MediaResultCard`,
  `IconChoiceGrid`, `ChipToggleList`, `EmptyStateCard`, `EntityGridList` (card/list toggle with
  localStorage persistence).
- `overlay/` — `ModalPanel` (slide-in side panel), `ConfirmDialog`.
- `avatars/`, `cards/`, `google-form/` — smaller, single-purpose pieces.
- Loose in the folder root: `ExperiencePill`, `FixedBottomProgress`, `MosaicGrid`, `ToggleRow`,
  `ChannelChip`, `ScheduleRow`, `Section`, `ChoiceCard`, `SectionIllustration`, `InlineAlert`,
  `RpcTester` (PostgREST RPC debug tool), `PwaRegister` (no-UI, registers the service worker),
  `LocationTrigger`/`LocationModal` (state → city picker; Brasil inteiro via IBGE ou só as cidades
  do banco — ver [Plugin location](../plugins/location.md)).

## `client/components/screen-engine/*` — screen engine

JSON-driven screen composition. `RenderScreen` (Server Component, resolves a `ScreenConfig`'s
blocks against `registry.ts`'s `SCREEN_COMPONENT_REGISTRY`), `createScreenPage` (admin-only page
wrapper), `ResourceScreen` (generic CRUD form+list block driven by a `ResourceScreenConfig`),
`ListBlock`, `PageHeaderBlock`, `DynamicField`, `DynamicStepForm` (step-level counterpart for
wizards). `screens/*` and `resources/*` hold per-screen/per-resource configs — project-specific,
a consuming project ships its own.

## `client/components/root-screens/*` — ROOT-only admin screens registry

Same registry+resolver shape as the screen engine, adapted for screens that already do their own
server-side fetch: `registry.ts` (`ROOT_SCREEN_REGISTRY`, slug → `{ title, group: 'root' |
'security', component }`), `resolver.tsx` (`resolveRootScreen(group, slug, options)` — the single
`is_root` gate, registry lookup, `notFound()` on an unknown slug). A registry entry with
`component: null` is a "slot": the screen is business config the core can't own (e.g.
`configuracoes`), and the consuming project supplies its own component via `resolveRootScreen`'s
`slotComponents` option instead. Ships `PluginsScreen` (`auth.plugin_registry`) and
`RootAccessLogScreen` (`auth.root_access_log`) as ready screens. Consumed by two thin catch-all
routes in the host project — `/painel/root/[slug]` and `/painel/security/[slug]` — see
foco-total's `src/app/painel/root/[slug]/page.tsx`.

## `client/components/showcase/*` — visual catalog

`ShowcaseShell` (nav shell + icon map), `ShowcaseSectionPage` (renders one section's live demo +
copyable usage code), `showcase-sections.ts` (`SHOWCASE_SECTIONS` registry: id, group, label,
description, usage snippet). Runs at `/showcase` in the consuming project — it's the live
reference for every `ui`/`ui-better-soft` component, not just documentation.

## `client/hooks/*`

- `useTable` — paginated, searchable list state against a `/api/resources/[resource]` endpoint.
- `useForm` — Formik wrapper wired to the resource create/update flow.
- `useDelete` — delete-with-confirmation state for a resource row.
- `useResourceOptions` — one resource → combobox options; self-fetching, re-fetches when its
  `filter` changes.
- `useResourceMap` — N independent resources fetched in parallel into one `data` object; each
  entry resolves and writes its own slice as soon as it responds, no `Promise.all` gating.
- `useToggleActive` — toggles a resource row's active/soft-delete field.
- `useTenantResource` — resource CRUD scoped to the current tenant.
- `useOnboardingSteps` / `useOnboardingProgress` — read the `onboarding` plugin's steps/progress.
- `useUserLocation` — reads the browser's geolocation, if granted.
- `useToast` — toast notifications.

Both `useResourceOptions` and `useResourceMap` fetch through the same `fetchResourceList` helper
(`client/hooks/shared/fetch-resource.ts`).

`useTenantResource` (listed above; import by its path — the `hooks/index.ts` barrel currently
re-exports only `useTable`/`useForm`/`useDelete`/`useResourceOptions`/`useResourceMap`/
`useToggleActive`) is the hook for rows scoped to the current tenant via RLS where no id is known
upfront. Field names stay identical to the DB columns (snake_case — it does
not camelCase). Three shapes: one row per tenant (`save([item])`), several fixed rows per tenant
(`save(items)` — upserts one by one, no bulk `on_conflict`), variable-length tenant-owned list
(`saveOne(item)` / `remove(id)` touch a single row instead of re-saving the array).

## `useTable` — count derivation

`total`/`totalPages` are not taken as-is from the server. When a page returns fewer rows than
`pageSize` it is provably the last page, so `total` is derived from
`(page - 1) * pageSize + items.length`. A full page trusts the server value but floors it at
`items.length`. Reason: PostgREST's exact count (`Content-Range` via `Prefer: count=exact`) has
come back 0/unreliable for some query shapes even with rows present — "0 registros" while rows
are visibly listed is the symptom this fixes.

## Providers — `client/providers/`

**`AuthProvider`** / `useAuth()` → `{ user, loading, setUser, logout }`. `user: AuthUser | null` (name,
subtitle, initials, `hasPerm(resource, action = 'view')`). Hydrated from the server via
`initialUser` in the root layout — no loading flash. When a layout passes `initialUser={null}`
(public, static pages) the session is fetched from `GET /api/auth/me` after mount and `loading`
stays `true` until it answers (or until a manual `setUser`): a client-side gate must wait for
`!loading` before treating `user === null` as anonymous (see `SwipeLikedPage`). Call `setUser(data.user)` after
login/register; `logout()` clears the cookie + navigates to `/login`. Client components read auth
from context **only** — never a `session`/`user` prop.

**`AppPreferencesProvider`** / `useAppPreferences()` → `{ language, setLanguage, resolvedTheme,
setTheme, messages }`. Language (`pt-BR`/`en-US`/`es-ES`), theme color (OKLCH options), dark mode.
Persisted in `localStorage`. Backed by the `account_preferences` plugin when a project wires it.

## Gate de login — `AuthModal` / `useRequireAuth`

`client/components/auth/` — modal de login/registro reaproveitável para telas públicas que só
pedem conta na hora de uma ação específica (curtir, favoritar, comprar), em vez de uma rota
`/login` dedicada.

- **`AuthModal`** (`auth-modal.tsx`) — `{ open, initialMode, onClose, onSuccess, onAuthenticated? }`.
  Alterna `LoginForm`/`RegisterForm` por um link interno. Fecha por X, `Esc`, clique no overlay ou
  pelo botão físico de voltar do celular: ao abrir, empilha uma entrada de `history` e ouve
  `popstate`/`keydown`, então o gesto de voltar do Android fecha o modal em vez de sair da página.
  Só X/`Esc`/overlay/sucesso tiram essa entrada (`history.back()`, e só se ela está no topo);
  voltar do celular fecha sem `back()`, e desmontar por navegação (links "Esqueci minha senha",
  "termos de uso") não mexe no histórico. No sucesso, `onSuccess` roda **depois** do `popstate`
  da entrada do modal — uma ação que navega (`router.push`) não é desfeita pelo restore que o
  Next faz nesse `popstate`. `onAuthenticated` roda no mesmo tick do login, antes disso.
- **`RequireAuthProvider`** / **`useRequireAuth()`** (`require-auth.tsx`) — contexto que expõe
  `requireAuth(action, pendingKey?)`: já logado, chama `action()` na hora; anônimo, guarda a ação,
  abre o `AuthModal` e — se `pendingKey` foi passado — grava a chave em `sessionStorage`
  (`kizuna.auth.pending`) para sobreviver a um reload no meio do fluxo (ex.: o `AuthModal` navega
  para uma rota de OAuth e volta). A chave sai no login (`onAuthenticated`); a ação pendente roda
  uma vez no `onSuccess` do modal;
  `consumePendingAuthAction()` lê e limpa essa chave para quem precisa reaplicar a ação após um
  reload (ver `SwipePage` em `client/components/swipe/swipe-page.tsx`, que usa `pendingKey`
  `` `like:${uid}` `` para re-curtir o card certo depois do login).

```tsx
<RequireAuthProvider>
  <button onClick={() => requireAuth(() => like(item), `like:${item.uid}`)}>Curtir</button>
</RequireAuthProvider>
```

`requireAuth` vem de `useRequireAuth()`, chamado dentro do provider. Sem `<RequireAuthProvider>`
no topo da árvore, `useRequireAuth()` lança.

## Typography & Grid

`Typography` — use instead of raw `<h1>`/`<p>`; applies a responsive scale + color tokens.
Props: `size` (responsive per breakpoint), `color` (`default`/`muted`/`primary`/`secondary`/
`destructive`), `weight`, `align`, `lineClamp` (1–6), `bold`, `italic`. Tags `H1`…`H6`, `P`,
`Span`.

`Grid` — 12-col CSS grid. Container mode: `container`, `containerSize`
(`compact`/`default`/`wide`/`ultraWide`/`fluid`), `padding` or `px`/`py`, `gap`. Item mode: col
span 1–12 per breakpoint (`xs`/`sm`/`md`/`lg`/`xl`).

## Form patterns

All forms: Formik + Yup via `useForm`, fields through `FormField`
(`ui-better-soft/forms/form-field.tsx`, `as`: `input` (default) / `textarea` / `switch`) — not
the deprecated `wrappers/wrapper-field` etc.

- **Standard** (admin CRUD, `selectedId` known, no other resource hook on the page) — `useForm`'s
  built-in `resourceSubmit: { resource, selectedId, toPayload }`.
- **Page already has a resource hook** (`useTenantResource`, a wizard's `persist`) — use
  `onSubmit` instead, so the save still goes through that one hook (avoids two things POSTing to
  `/api/resources` on the same page).
- Form inside a `ModalPanel` with the submit button in the modal footer (outside the `<form>`) →
  call `formik.submitForm()` imperatively.

## Theming

Colors are OKLCH CSS variables, theme color toggled via `data-theme-color` on `<html>`, dark mode
via a class on `<html>`. Base `ui/` primitives accept `className`; `ui-better-soft/` components
with a locked-down look deliberately don't. New components → register in `/showcase` (see the
`criar-componente-core` skill).

### Shape style — `data-ui-style` (`classic` | `soft`)

Radius, border width and shadow of the `ui/` primitives come from `--ui-*` CSS variables, switched
by `data-ui-style` on `<html>`. It is a separate axis from the color theme: any color theme works
with either style.

- **Source:** the `NEXT_PUBLIC_UI_STYLE` env var (`classic`, the default, or `soft`; anything else
  is `classic`). It is inlined at build time, so it is **fixed per deploy**: no runtime toggle, no
  per-user choice. `resolveUiStyle()` / `ACTIVE_UI_STYLE` live in
  `src/client/lib/ui-theme.ts`.
- **Where it is applied:** the consuming project's root layout must render
  `<html data-ui-style={ACTIVE_UI_STYLE}>`. Being set on the server, there is no flash (unlike
  `data-theme-color`, which the client provider can change). See
  [Adopting in an existing project](#adopting-in-an-existing-project).
- **Where the values live:** the consuming project's `globals.css`, section "FORMA (data-ui-style)":
  the `:root` block is `classic`, the `soft` block (selector on `data-ui-style`) overrides it.
  The consumer's own `globals.css` must contain them: `kizuna-starter` ships both blocks, the core
  template does not yet. Without the blocks the components fall back to `classic` through the `var()` fallback.

| Token | `classic` | `soft` | Used for |
| ----- | --------- | ------ | -------- |
| `--ui-radius-pill` | `0.375rem` | `9999px` | `Button`, `Badge`, button-like controls |
| `--ui-radius-control` | `0.5rem` | `9999px` | chips, tags, toggles, `ColorChip` |
| `--ui-radius-card-sm` | `0.5rem` | `1rem` | small cards / items with border or surface fill |
| `--ui-radius-card-compact` | `0.75rem` | `1rem` | `Card`, list items, compact cards |
| `--ui-radius-card` | `1rem` | `1.75rem` | cards with header, sections (`Section`) |
| `--ui-radius-card-lg` | `1.5rem` | `2rem` | large wrappers |
| `--ui-radius-sheet-top` | `1rem` | `1.75rem` | `Sheet`, bottom sheet of `ModalPanel` |
| `--ui-radius-field` | `0.375rem` | `1rem` | `Input`, `Textarea`, `CurrencyInput`, `QuillEditor`, select triggers |
| `--ui-radius-popover` | `0.375rem` | `1rem` | `DropdownMenu`, `Tooltip`, popover panels |
| `--ui-radius-select` | `0.5rem` | `1rem` | `Select`, `rounded-lg` fields and floating panels |
| `--ui-border-w-card` | `1px` | `0px` | border of surfaces (card, item, panel) |
| `--ui-border-w-chip` | `1px` | `1px` | chips |
| `--ui-shadow-card` | `shadow-sm` value | `var(--shadow-soft-2)` | card with header, `Select` trigger |
| `--ui-shadow-card-compact` | `shadow-sm` value | `var(--shadow-soft-1)` | compact card / item that had `shadow-sm` |
| `--ui-shadow-card-flat` | `shadow-sm` value | `var(--shadow-soft-3)` | large wrapper |
| `--ui-shadow-item` | `0 0 #0000` (none) | `var(--shadow-soft-1)` | bordered item that had no shadow (soft drops the border, the shadow separates it) |
| `--ui-shadow-fab` | `shadow-md` value | `shadow-lg` value | `Fab` |
| `--ui-shadow-sheet` | `shadow-lg` value | same as `classic` | `Sheet`, `ModalPanel` |
| `--ui-fab-size` | `3rem` | `3.5rem` | `Fab` |
| `--ui-card-bg` | not defined (fallback `var(--background)`) | `var(--card)` | card background that used `bg-background` |
| `--ui-progress-h` | `0.5rem` | `0.375rem` | `Progress` |
| `--ui-progress-track` | not defined (component fallback) | `var(--muted)` | `Progress` |
| `--ui-font-display-active` | Quicksand stack | Baloo 2 stack | `--font-display` (`Typography font="display"`) |

`--shadow-soft-1/2/3` are defined only in the soft block. The title scale of `PageHeading` /
`PageHeader` is not a CSS token: each component keeps a local map keyed by `ACTIVE_UI_STYLE`.

Soft is the "app" look: pill buttons and badges, larger radii, cards without border or shadow (the
separation comes from `bg-card` over `bg-background`).

**Display font.** `--font-display` (Tailwind's `font-display`) points at `--ui-font-display-active`,
so the style and the `theme.displayFont` key of `kizuna.config.json` change the title font without
rebuilding CSS. For this to work, the consumer's root layout must set `data-display-font` from that
key when it is one of `DISPLAY_FONTS` (`src/shared/display-fonts.ts`); the per-font
`data-display-font` blocks in `globals.css` come after the style blocks and win. Each font needs a
`next/font` variable in the layout (`--font-quicksand`, `--font-baloo`, `--font-bricolage`). See
[Configuração](../comecando/configuracao.md#theme).

#### Adopting in an existing project

The core template (`template/src/app/layout.tsx` and `template/src/app/globals.css`) does not include
the style support yet; `kizuna-starter` does, and is the reference implementation (see its
`src/app/layout.tsx` and `src/app/globals.css`, section "FORMA (data-ui-style)"). To adopt it:

1. **Layout, style attribute.** In the root layout add `data-ui-style={ACTIVE_UI_STYLE}` to the
   `<html>` tag, importing `ACTIVE_UI_STYLE` from `@kizuna/core/client/lib/ui-theme`.
2. **Token block.** Copy the "FORMA" token block (the `:root` block and the
   `:root[data-ui-style='soft']` block) into the project's `globals.css`. Without it the components
   stay `classic` through the `var()` fallback.
3. **Configurable heading font (optional).**
   - Load each font with `next/font` and put the `.variable` classes on `<html>`, **not** on
     `<body>`: `--ui-font-display-active` is resolved on `<html>`, so a variable defined on `<body>`
     is not visible there.
   - Copy the `:root[data-display-font='quicksand']`, `baloo` and `bricolage` blocks into
     `globals.css`, after the style blocks.
   - In `@theme inline`, set `--font-display: var(--ui-font-display-active);`.
   - In the layout, read `theme.displayFont` from `kizuna.config.json`, validate it with
     `isDisplayFont` (from `@kizuna/core/shared/display-fonts`) and pass the result as
     `data-display-font` on `<html>`.

#### Writing a component that follows the style

The token is read with the **classic value as the `var()` fallback**, so a consumer whose
`globals.css` has no token block stays classic:

```tsx
'rounded-[var(--ui-radius-pill,0.375rem)] border-[length:var(--ui-border-w-card,1px)]'
```

Rules:

- **Shadow → labelled form**, `shadow-[shadow:var(--ui-shadow-card,0_1px_3px_0_#0000001a,_0_1px_2px_-1px_#0000001a)]`.
  Without the `shadow:` label, `tailwind-merge` (inside `cn()`) does not recognise the class as a
  shadow, so a caller's `className="shadow-none"` would not override it.
- **"No shadow" is `0 0 #0000`, never `none`.** Tailwind composes `--tw-shadow` in one
  comma-separated `box-shadow` list together with the ring; a `none` inside a list invalidates the
  whole declaration.
- **Border width → `border-[length:var(--ui-border-w-card,1px)]`.** The `length:` label tells
  Tailwind it is a width, not a color.
- **Don't define, in `:root`, a token that references a variable a wrapper may override locally**
  (for example `--primary`). Custom properties resolve where they are declared: on `<html>` the
  token would ignore a `--primary` overridden in a wrapper. That is why `--ui-progress-track` has no
  classic value in `:root`: the classic track is a mix of `--primary` and comes from the component's
  own fallback, which resolves it on the element. A token that references a variable set only on
  `<html>` is fine: the soft `--ui-progress-track: var(--muted)` works because nothing below
  `<html>` overrides `--muted`.
- **Shadow color modifiers from callers no longer apply.** Card, Sheet and the Select trigger take
  their shadow through `var()`, so a caller class that only changes the shadow color (a
  `shadow-primary/20`-style class) no longer tints them; override the whole shadow instead
  (`shadow-none`, or a full shadow utility).
- Give a new token a classic value in `:root`, a soft value in the `soft` block, and
  the same classic value as the fallback in the component.

**Which token for which class.** Pick by the element's role; the classic value of the old class
must equal the token's `:root` value:

| Element | Old class | Token |
| ------- | --------- | ----- |
| Card with header / section | `rounded-2xl` | `--ui-radius-card` |
| List item / compact card, `rounded-xl` field | `rounded-xl` | `--ui-radius-card-compact` |
| Large wrapper | `rounded-3xl` | `--ui-radius-card-lg` |
| Small card / item with border or surface fill | `rounded-lg` | `--ui-radius-card-sm` |
| Button-like control | `rounded-md` | `--ui-radius-pill` |
| Chip / tag / toggle | `rounded-lg` | `--ui-radius-control` |
| Text field / select trigger | `rounded-md` / `rounded-lg` | `--ui-radius-field` / `--ui-radius-select` |
| Floating panel (popover, menu) | `rounded-md` / `rounded-lg` | `--ui-radius-popover` / `--ui-radius-select` |
| Surface border | `border` | `--ui-border-w-card` (keep the color class) |
| Shadow of card / compact card / wrapper | `shadow-sm` | `--ui-shadow-card` / `-card-compact` / `-card-flat` |
| Bordered item with no base shadow | (none) | add `--ui-shadow-item` |
| Card background | `bg-background` | `--ui-card-bg` (fallback `var(--background)`) |

Left as is on purpose: `rounded-full`/`-sm`/`-none`, images, avatars, skeletons, icon tiles,
coloured callouts/alerts, chat bubbles, dividers, tables, state variants (`hover:`, `focus:`,
`dark:`), project CSS classes (`home-ink`, `wz-*`) and radii outside the table.
