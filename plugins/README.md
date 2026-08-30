# Plugins

Optional, independent of each other and of `sql/` beyond the core auth schema. Apply only the
ones a project needs — each folder is one self-contained, idempotent `.sql` file.

- `user_data/` — per-user profile (name, avatar, contact, document, birth date). No KYC fields
  are required (nullable) — enforce that per-project if needed.
- `onboarding/` — generic checklist mechanism (`onboarding_steps` + `onboarding_progress`). No
  steps are seeded; insert your own.
- `account_preferences/` — one jsonb settings bag per (user, tenant): theme, locale, notification
  opt-ins, whatever a project needs, without a schema change per setting.
- `notifications/` — in-app notification feed. Rows are inserted by trusted backend code only,
  never by the recipient (no INSERT grant to `auth_user`).
- `agenda/` — a user's own calendar events (`agenda_events`) plus one view-preferences row per
  (user, tenant) (`agenda_settings`). Both strictly self-service, same shape as
  `account_preferences`.
- `taxonomy/` — generic hierarchical taxonomy mechanism, group -> category -> subcategory -> tag
  (`categories_group`, `categories_sub_tags`, plus columns added onto the consuming project's own
  `categories`/`categories_sub`). Read-open, write-gated behind one `categorias`/`manage`
  permission. No content is seeded — a project inserts its own category names.
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
- `system_config/` — generic key/value config bag (`auth.system_config`: `key` text PK, `value`
  jsonb). Mechanism only — which keys exist and the shape of their jsonb value is a consuming
  project's business decision, not this plugin's. Read-open to any session (a config flag isn't
  sensitive, and the app needs to read it to render a form correctly even before login), writes
  gated by `system_config.manage`. No keys are seeded — a project inserts its own (e.g.
  foco-total's `db/extras/system_config_seed.sql` seeding `user_data.document_field`/
  `user_data.birth_date_field` for the `user_data` plugin's onboarding form).

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
