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
  `LocationTrigger`/`LocationModal` (state → city picker via IBGE API).

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
