-- db/extras/forms_seed_cinema.sql
--
-- Seed do formulario `cinema` (plugin forms): os campos do contrato do cinema que NAO tem coluna
-- propria em `services` — contato, dados do filme e a lista de sessoes (campo `list`). Titulo,
-- descricao, preco, localizacao, imagens e validade ficam de fora (ja tem coluna/passo proprio).
-- Chaves planas em snake_case (contato_*, detalhes_*, sessoes); o crawler grava as respostas com
-- fn_form_result_upsert('cinema', 'service', '<service_id>', <answers>).
--
-- Tambem vincula a categoria `cinema` ao formulario (categories.form_key), sem sobrescrever um
-- form_key que ja esteja definido.
--
-- Pre-requisitos: schema do core + plugins forms e taxonomy aplicados, e um usuario root ja
-- cadastrado (tenant_id/created_by vem do primeiro root e do tenant dele; sem root o INSERT vira
-- no-op silencioso, igual ao seed de taxonomia).
--
-- Idempotente: casa por (tenant_id, form_key); `version` so sobe se o schema mudar (trigger).
--
-- Aplicar:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/extras/forms_seed_cinema.sql
--   (Docker: docker exec -i <container> psql -U <user> -d <db> -v ON_ERROR_STOP=1 < db/extras/forms_seed_cinema.sql)

BEGIN;

