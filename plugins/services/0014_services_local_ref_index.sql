-- plugins/services/0014_services_local_ref_index.sql
-- Referência a outro anúncio: `services.extras.local_ref` = uid ou `extras.codigo` do lugar onde o
-- evento acontece. Basta esse campo para ligar os dois sentidos: o evento mostra "Onde acontece" e a
-- página do lugar lista o evento nos vinculados (`fn_search_services(p_local_refs => ...)`, plugin
-- search 0009). A tag com o código do lugar continua aceita, mas é opcional.
--
-- Só índice: btree parcial sobre a expressão, só nos anúncios publicados que têm `local_ref` (a
-- igualdade implica `IS NOT NULL`, então o planner usa o índice). Nenhum dado alterado.
-- Idempotente: IF NOT EXISTS.

CREATE INDEX IF NOT EXISTS services_extras_local_ref
  ON public.services ((extras ->> 'local_ref'))
  WHERE active AND status = 'active' AND (extras ->> 'local_ref') IS NOT NULL;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('services', '1.9.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
