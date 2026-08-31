# Plugins

A plugin is one self-contained, idempotent `.sql` file under `plugins/<name>/0001_*.sql` — a
table (or a couple of related tables) that's optional and independent of every other plugin,
layered on top of the core auth schema (`sql/`). A project applies only the ones it needs.

## What exists today

| Plugin                | Table(s)                                                                                                                     | Purpose                                                                                                                                                                                                                                                                                                                                                  | Permission registered                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `user_data`           | per-user profile                                                                                                             | name, avatar, contact, document, birth date. No KYC field is required (nullable) — enforce per-project if needed. Also installs `fn_get_provider_profile(uuid \| text)`, a `SECURITY DEFINER` function exposing a public-safe subset of a user's row (no document/phone/email) for a public profile page — RLS on this table alone gives anon no way to read it. `avatar_url` is just a URL string (no FK) — install `storage` too if avatar upload needs to actually work. | none (self-service)                                    |
| `storage`             | `files`                                                                                                                      | generic file storage, content inline as `bytea`. Owner-only writes; SELECT is open to `anon` too (active rows only) since a file's public URL (an avatar, an ad's cover photo) must be viewable by a logged-out visitor.                                                                                                                                | none (self-service)                                    |
| `onboarding`          | `onboarding_steps`, `onboarding_progress`                                                                                    | generic checklist mechanism. No steps are seeded; a project inserts its own.                                                                                                                                                                                                                                                                             | `onboarding_steps.manage`                              |
| `account_preferences` | one jsonb settings row per (user, tenant)                                                                                    | theme, locale, notification opt-ins — anything a project needs without a schema change per setting.                                                                                                                                                                                                                                                      | none (self-service)                                    |
| `notifications`       | in-app notification feed                                                                                                     | rows are inserted by trusted backend code only, never by the recipient — no INSERT grant to `auth_user`.                                                                                                                                                                                                                                                 | none                                                   |
| `agenda`              | `agenda_events`, `agenda_settings`                                                                                           | a user's own calendar events plus one view-preferences row per (user, tenant). Strictly self-service, same shape as `account_preferences`.                                                                                                                                                                                                               | none                                                   |
| `holidays`            | `holidays`, `holidays_tenant`, `holidays_tenant_custom_days_off`                                                             | shared holiday catalog (national/state/city) readable by any session, plus a tenant's on/off toggle against it and its own custom days off. Combo shape, like `agenda`.                                                                                                                                                                                  | `holidays.manage`                                      |
| `taxonomy`            | `categories_group`, `categories_sub_tags`, plus columns added onto the consuming project's own `categories`/`categories_sub` | generic hierarchical taxonomy mechanism: group -> category -> subcategory -> tag. Read-open, write-gated. No content is seeded — a project inserts its own category names.                                                                                                                                                                               | `categorias.manage` (also registers `categorias.view`) |
| `location`            | `location_country`, `location_region`, `location_state`, `location_city`                                                     | generic geographic reference hierarchy: country -> region -> state -> city. Read-open, no write grant to `auth_user` at all (pure reference data). No data is seeded — a project inserts its own (e.g. foco-total's `db/extras/location_seed_brazil.sql`).                                                                                               | none                                                   |
| `system_config`       | `auth.system_config` (one row per `key`, `value` jsonb)                                                                      | generic key/value config bag any plugin or consuming project can read/write against. Mechanism only — which keys exist and their jsonb shape is a project's business decision. Read-open to any session, writes gated by `system_config.manage`. No keys are seeded — a project inserts its own (e.g. foco-total's `db/extras/system_config_seed.sql`).  | `system_config.manage`                                 |

## Registering with RBAC (convention)

Every plugin's `0001_*.sql`, at the end, must:

1. Insert its own row into `auth.plugin_registry` (`name`, `version`), with
   `ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version` so re-applying an upgraded file
   records the new version. Must be idempotent — the file gets re-run whenever the fresh-install
   chain is re-applied.
2. If the plugin has anything an admin should be able to manage (not everything does — a strictly
   self-service table like `account_preferences`, or a backend-only insert table like
   `notifications`, may have nothing to gate), insert the relevant resource/action rows into
   `auth.permissions` — catalog only, **no automatic grant**. Gate the corresponding writes behind
   `auth.fun_auth_has_perm(resource, action)` in the table's RLS policies. Handing the permission
   to a specific role is a decision for whoever installs/administers the consuming project — a
   plugin file must never insert into `auth.role_grants`.

See `onboarding/0001_onboarding.sql` for a plugin that registers a real permission, and
`notifications/0001_notifications.sql` for one that registers with none. Full convention text and
per-plugin reasoning: `plugins/README.md`.

## Activating plugins in a consuming project

1. List the wanted plugin names in the consuming project's `kizuna.plugins.json`:

   ```json
   { "plugins": ["user_data", "onboarding", "agenda"] }
   ```

2. Run the installer against a database:

   ```bash
   ./kizuna-core/scripts/install.sh --db-url "$DATABASE_URL" --plugins-file kizuna.plugins.json
   # or, without the file:
   ./kizuna-core/scripts/install.sh --db-url "$DATABASE_URL" --plugins user_data,onboarding,agenda
   ```

The script applies `sql/*.sql` in order first (core auth schema), then each requested plugin's
`0001_*.sql`. It knows nothing about any specific consuming project — only a plugin name list — so
it never needs changes when a new project adopts the core.
