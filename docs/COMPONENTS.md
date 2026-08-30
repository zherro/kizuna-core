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
