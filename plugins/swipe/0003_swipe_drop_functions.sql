-- plugins/swipe/0003_swipe_drop_functions.sql
-- Remove as funções do swipe: tudo passa por resources, sem lógica no banco.
--  * gravar curtir/passar → POST /api/resources/service_reactions (upsert por usuário + anúncio);
--  * curtidos             → GET  /api/resources/liked_services (esta tabela + o anúncio embutido);
--  * deck                 → a busca (fn_search_services) menos o que o usuário já decidiu, no cliente.

DROP FUNCTION IF EXISTS public.fn_swipe_record(uuid[], text);
DROP FUNCTION IF EXISTS public.fn_swipe_liked(timestamptz, integer);
DROP FUNCTION IF EXISTS public.fn_swipe_liked(integer, integer);
DROP FUNCTION IF EXISTS public.fn_swipe_deck(character varying, integer, character varying, bigint, jsonb, text, double precision, integer, text, uuid[], numeric, numeric);
DROP FUNCTION IF EXISTS public.fn_swipe_deck(character varying, integer, character varying, bigint, jsonb, text, double precision, integer, text, uuid[]);

-- O resource service_reactions grava por upsert (INSERT ... ON CONFLICT DO UPDATE), que exige
-- UPDATE na tabela para o dono — já concedido em 0001 (GRANT SELECT, INSERT, UPDATE).

NOTIFY pgrst, 'reload schema';
