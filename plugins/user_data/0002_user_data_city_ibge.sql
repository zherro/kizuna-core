-- plugins/user_data/0002_user_data_city_ibge.sql
-- Follow-up migration for the `user_data` plugin (0001 created the profile table with plain-text
-- `state` / `city`). Adds `city_ibge` — the IBGE municipality code (7 digits, e.g. '3550308' for
-- São Paulo) alongside the free-text `city` name.
--
-- Why a separate code column instead of matching on the name: `city` is a display string filled
-- from an IBGE-backed picker that historically discarded the id. Consumers that need an EXACT
-- city match (e.g. foco-total's marketplace search filtering providers by city) can't safely
-- join a name string — accents, casing and duplicate names across states make it unreliable.
-- The code is stable and unambiguous. `city` stays as-is for display and existing consumers.
--
-- `text`, nullable, no FK: same convention as `holidays.city_ibge` — the core table doesn't force
-- installing the `location` plugin (which owns `location_city`). A project that wants referential
-- integrity or a backfill from existing names does it in its own migrations / extras.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS.

ALTER TABLE public.user_data
  ADD COLUMN IF NOT EXISTS city_ibge text;

-- Filtering providers by city means WHERE city_ibge = $1 — index it. Partial (skip the NULLs,
-- which are the majority until rows are re-saved / backfilled).
CREATE INDEX IF NOT EXISTS user_data_city_ibge_idx
  ON public.user_data (city_ibge)
  WHERE city_ibge IS NOT NULL;
