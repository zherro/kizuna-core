-- db/extras/forms_seed_cinema.sql
--
-- Seed do formulario `cinema` (plugin forms). Um anuncio = um filme em uma cidade:
--   - Filme: dados do filme que nao tem coluna propria em `services`.
--   - Cinemas: lista (`list`) enxuta, um item por cinema (nome, contato, idiomas, formatos,
--     validade e `active`). Endereco do cinema fica em service_addresses, nao aqui.
--   - Tags: multiselect no fim do formulario (pre-venda, reexibicao, idiomas e formatos).
-- Titulo, descricao, imagens, enderecos e validade do anuncio ficam de fora (coluna/tabela propria).
-- Genero e taxonomia (subcategorias de Cinema), nao formulario.
--
-- O importador grava as respostas direto em public.form_results e pode acrescentar opcoes novas aos
-- multiselects deste schema (a aprovacao dessas opcoes fica fora do Kizuna).
--
-- DESTRUTIVO (recria): o bloco 0 apaga o formulario `cinema` do tenant do root e o insere de novo,
-- com `version` = 1 e sem as opcoes acrescentadas pelo importador. form_results.form_id e
-- ON DELETE RESTRICT: se ja houver qualquer resposta desse formulario, o script ABORTA com
-- RAISE EXCEPTION antes de apagar (tudo roda numa transacao). Nunca apaga resposta de anuncio.
--
-- Tambem vincula a categoria `cinema` ao formulario (categories.form_key), sem sobrescrever um
-- form_key que ja esteja definido. Rode depois do seed de taxonomia (o clear-all dele zera o form_key).
--
-- Pre-requisitos: schema do core + plugins forms e taxonomy aplicados, e um usuario root ja
-- cadastrado (tenant_id/created_by vem do primeiro root e do tenant dele; sem root nada e apagado e
-- o INSERT vira no-op silencioso, igual ao seed de taxonomia).
--
-- Aplicar:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/extras/forms_seed_cinema.sql
--   (Docker: docker exec -i <container> psql -U <user> -d <db> -v ON_ERROR_STOP=1 < db/extras/forms_seed_cinema.sql)

BEGIN;

-- 0) Remocao (sempre recria) — com guarda: so se o formulario nao tiver respostas ----------------
DO $clear$
DECLARE
  v_tenant uuid;
  v_n bigint;
BEGIN
  SELECT tn.uid INTO v_tenant
  FROM auth.tenants tn
  JOIN (SELECT uid FROM auth.users WHERE is_root = true ORDER BY created_at ASC LIMIT 1) u ON tn.owner_uid = u.uid
  ORDER BY tn.created_at ASC LIMIT 1;

  IF v_tenant IS NULL THEN
    RAISE NOTICE 'sem root/tenant: remocao ignorada (o INSERT abaixo tambem sera no-op).';
    RETURN;
  END IF;

  SELECT count(*) INTO v_n
  FROM public.form_results r
  JOIN public.forms f ON f.id = r.form_id
  WHERE f.tenant_id = v_tenant AND f.form_key = 'cinema';

  IF v_n > 0 THEN
    RAISE EXCEPTION 'recriacao do formulario cinema abortada: ha % resposta(s) em public.form_results. Remova os anuncios de cinema antes.', v_n;
  END IF;

  DELETE FROM public.forms WHERE tenant_id = v_tenant AND form_key = 'cinema';
END
$clear$;

