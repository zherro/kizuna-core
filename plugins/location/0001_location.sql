-- plugins/location/0001_location.sql
-- Optional. Generic geographic reference hierarchy: country -> region -> state -> city. Pure
-- reference data (no tenant/user ownership columns) — read-open to any session, no write access
-- granted to auth_user at all (not even self-service): this catalog is meant to be seeded once
-- (by an admin, or a project's own seed script) and never edited through the API. Same
-- "no write grant" shape as public.notifications' INSERT (see plugins/README.md), but here even
-- UPDATE/DELETE are withheld — nothing about this data is user- or tenant-editable.
--
-- Design notes:
-- 1) Deliberately country-agnostic in the schema: no "br"/"brasil" anywhere in table or column
--    names. Brazil-specific data (regions, states, cities) is a separate seed that lives in the
--    consuming project (foco-total's db/extras/location_seed_brazil.sql), not in this plugin.
-- 2) `location_region` sits between country and state — an explicit product decision to keep the
--    "grouping of states" level that already existed informally (Brazil's N/NE/SE/S/CO), now
--    properly scoped to a country via `country_id` instead of being implicit. `region_id` on
--    `location_state` is nullable because not every country's subdivision system has this middle
--    tier.
-- 3) `location_state` is the generic name for what Brazil calls "UF" (unidade federativa) — the
--    country-specific term doesn't belong in a generic schema.
-- 4) `location_state`/`location_city` use plain integer primary keys with NO generated default
--    (`id integer PRIMARY KEY`, not `serial`/`bigserial`) instead of the uuid surrogate keys most
--    other plugins use. This is deliberate: Brazil's own IBGE municipality/UF numeric codes are
--    stable, well-known natural keys, and reusing them verbatim as the primary key lets the
--    Brazil seed (db/extras/location_seed_brazil.sql) carry over 5000+ pre-existing city rows
--    from the old orphaned seed unchanged — no id remapping, no per-row subselect needed to
--    resolve `state_id`. Any other country seeded later either reuses its own official numeric
--    codes the same way, or picks arbitrary non-colliding integers — nothing in the schema
--    requires the id to mean anything.
-- 5) `location_city` keeps `microrregion_name`/`mesorregion_name` as nullable free-text columns
--    (dropping the `*_id` denormalized columns the old IBGE-sourced seed had, since nothing
--    references them by id) — real, already-available data kept at no schema cost, even though
--    the product only needs country/state/city today.
-- 6) No `auth.permissions` row and no RBAC gate: reference data with no admin-manageable action
--    behind it (see plugins/README.md convention — not every plugin needs one, e.g.
--    notifications has none either).

-- ---------------------------------------------------------------------------------------------
-- 1) location_country
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.location_country (
    id           uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    code         text NOT NULL,
    name         text NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT location_country_code_key UNIQUE (code)
);

-- ---------------------------------------------------------------------------------------------
-- 2) location_region — grouping level above state (e.g. Brazil's N/NE/SE/S/CO). See design note
--    2 above. Uses a plain integer id (no default) for the same "reuse the existing seed's ids
--    unchanged" reason as location_state/location_city (design note 4).
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.location_region (
    id           integer NOT NULL PRIMARY KEY,
    country_id   uuid NOT NULL REFERENCES public.location_country(id) ON DELETE CASCADE,
    code         text NOT NULL,
    name         text NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT location_region_country_code_key UNIQUE (country_id, code)
);

CREATE INDEX IF NOT EXISTS idx_location_region_country_id ON public.location_region(country_id);

-- ---------------------------------------------------------------------------------------------
-- 3) location_state — generic name for what Brazil calls "UF" (design note 3). region_id
--    nullable (design note 2). See design note 4 for why id is a plain integer with no default.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.location_state (
    id           integer NOT NULL PRIMARY KEY,
    country_id   uuid NOT NULL REFERENCES public.location_country(id) ON DELETE CASCADE,
    region_id    integer REFERENCES public.location_region(id) ON DELETE SET NULL,
    code         text NOT NULL,
    name         text NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT location_state_country_code_key UNIQUE (country_id, code)
);

CREATE INDEX IF NOT EXISTS idx_location_state_country_id ON public.location_state(country_id);
CREATE INDEX IF NOT EXISTS idx_location_state_region_id ON public.location_state(region_id);

-- ---------------------------------------------------------------------------------------------
-- 4) location_city — see design notes 4 and 5 for the id and denormalized-name column choices.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.location_city (
    id                   integer NOT NULL PRIMARY KEY,
    state_id             integer NOT NULL REFERENCES public.location_state(id) ON DELETE CASCADE,
    name                 text NOT NULL,
    microrregion_name    text,
    mesorregion_name     text,
    created_at           timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT location_city_state_name_key UNIQUE (state_id, name)
);

CREATE INDEX IF NOT EXISTS idx_location_city_state_id ON public.location_city(state_id);

-- ---------------------------------------------------------------------------------------------
-- 5) RLS. Read-open to any session (public reference data, same principle as taxonomy/holidays
--    catalogs). No write grant to auth_user at all — see header note. Root/service-role bypass
--    RLS entirely as usual, so seeding/administering this data directly against the database
--    (not through PostgREST) is unaffected.
-- ---------------------------------------------------------------------------------------------
ALTER TABLE public.location_country ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.location_country TO anon, auth_user;
DROP POLICY IF EXISTS location_country_select_policy ON public.location_country;
CREATE POLICY location_country_select_policy ON public.location_country FOR SELECT TO anon, auth_user
USING (true);

ALTER TABLE public.location_region ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.location_region TO anon, auth_user;
DROP POLICY IF EXISTS location_region_select_policy ON public.location_region;
CREATE POLICY location_region_select_policy ON public.location_region FOR SELECT TO anon, auth_user
USING (true);

ALTER TABLE public.location_state ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.location_state TO anon, auth_user;
DROP POLICY IF EXISTS location_state_select_policy ON public.location_state;
CREATE POLICY location_state_select_policy ON public.location_state FOR SELECT TO anon, auth_user
USING (true);

ALTER TABLE public.location_city ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.location_city TO anon, auth_user;
DROP POLICY IF EXISTS location_city_select_policy ON public.location_city;
CREATE POLICY location_city_select_policy ON public.location_city FOR SELECT TO anon, auth_user
USING (true);

-- Plugin registration (see plugins/README.md convention). No auth.permissions rows: reference
-- data, no admin-manageable action to gate (see header note 6).
INSERT INTO auth.plugin_registry (name, version)
VALUES ('location', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