INSERT INTO public.forms (tenant_id, form_key, title, description, schema, active, created_by)
SELECT t.uid, 'cinema', 'Cinema — sessões e detalhes',
       'Contato, dados do filme e sessões do cinema.', $cinema_schema$
{
  "title": "Cinema — sessões e detalhes",
  "description": "Contato, dados do filme e sessões do cinema.",
  "fields": [
    {
      "id": "cin_01_secao_contato",
      "key": "secao_contato",
      "name": "secao_contato",
      "type": "heading",
      "label": "Contato",
      "grid": {
        "xs": 12,
        "sm": 12,
        "md": 12,
        "lg": 12,
        "xl": 12,
        "2xl": 12
      },
      "behavior": {},
      "validation": {},
      "appearance": {}
    },
    {
      "id": "cin_02_contato_telefone",
      "key": "contato_telefone",
      "name": "contato_telefone",
      "type": "phone",
      "label": "Telefone",
      "grid": {
        "xs": 12,
        "sm": 12,
        "md": 6,
        "lg": 6,
        "xl": 6,
        "2xl": 6
      },
      "behavior": {},
      "validation": {},
      "appearance": {}
    },
    {
      "id": "cin_03_contato_whatsapp",
      "key": "contato_whatsapp",
      "name": "contato_whatsapp",
      "type": "phone",
      "label": "WhatsApp",
      "grid": {
        "xs": 12,
        "sm": 12,
        "md": 6,
        "lg": 6,
        "xl": 6,
        "2xl": 6
      },
      "behavior": {},
      "validation": {},
      "appearance": {}
    },
    {
      "id": "cin_04_contato_email",
      "key": "contato_email",
      "name": "contato_email",
      "type": "email",
      "label": "E-mail",
      "grid": {
        "xs": 12,
        "sm": 12,
        "md": 6,
        "lg": 6,
        "xl": 6,
        "2xl": 6
      },
      "behavior": {},
      "validation": {},
      "appearance": {}
    },
    {
      "id": "cin_05_contato_site",
      "key": "contato_site",
      "name": "contato_site",
      "type": "url",
      "label": "Site",
      "grid": {
        "xs": 12,
        "sm": 12,
        "md": 6,
        "lg": 6,
        "xl": 6,
        "2xl": 6
      },
      "behavior": {},
      "validation": {},
      "appearance": {}
    },
    {
      "id": "cin_06_contato_link_ingresso",
      "key": "contato_link_ingresso",
      "name": "contato_link_ingresso",
      "type": "url",
      "label": "Link para ingressos",
      "grid": {
        "xs": 12,
        "sm": 12,
        "md": 12,
        "lg": 12,
        "xl": 12,
        "2xl": 12
      },
      "behavior": {},
      "validation": {},
      "appearance": {}
    },
    {
      "id": "cin_07_secao_filme",
      "key": "secao_filme",
      "name": "secao_filme",
      "type": "heading",
      "label": "Filme",
      "grid": {
        "xs": 12,
        "sm": 12,
        "md": 12,
        "lg": 12,
        "xl": 12,
        "2xl": 12
      },
      "behavior": {},
      "validation": {},
      "appearance": {}
    },
    {
      "id": "cin_08_detalhes_titulo_obra",
      "key": "detalhes_titulo_obra",
      "name": "detalhes_titulo_obra",
      "type": "text",
      "label": "Título da obra",
      "grid": {
        "xs": 12,
        "sm": 12,
        "md": 6,
        "lg": 6,
        "xl": 6,
        "2xl": 6
      },
      "behavior": {
        "required": true
      },
      "validation": {},
      "appearance": {}
    },
    {
      "id": "cin_09_detalhes_titulo_original",
      "key": "detalhes_titulo_original",
      "name": "detalhes_titulo_original",
      "type": "text",
      "label": "Título original",
      "grid": {
        "xs": 12,
        "sm": 12,
        "md": 6,
        "lg": 6,
        "xl": 6,
        "2xl": 6
      },
      "behavior": {},
      "validation": {},
      "appearance": {}
    },
    {
      "id": "cin_10_detalhes_classificacao_indicativa",
      "key": "detalhes_classificacao_indicativa",
      "name": "detalhes_classificacao_indicativa",
      "type": "text",
      "label": "Classificação indicativa",
      "grid": {
        "xs": 12,
        "sm": 12,
        "md": 6,
        "lg": 6,
        "xl": 6,
        "2xl": 6
      },
      "behavior": {},
      "validation": {},
      "appearance": {},
      "placeholder": "Ex.: 12 anos"
    },
    {
      "id": "cin_11_detalhes_duracao_min",
      "key": "detalhes_duracao_min",
      "name": "detalhes_duracao_min",
      "type": "number",
      "label": "Duração (minutos)",
      "grid": {
        "xs": 12,
        "sm": 12,
        "md": 6,
        "lg": 6,
        "xl": 6,
        "2xl": 6
      },
      "behavior": {},
      "validation": {
        "min": 1
      },
      "appearance": {}
    },
    {
      "id": "cin_12_detalhes_ano_lancamento",
      "key": "detalhes_ano_lancamento",
      "name": "detalhes_ano_lancamento",
      "type": "number",
      "label": "Ano de lançamento",
      "grid": {
        "xs": 12,
        "sm": 12,
        "md": 6,
        "lg": 6,
        "xl": 6,
        "2xl": 6
      },
      "behavior": {},
      "validation": {},
      "appearance": {}
    },
    {
      "id": "cin_13_detalhes_distribuidora",
      "key": "detalhes_distribuidora",
      "name": "detalhes_distribuidora",
      "type": "text",
      "label": "Distribuidora",
      "grid": {
        "xs": 12,
        "sm": 12,
        "md": 6,
        "lg": 6,
        "xl": 6,
        "2xl": 6
      },
      "behavior": {},
      "validation": {},
      "appearance": {}
    },
    {
      "id": "cin_14_detalhes_avisos_classificacao",
      "key": "detalhes_avisos_classificacao",
      "name": "detalhes_avisos_classificacao",
      "type": "multiselect",
      "label": "Avisos da classificação",
      "grid": {
        "xs": 12,
        "sm": 12,
        "md": 12,
        "lg": 12,
        "xl": 12,
        "2xl": 12
      },
      "behavior": {},
      "validation": {},
      "appearance": {},
      "options": [
        {
          "label": "Medo",
          "value": "Medo"
        },
        {
          "label": "Violência",
          "value": "Violência"
        },
        {
          "label": "Drogas",
          "value": "Drogas"
        },
        {
          "label": "Sexo",
          "value": "Sexo"
        },
        {
          "label": "Nudez",
          "value": "Nudez"
        },
        {
          "label": "Linguagem imprópria",
          "value": "Linguagem imprópria"
        },
        {
          "label": "Discriminação",
          "value": "Discriminação"
        },
        {
          "label": "Conteúdo sexual",
          "value": "Conteúdo sexual"
        }
      ]
    },
    {
      "id": "cin_15_detalhes_genero",
      "key": "detalhes_genero",
      "name": "detalhes_genero",
      "type": "multiselect",
      "label": "Gênero",
      "grid": {
        "xs": 12,
        "sm": 12,
        "md": 12,
        "lg": 12,
        "xl": 12,
        "2xl": 12
      },
      "behavior": {},
      "validation": {},
      "appearance": {},
      "options": [
        {
          "label": "Ação",
          "value": "Ação"
        },
        {
          "label": "Animação",
          "value": "Animação"
        },
        {
          "label": "Aventura",
          "value": "Aventura"
        },
        {
          "label": "Comédia",
          "value": "Comédia"
        },
        {
          "label": "Documentário",
          "value": "Documentário"
        },
        {
          "label": "Drama",
          "value": "Drama"
        },
        {
          "label": "Fantasia",
          "value": "Fantasia"
        },
        {
          "label": "Ficção científica",
          "value": "Ficção científica"
        },
        {
          "label": "Romance",
          "value": "Romance"
        },
        {
          "label": "Suspense",
          "value": "Suspense"
        },
        {
          "label": "Terror",
          "value": "Terror"
        },
        {
          "label": "Musical",
          "value": "Musical"
        },
        {
          "label": "Família",
          "value": "Família"
        }
      ]
    },
    {
      "id": "cin_16_detalhes_idiomas",
      "key": "detalhes_idiomas",
      "name": "detalhes_idiomas",
      "type": "multiselect",
      "label": "Idiomas",
      "grid": {
        "xs": 12,
        "sm": 12,
        "md": 6,
        "lg": 6,
        "xl": 6,
        "2xl": 6
      },
      "behavior": {},
      "validation": {},
      "appearance": {},
      "options": [
        {
          "label": "Dublado",
          "value": "Dublado"
        },
        {
          "label": "Legendado",
          "value": "Legendado"
        },
        {
          "label": "Nacional",
          "value": "Nacional"
        }
      ]
    },
    {
      "id": "cin_17_detalhes_formatos",
      "key": "detalhes_formatos",
      "name": "detalhes_formatos",
      "type": "multiselect",
      "label": "Formatos",
      "grid": {
        "xs": 12,
        "sm": 12,
        "md": 6,
        "lg": 6,
        "xl": 6,
        "2xl": 6
      },
      "behavior": {},
      "validation": {},
      "appearance": {},
      "options": [
        {
          "label": "2D",
          "value": "2D"
        },
        {
          "label": "3D",
          "value": "3D"
        },
        {
          "label": "IMAX",
          "value": "IMAX"
        },
        {
          "label": "D-Box",
          "value": "D-Box"
        },
        {
          "label": "4DX",
          "value": "4DX"
        },
        {
          "label": "XD",
          "value": "XD"
        },
        {
          "label": "MACRO XE",
          "value": "MACRO XE"
        },
        {
          "label": "Prime",
          "value": "Prime"
        },
        {
          "label": "VIP",
          "value": "VIP"
        },
        {
          "label": "Cinépolis Junior",
          "value": "Cinépolis Junior"
        }
      ]
    },
    {
      "id": "cin_18_detalhes_pre_venda",
      "key": "detalhes_pre_venda",
      "name": "detalhes_pre_venda",
      "type": "switch",
      "label": "Pré-venda",
      "grid": {
        "xs": 12,
        "sm": 12,
        "md": 6,
        "lg": 6,
        "xl": 6,
        "2xl": 6
      },
      "behavior": {},
      "validation": {},
      "appearance": {}
    },
    {
      "id": "cin_19_detalhes_reexibicao",
      "key": "detalhes_reexibicao",
      "name": "detalhes_reexibicao",
      "type": "switch",
      "label": "Reexibição",
      "grid": {
        "xs": 12,
        "sm": 12,
        "md": 6,
        "lg": 6,
        "xl": 6,
        "2xl": 6
      },
      "behavior": {},
      "validation": {},
      "appearance": {}
    },
    {
      "id": "cin_20_detalhes_trailer_url",
      "key": "detalhes_trailer_url",
      "name": "detalhes_trailer_url",
      "type": "url",
      "label": "Trailer (URL)",
      "grid": {
        "xs": 12,
        "sm": 12,
        "md": 12,
        "lg": 12,
        "xl": 12,
        "2xl": 12
      },
      "behavior": {},
      "validation": {},
      "appearance": {}
    },
    {
      "id": "cin_21_secao_sessoes",
      "key": "secao_sessoes",
      "name": "secao_sessoes",
      "type": "heading",
      "label": "Sessões",
      "grid": {
        "xs": 12,
        "sm": 12,
        "md": 12,
        "lg": 12,
        "xl": 12,
        "2xl": 12
      },
      "behavior": {},
      "validation": {},
      "appearance": {}
    },
    {
      "id": "cin_30_sessoes",
      "key": "sessoes",
      "name": "sessoes",
      "type": "list",
      "label": "Sessões",
      "grid": {
        "xs": 12,
        "sm": 12,
        "md": 12,
        "lg": 12,
        "xl": 12,
        "2xl": 12
      },
      "behavior": {},
      "validation": {},
      "appearance": {},
      "itemFields": [
        {
          "id": "sess_id_origem",
          "key": "id_origem",
          "name": "id_origem",
          "type": "text",
          "label": "ID de origem",
          "grid": {
            "xs": 12,
            "sm": 12,
            "md": 6,
            "lg": 3,
            "xl": 3,
            "2xl": 3
          },
          "behavior": {
            "readOnly": true
          },
          "validation": {},
          "appearance": {}
        },
        {
          "id": "sess_data",
          "key": "data",
          "name": "data",
          "type": "date",
          "label": "Data",
          "grid": {
            "xs": 12,
            "sm": 12,
            "md": 6,
            "lg": 3,
            "xl": 3,
            "2xl": 3
          },
          "behavior": {
            "required": true
          },
          "validation": {},
          "appearance": {}
        },
        {
          "id": "sess_horario",
          "key": "horario",
          "name": "horario",
          "type": "time",
          "label": "Horário",
          "grid": {
            "xs": 12,
            "sm": 12,
            "md": 6,
            "lg": 3,
            "xl": 3,
            "2xl": 3
          },
          "behavior": {
            "required": true
          },
          "validation": {},
          "appearance": {}
        },
        {
          "id": "sess_preco",
          "key": "preco",
          "name": "preco",
          "type": "currency",
          "label": "Preço",
          "grid": {
            "xs": 12,
            "sm": 12,
            "md": 6,
            "lg": 3,
            "xl": 3,
            "2xl": 3
          },
          "behavior": {},
          "validation": {
            "min": 0
          },
          "appearance": {}
        },
        {
          "id": "sess_sala",
          "key": "sala",
          "name": "sala",
          "type": "text",
          "label": "Sala",
          "grid": {
            "xs": 12,
            "sm": 12,
            "md": 6,
            "lg": 3,
            "xl": 3,
            "2xl": 3
          },
          "behavior": {},
          "validation": {},
          "appearance": {}
        },
        {
          "id": "sess_tipo",
          "key": "tipo",
          "name": "tipo",
          "type": "multiselect",
          "label": "Tipo da sessão",
          "grid": {
            "xs": 12,
            "sm": 12,
            "md": 12,
            "lg": 6,
            "xl": 6,
            "2xl": 6
          },
          "behavior": {},
          "validation": {},
          "appearance": {},
          "options": [
            {
              "label": "Dublado",
              "value": "Dublado"
            },
            {
              "label": "Legendado",
              "value": "Legendado"
            },
            {
              "label": "Nacional",
              "value": "Nacional"
            },
            {
              "label": "2D",
              "value": "2D"
            },
            {
              "label": "3D",
              "value": "3D"
            },
            {
              "label": "IMAX",
              "value": "IMAX"
            },
            {
              "label": "D-Box",
              "value": "D-Box"
            },
            {
              "label": "4DX",
              "value": "4DX"
            },
            {
              "label": "XD",
              "value": "XD"
            },
            {
              "label": "VIP",
              "value": "VIP"
            },
            {
              "label": "MACRO XE",
              "value": "MACRO XE"
            },
            {
              "label": "Prime",
              "value": "Prime"
            },
            {
              "label": "Cinépolis Junior",
              "value": "Cinépolis Junior"
            }
          ]
        },
        {
          "id": "sess_url_compra",
          "key": "url_compra",
          "name": "url_compra",
          "type": "url",
          "label": "Link de compra",
          "grid": {
            "xs": 12,
            "sm": 12,
            "md": 12,
            "lg": 6,
            "xl": 6,
            "2xl": 6
          },
          "behavior": {},
          "validation": {},
          "appearance": {}
        },
        {
          "id": "sess_lugares_disponiveis",
          "key": "lugares_disponiveis",
          "name": "lugares_disponiveis",
          "type": "number",
          "label": "Lugares disponíveis",
          "grid": {
            "xs": 12,
            "sm": 12,
            "md": 6,
            "lg": 3,
            "xl": 3,
            "2xl": 3
          },
          "behavior": {
            "readOnly": true
          },
          "validation": {},
          "appearance": {}
        }
      ],
      "itemLabel": "Sessão",
      "minItems": 1
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
