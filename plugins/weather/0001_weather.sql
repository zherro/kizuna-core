-- plugins/weather/0001_weather.sql
-- Optional. Weather widget (header): current temperature cycling through a list of cities, and a
-- modal with yesterday + today + the next days. No tables — data comes live from an external
-- provider (Open-Meteo by default) through the shell route /api/weather, configured entirely by
-- the "weather" block of the project's kizuna.config.json (cities, provider URL, cache, rotation).
-- This file only exists so the plugin is installable/tracked like every other plugin.

-- Plugin registration (see plugins/README.md convention). No auth.permissions rows: read-only,
-- nothing admin-manageable.
INSERT INTO auth.plugin_registry (name, version)
VALUES ('weather', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