-- 1) Formulario -------------------------------------------------------------------------------------
INSERT INTO public.forms (tenant_id, form_key, title, description, schema, active, created_by)
SELECT t.uid, 'cinema', 'Cinema — filme e cinemas',
       'Dados do filme, cinemas onde está em cartaz e tags.', $cinema_schema$
{
  "title": "Cinema — filme e cinemas",
  "description": "Dados do filme, cinemas onde está em cartaz e tags.",
  "fields": [
    {
      "id": "cin_01_secao_filme",
      "key": "secao_filme",
      "name": "secao_filme",
      "type": "heading",
      "label": "Filme",
      "grid": { "xs": 12, "sm": 12, "md": 12, "lg": 12, "xl": 12, "2xl": 12 },
      "behavior": {},
      "validation": {},
      "appearance": {}
    },
    {
      "id": "cin_02_detalhes_titulo_obra",
      "key": "detalhes_titulo_obra",
      "name": "detalhes_titulo_obra",
      "type": "text",
      "label": "Título da obra",
      "grid": { "xs": 12, "sm": 12, "md": 6, "lg": 6, "xl": 6, "2xl": 6 },
      "behavior": { "required": true },
      "validation": {},
      "appearance": {}
    },
    {
      "id": "cin_03_detalhes_titulo_original",
      "key": "detalhes_titulo_original",
      "name": "detalhes_titulo_original",
      "type": "text",
      "label": "Título original",
      "grid": { "xs": 12, "sm": 12, "md": 6, "lg": 6, "xl": 6, "2xl": 6 },
      "behavior": {},
      "validation": {},
      "appearance": {}
    },
    {
      "id": "cin_04_detalhes_classificacao_indicativa",
      "key": "detalhes_classificacao_indicativa",
      "name": "detalhes_classificacao_indicativa",
      "type": "text",
      "label": "Classificação indicativa",
      "grid": { "xs": 12, "sm": 12, "md": 6, "lg": 6, "xl": 6, "2xl": 6 },
      "behavior": {},
      "validation": {},
      "appearance": {},
      "placeholder": "Ex.: 12 anos"
    },
    {
      "id": "cin_05_detalhes_duracao_min",
      "key": "detalhes_duracao_min",
      "name": "detalhes_duracao_min",
      "type": "number",
      "label": "Duração (minutos)",
      "grid": { "xs": 12, "sm": 12, "md": 6, "lg": 6, "xl": 6, "2xl": 6 },
      "behavior": {},
      "validation": { "min": 1 },
      "appearance": {}
    },
    {
      "id": "cin_06_detalhes_ano_lancamento",
      "key": "detalhes_ano_lancamento",
      "name": "detalhes_ano_lancamento",
      "type": "number",
      "label": "Ano de lançamento",
      "grid": { "xs": 12, "sm": 12, "md": 6, "lg": 6, "xl": 6, "2xl": 6 },
      "behavior": {},
      "validation": {},
      "appearance": {}
    },
    {
      "id": "cin_07_detalhes_distribuidora",
      "key": "detalhes_distribuidora",
      "name": "detalhes_distribuidora",
      "type": "text",
      "label": "Distribuidora",
      "grid": { "xs": 12, "sm": 12, "md": 6, "lg": 6, "xl": 6, "2xl": 6 },
      "behavior": {},
      "validation": {},
      "appearance": {}
    },
    {
      "id": "cin_08_detalhes_trailer_url",
      "key": "detalhes_trailer_url",
      "name": "detalhes_trailer_url",
      "type": "url",
      "label": "Trailer (URL)",
      "grid": { "xs": 12, "sm": 12, "md": 12, "lg": 12, "xl": 12, "2xl": 12 },
      "behavior": {},
      "validation": {},
      "appearance": {}
    },
    {
      "id": "cin_09_detalhes_avisos_classificacao",
      "key": "detalhes_avisos_classificacao",
      "name": "detalhes_avisos_classificacao",
      "type": "multiselect",
      "label": "Avisos da classificação",
      "grid": { "xs": 12, "sm": 12, "md": 12, "lg": 12, "xl": 12, "2xl": 12 },
      "behavior": {},
      "validation": {},
      "appearance": {},
      "options": [
        { "label": "Medo", "value": "Medo" },
        { "label": "Violência", "value": "Violência" },
        { "label": "Drogas", "value": "Drogas" },
        { "label": "Sexo", "value": "Sexo" },
        { "label": "Nudez", "value": "Nudez" },
        { "label": "Linguagem imprópria", "value": "Linguagem imprópria" },
        { "label": "Discriminação", "value": "Discriminação" },
        { "label": "Conteúdo sexual", "value": "Conteúdo sexual" }
      ]
    },
    {
      "id": "cin_10_secao_cinemas",
      "key": "secao_cinemas",
      "name": "secao_cinemas",
      "type": "heading",
      "label": "Cinemas",
      "grid": { "xs": 12, "sm": 12, "md": 12, "lg": 12, "xl": 12, "2xl": 12 },
      "behavior": {},
      "validation": {},
      "appearance": {}
    },
    {
      "id": "cin_11_cinemas",
      "key": "cinemas",
      "name": "cinemas",
      "type": "list",
      "label": "Cinemas",
      "grid": { "xs": 12, "sm": 12, "md": 12, "lg": 12, "xl": 12, "2xl": 12 },
      "behavior": {},
      "validation": {},
      "appearance": {},
      "itemFields": [
        {
          "id": "cine_id_cinema",
          "key": "id_cinema",
          "name": "id_cinema",
          "type": "text",
          "label": "ID de origem",
          "grid": { "xs": 12, "sm": 12, "md": 6, "lg": 3, "xl": 3, "2xl": 3 },
          "behavior": { "readOnly": true },
          "validation": {},
          "appearance": {}
        },
        {
          "id": "cine_nome",
          "key": "nome",
          "name": "nome",
          "type": "text",
          "label": "Cinema",
          "grid": { "xs": 12, "sm": 12, "md": 6, "lg": 9, "xl": 9, "2xl": 9 },
          "behavior": { "required": true },
          "validation": {},
          "appearance": {}
        },
        {
          "id": "cine_telefone",
          "key": "telefone",
          "name": "telefone",
          "type": "phone",
          "label": "Telefone",
          "grid": { "xs": 12, "sm": 12, "md": 6, "lg": 6, "xl": 6, "2xl": 6 },
          "behavior": {},
          "validation": {},
          "appearance": {}
        },
        {
          "id": "cine_site",
          "key": "site",
          "name": "site",
          "type": "url",
          "label": "Site do cinema",
          "grid": { "xs": 12, "sm": 12, "md": 6, "lg": 6, "xl": 6, "2xl": 6 },
          "behavior": {},
          "validation": {},
          "appearance": {}
        },
        {
          "id": "cine_link_ingresso",
          "key": "link_ingresso",
          "name": "link_ingresso",
          "type": "url",
          "label": "Link para ingressos",
          "grid": { "xs": 12, "sm": 12, "md": 12, "lg": 12, "xl": 12, "2xl": 12 },
          "behavior": {},
          "validation": {},
          "appearance": {}
        },
        {
          "id": "cine_idiomas",
          "key": "idiomas",
          "name": "idiomas",
          "type": "multiselect",
          "label": "Idiomas",
          "grid": { "xs": 12, "sm": 12, "md": 6, "lg": 6, "xl": 6, "2xl": 6 },
          "behavior": {},
          "validation": {},
          "appearance": {},
          "options": [
            { "label": "Dublado", "value": "Dublado" },
            { "label": "Legendado", "value": "Legendado" },
            { "label": "Nacional", "value": "Nacional" }
          ]
        },
        {
          "id": "cine_formatos",
          "key": "formatos",
          "name": "formatos",
          "type": "multiselect",
          "label": "Formatos",
          "grid": { "xs": 12, "sm": 12, "md": 6, "lg": 6, "xl": 6, "2xl": 6 },
          "behavior": {},
          "validation": {},
          "appearance": {},
          "options": [
            { "label": "2D", "value": "2D" },
            { "label": "3D", "value": "3D" },
            { "label": "IMAX", "value": "IMAX" },
            { "label": "D-Box", "value": "D-Box" },
            { "label": "4DX", "value": "4DX" },
            { "label": "XD", "value": "XD" },
            { "label": "MACRO XE", "value": "MACRO XE" },
            { "label": "Prime", "value": "Prime" },
            { "label": "VIP", "value": "VIP" },
            { "label": "Cinépolis Junior", "value": "Cinépolis Junior" }
          ]
        },
        {
          "id": "cine_expira_em",
          "key": "expira_em",
          "name": "expira_em",
          "type": "datetime",
          "label": "Em cartaz até",
          "grid": { "xs": 12, "sm": 12, "md": 6, "lg": 6, "xl": 6, "2xl": 6 },
          "behavior": {},
          "validation": {},
          "appearance": {}
        },
        {
          "id": "cine_active",
          "key": "active",
          "name": "active",
          "type": "switch",
          "label": "Em cartaz",
          "grid": { "xs": 12, "sm": 12, "md": 6, "lg": 6, "xl": 6, "2xl": 6 },
          "behavior": {},
          "validation": {},
          "appearance": {}
        }
      ],
      "itemLabel": "Cinema",
      "minItems": 1
    },
    {
      "id": "cin_12_secao_tags",
      "key": "secao_tags",
      "name": "secao_tags",
      "type": "heading",
      "label": "Tags",
      "grid": { "xs": 12, "sm": 12, "md": 12, "lg": 12, "xl": 12, "2xl": 12 },
      "behavior": {},
      "validation": {},
      "appearance": {}
    },
    {
      "id": "cin_13_tags",
      "key": "tags",
      "name": "tags",
      "type": "multiselect",
      "label": "Tags",
      "grid": { "xs": 12, "sm": 12, "md": 12, "lg": 12, "xl": 12, "2xl": 12 },
      "behavior": {},
      "validation": {},
      "appearance": {},
      "options": [
        { "label": "Pré-venda", "value": "Pré-venda" },
        { "label": "Reexibição", "value": "Reexibição" },
        { "label": "Dublado", "value": "Dublado" },
        { "label": "Legendado", "value": "Legendado" },
        { "label": "Nacional", "value": "Nacional" },
        { "label": "2D", "value": "2D" },
        { "label": "3D", "value": "3D" },
        { "label": "IMAX", "value": "IMAX" },
        { "label": "D-Box", "value": "D-Box" },
        { "label": "4DX", "value": "4DX" },
        { "label": "XD", "value": "XD" },
        { "label": "MACRO XE", "value": "MACRO XE" },
        { "label": "Prime", "value": "Prime" },
        { "label": "VIP", "value": "VIP" },
        { "label": "Cinépolis Junior", "value": "Cinépolis Junior" }
      ]
    }
  ]
}
$cinema_schema$::jsonb, true, u.uid
FROM (SELECT uid FROM auth.users WHERE is_root = true ORDER BY created_at ASC LIMIT 1) AS u
JOIN LATERAL (
    SELECT tn.uid FROM auth.tenants tn WHERE tn.owner_uid = u.uid ORDER BY tn.created_at ASC LIMIT 1
) AS t ON true
ON CONFLICT (tenant_id, form_key) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  schema = EXCLUDED.schema,
  active = true;

UPDATE public.categories SET form_key = 'cinema'
WHERE slug = 'cinema' AND (form_key IS NULL OR form_key = '');

COMMIT;
