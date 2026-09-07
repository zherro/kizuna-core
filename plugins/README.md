# Plugins

Optional, independent of each other and of `sql/` beyond the core auth schema. Apply only the
ones a project needs — each folder is `0001_*.sql` (schema/RLS/RBAC) plus optional numbered
follow-ups (`0002_*.sql`, …) for data seeds or later migrations; the installer applies every
`NNNN_*.sql` in a requested plugin's folder in filename order. All idempotent.

- `user_data/` — per-user profile (name, avatar, contact, document, birth date). No KYC fields
  are required (nullable) — enforce that per-project if needed. `avatar_url` just holds a URL
  string (no FK) — actually being able to upload/serve that file needs the `storage` plugin
  installed too (soft, functional dependency, not a schema one — see `storage/0001_storage.sql`).
- `storage/` — generic file storage (`files`: `bytea` content inline, no external object storage
  wiring). Owner-only writes; SELECT is open to `anon` too (active rows only) since a file's
  public URL (an avatar, an ad's cover photo) must be viewable by a visitor who isn't logged in.
  Self-service only, no admin-manage permission registered.
- `onboarding/` — generic checklist mechanism (`onboarding_steps` + `onboarding_progress`). No
  steps are seeded; insert your own.
- `account_preferences/` — one jsonb settings bag per (user, tenant): theme, locale, notification
  opt-ins, whatever a project needs, without a schema change per setting.
- `notifications/` — in-app notification feed. Rows are inserted by trusted backend code only,
  never by the recipient (no INSERT grant to `auth_user`).
- `agenda/` — a user's own calendar events (`agenda_events`) plus one view-preferences row per
  (user, tenant) (`agenda_settings`). Both strictly self-service, same shape as
  `account_preferences`. `0002_agenda_config.sql` (v1.1.0) adds the tenant's _schedule
  configuration_: `agenda_schedule` (N named weekly schedules per tenant, `active` toggle +
  `deleted` soft delete), `agenda_schedule_hours` (one row per weekday `0..6` + `9`=lunch
  sentinel, per schedule), and two per-tenant singletons — `agenda_booking_preferences`
  (booking window, who-picks, buffer, radius…) and `agenda_notification_preferences`
  (what/when/how the tenant is notified). All tenant-scoped, self-service, no permission
  registered. Resource configs ship from `screen-engine/resources/agenda-config`
  (`resourceAgendaConfig`); the whole tenant UI ships from
  `client/components/agenda-config` (`AgendaConfigPage`).
- `taxonomy/` — generic hierarchical taxonomy mechanism, group -> category -> subcategory -> tag
  (`categories_group`, `categories_sub_tags`, plus columns added onto the consuming project's own
  `categories`/`categories_sub`: `category_group_id`, `icon`, `description`, `form_key`,
  `request_form_key`, `tenant_id`, `created_by`). Read-open, write-gated behind one
  `categorias`/`manage` permission.
  No content is seeded — a project inserts its own category names. `form_key` is an optional,
  FK-less bridge to the `forms` plugin for the form the entity's provider fills; `request_form_key`
  is the symmetric sibling for the form the buyer fills when requesting a quote / closing an order.
  The generic
  `postgrestResources` configs for these tables ship from kizuna-core
  (`src/client/components/screen-engine/resources/taxonomy.ts`, `resourceTaxonomy`) so a consuming
  project only imports + spreads them.
  `0002_taxonomy_stats_view.sql` (v1.3.0) adds `vw_category_subcategory_stats` — one row per active
  subcategory with its parent category + `qtd` (subcategory count per category, window). Pure
  taxonomy, no listing/service count (that is consumer-specific).
- `holidays/` — a shared holiday catalog (`holidays`, national/state/city, readable by any
  session, writes gated by `holidays.manage`) plus two tenant self-service tables built on top of
  it: `holidays_tenant` (on/off toggle per catalog entry) and `holidays_tenant_custom_days_off` (a
  tenant's own days off, unrelated to the catalog). Same "admin-managed catalog + self-service
  tenant slice" combo shape as `agenda`.
- `location/` — generic geographic reference hierarchy, country -> region -> state -> city
  (`location_country`, `location_region`, `location_state`, `location_city`). Read-open to any
  session, no write grant to `auth_user` at all (pure reference data, seeded once outside the
  API — no `auth.permissions` gate either). No data is seeded — a consuming project inserts its
  own countries/regions/states/cities (e.g. foco-total's `db/extras/location_seed_brazil.sql`).
- `forms/` — generic reusable forms (`forms`: a `FormSchema` jsonb keyed by `form_key`, version
  bumped by a `BEFORE UPDATE` trigger when the schema changes) plus captured answers
  (`form_results`: **singleton** — one current row per `(tenant_id, domain, reference_id)`, jsonb
  `answers` + a frozen `schema_snapshot`). Answers are written only via
  `fn_form_result_upsert(form_key, domain, reference_id, answers)` (invoker rights, `ON CONFLICT`
  upsert). Read-open (active forms; own results or `forms.manage`), writes gated by `forms.manage`.
  Schemas are authored with the `form-builder` component engine (`src/client/components/form-builder`).
- `pages/` — database-backed institutional / legal pages (`pages`: Markdown `content`, `slug`
  unique per tenant, `draft`/`published`). Server-rendered via `PageView` (first plugin shipping a
  server component). Anon SELECT sees only `published + active`; `auth_user` also sees drafts.
  Writes gated by `pages.manage`. Ships `0002_pages_seed.sql` — project-neutral default pages
  (`sobre`, `quem-somos`, `termos-de-uso`, published) seeded under the first root user's tenant,
  a silent no-op on a DB with no root user yet. A project can layer its own content on top.
- `reviews/` — generic ratings/reviews infrastructure, scoped by `domain` + `reference_id` (no
  FK to the reviewed entity — same decoupling as `forms`). Tables: `reviews` (rating 1–5 +
  comment + status `pending`/`published`/`hidden`/`rejected` + soft delete), `review_tags`
  (admin-managed tag catalog, `slug`/`sort_order`/`selectable`/`active`), `review_tag_links`
  (review↔tag with `tag_label_snapshot` so history survives a tag being deactivated),
  `review_moderation_requests` (the reviewed entity's owner asks for re-moderation — one open per
  review), `review_moderation_events` (append-only audit, backend-write only like
  `notifications`), `review_stats` (trigger-maintained aggregate: `total_reviews`,
  `average_rating`, `dist` — O(1) summary reads, only `published`+`active` count). Writes go
  through RPCs: `fn_review_create` / `fn_review_moderation_request` (SECURITY INVOKER — RLS scopes
  by identity; **cross-tenant**: `reviews.tenant_id` is the reviewed entity's tenant, set by the
  RPC, not a JWT default) and `fn_review_moderate` (SECURITY DEFINER — writes the audit table).
  Reads open to `anon` (published only). Permissions: `reviews.moderate`, `reviews.manage_tags`
  (catalog only). No content seeded — a project seeds its own tags (e.g. foco-total's
  `db/extras/reviews_tags_seed.sql`) and the `domain`s it supports (v1: `'service'`).
- `system_config/` — generic key/value config bag (`auth.system_config`: `key` text PK, `value`
  jsonb). Mechanism only — which keys exist and the shape of their jsonb value is a consuming
  project's business decision, not this plugin's. Read-open to any session (a config flag isn't
  sensitive, and the app needs to read it to render a form correctly even before login), writes
  gated by `system_config.manage`. No keys are seeded — a project inserts its own (e.g.
  foco-total's `db/extras/system_config_seed.sql` seeding `user_data.document_field`/
  `user_data.birth_date_field` for the `user_data` plugin's onboarding form).

- `messaging/` — multi-channel conversation infra (`conversation`, `conversation_participant`,
  `message`, `message_external_identity`). Access is **always by participation**
  (`conversation_participant.user_id`, checked via `auth.fun_msg_is_participant(bigint)`), never by
  tenant or phone — `conversation.tenant_id` exists but is informational only and never appears in
  a policy, so conversations are cross-tenant. Only the `platform` channel is exercised today; the
  `whatsapp`/`instagram`/`telegram`/`email` source enum values and `message_external_identity`
  table are defined but unused until an external-ingestion worker exists. Writes go through
  `SECURITY DEFINER` RPCs: `fn_msg_start_conversation` (idempotent per pair+context — reuses an
  open conversation), `fn_msg_send_message` (dedups by `metadata->>'client_token'`),
  `fn_msg_mark_read`, `fn_msg_list_conversations` (adds `unread_count` + the other participant,
  LEFT JOIN on `user_data`). The `auth_user` INSERT policy on `message` forces
  `sender_id = auth.fun_auth_user_id() AND direction = 'outbound' AND source = 'platform'`.
  Depends on the `user_data` plugin (install `user_data,messaging` together). Permission
  `messaging.manage` is catalog-only (moderator override in the SELECT policies) — never granted.

## Convention: registering with RBAC

Every plugin's `0001_*.sql`, at the end, must:

1. Insert its own row into `auth.plugin_registry` (`name`, `version`), `ON CONFLICT (name) DO
UPDATE SET version = EXCLUDED.version` so re-applying an upgraded file records the new version.
2. If the plugin has anything an admin should be able to manage (not everything does — a
   strictly self-service table like `account_preferences` or a backend-only insert table like
   `notifications` may have nothing to gate), insert the relevant resource/action rows into
   `auth.permissions` — catalog only, **no automatic grant**. Gate the corresponding writes
   behind `auth.fun_auth_has_perm(resource, action)` in the table's RLS policies; that function
   already bypasses the grant check entirely for a `is_root = true` user, so root can manage any
   plugin's data the moment the permission exists in the catalog, with no `auth.role_grants` row
   needed. Handing the permission to a specific role (tenant ADMIN, or a new role) is a decision
   for whoever installs/administers the consuming project, not something this library should
   default to — a plugin file must not insert into `auth.role_grants`.

Step 1 must be idempotent (`ON CONFLICT DO NOTHING`/`DO UPDATE`) — a plugin file gets re-run
whenever the fresh-install chain is re-applied. See `onboarding/0001_onboarding.sql` for a plugin
that registers a real permission (`onboarding_steps.manage`), and `notifications/0001_notifications.sql`
for one that registers with none.
