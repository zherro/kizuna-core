-- plugins/services/0011_services_tags_index.sql
-- Tags genéricas do anúncio: `services.extras.tags` = array JSON de strings, minúsculas, em
-- kebab-case, com `:` separando um prefixo quando houver (ex.: `["casas-de-festas",
-- "local:espaco-x"]`). Servem para agrupar anúncios além da taxonomia (um local e os eventos dele,
-- um shopping e as lojas...). Filtro: `fn_search_services(p_tags => ...)` (plugin search 0008).
--
-- Só índice: nenhuma constraint (linhas antigas com `extras.tags` ausente ou fora do padrão
-- continuam válidas) e nenhum dado alterado.
--
-- GIN `jsonb_ops` (o padrão; `jsonb_path_ops` não atende `?|`) sobre `extras->'tags'`, PARCIAL nos
-- anúncios publicados (`active AND status = 'active'`): é o único conjunto que a busca lê, e a
-- pré-seleção por tag da RPC repete exatamente esse predicado, então o planner pode usá-lo.
--
-- Código do anúncio: `services.extras.codigo` = string (ex.: `espaco-art-festas-e-eventos`). Outros
-- anúncios o referenciam em `extras.tags`; a tela de detalhe usa isso nos dois sentidos (quem
-- organiza / quem está vinculado). Consulta: `extras->>codigo = <tag>` entre anúncios publicados;
-- btree parcial sobre a expressão, só nas linhas que têm `codigo` (a igualdade implica
-- `IS NOT NULL`, então o planner usa o índice). Este índice NÃO é único; a unicidade global do
-- código (entre anúncios não arquivados) vem da migração 0012 (`services_extras_codigo_uniq`).
-- Idempotente: IF NOT EXISTS.

CREATE INDEX IF NOT EXISTS services_extras_tags
  ON public.services USING gin ((extras -> 'tags'))
  WHERE active AND status = 'active';

CREATE INDEX IF NOT EXISTS services_extras_codigo
  ON public.services ((extras ->> 'codigo'))
  WHERE active AND status = 'active' AND (extras ->> 'codigo') IS NOT NULL;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('services', '1.6.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;
