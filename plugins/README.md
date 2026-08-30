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

## Convention: registering with RBAC

Every plugin's `0001_*.sql`, at the end, must:

1. Insert its own row into `auth.plugin_registry` (`name`, `version`), `ON CONFLICT (name) DO
UPDATE SET version = EXCLUDED.version` so re-applying an upgraded file records the new version.
2. If the plugin has anything an admin should be able to manage (not everything does — a
   strictly self-service table like `account_preferences` or a backend-only insert table like
   `notifications` may have nothing to gate), insert the relevant resource/action rows into
   `auth.permissions` and grant them to the global `ADMIN` role (`role_id = 2`) via
   `auth.role_grants`. Gate the corresponding writes behind
   `auth.fun_auth_has_perm(resource, action)` in the table's RLS policies.

Both steps must be idempotent (`ON CONFLICT DO NOTHING`/`DO UPDATE`) — a plugin file gets re-run
whenever the fresh-install chain is re-applied. See `onboarding/0001_onboarding.sql` for a plugin
that registers a real permission (`onboarding_steps.manage`), and `notifications/0001_notifications.sql`
for one that registers with none.
