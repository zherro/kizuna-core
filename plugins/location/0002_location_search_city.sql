-- plugins/location/0002_location_search_city.sql
-- v1.1.0 — `location_city.search_city`: marca as cidades que aparecem no seletor de local do
-- site (header / /busca) e que a detecção por GPS/IP aceita. É a lista de cidades atendidas pelo
-- projeto: o seletor lê SÓ `WHERE search_city`, nunca a tabela inteira (um projeto pode ter o
-- Brasil inteiro semeado como referência e atender poucas cidades).
--
-- Default false: nenhuma cidade existente entra no seletor sozinha — o projeto marca as suas
-- (UPDATE ... SET search_city = true, ou no próprio seed).
--
-- Índice parcial em (name) WHERE search_city: é exatamente a consulta do seletor ("cidades
-- marcadas, por nome") e fica do tamanho da lista curada. Um índice comum no boolean não
-- ajudaria (2 valores, seletividade baixa).
--
-- Idempotente.

ALTER TABLE public.location_city
  ADD COLUMN IF NOT EXISTS search_city boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_location_city_search_city
  ON public.location_city (name)
  WHERE search_city;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('location', '1.1.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
