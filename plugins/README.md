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
