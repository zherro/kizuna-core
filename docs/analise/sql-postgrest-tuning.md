---
description: Spec da skill perf-sql — diagnosticar e otimizar consultas, índices, RLS, paginação e RPC em Postgres + PostgREST.
---

# SQL / PostgREST / Postgres

Spec da skill **`perf-sql`**. Complementa [Next.js](nextjs-performance.md) (a consulta lenta
costuma ser o TTFB alto) e [Cache](cache.md). A análise de **segurança** das mesmas tabelas está
em [Segurança — RLS](seguranca-rls.md); as duas se cruzam, porque política RLS é parte do custo
da consulta.

## Entradas

* A consulta/rota lenta (URL PostgREST, filtro, `select` com embeds) ou "tudo parece lento".
* Acesso de leitura a um banco com volume realista. **Nunca** medir só em banco vazio de dev.

## Passo 1 — Encontrar o que é lento

| Fonte | Para quê |
| ----- | -------- |
| `pg_stat_statements` | consultas por tempo total, média e chamadas |
| log de consultas lentas (`log_min_duration_statement`) | consultas pontuais |
| `EXPLAIN (ANALYZE, BUFFERS)` | plano real, linhas estimadas vs. reais, leitura de disco |
| `pg_stat_user_tables` / `pg_stat_user_indexes` | seq scans em tabela grande, índices nunca usados |
| Logs do PostgREST e do Next | tempo por requisição |

Sem acesso ao banco: modo estático do [Plano de melhoria](plano-de-melhoria.md#sem-acesso-para-medir-analise-estatica)
(achados [LIDO], Etapa 0 = os comandos de medição). Para alvo só de banco, o baseline registra o
**tempo por camada** (Postgres, PostgREST, Next), não métricas de Lighthouse.

Traduzir a URL PostgREST para o SQL equivalente antes de rodar `EXPLAIN`.

{% hint style="warning" %}
`EXPLAIN ANALYZE` de uma função plpgsql (RPC como `fn_search_services`) mostra só a chamada. Para
ver o plano interno, use `auto_explain` com `auto_explain.log_nested_statements = on` ou extraia a
query do `RETURN QUERY` e rode com parâmetros literais.
{% endhint %}

Padrão típico de RPC grande: CTE `MATERIALIZED` que enriquece todos os registros antes do
`ORDER BY`/`LIMIT`. Filtrar e paginar os ids primeiro e enriquecer só a página costuma pesar mais
que qualquer índice, mas é mudança estrutural (testar equivalência de resultado, inclusive com
`setseed`/`random()`): entra por último, só se a medição mostrar que o CTE domina. Rodar `EXPLAIN` **com o
papel e as claims reais** (`SET ROLE`, `request.jwt.claims`), senão as políticas RLS não entram
no plano e o diagnóstico mente.

## Passo 2 — Padrões de problema

1. **Seq Scan em tabela grande** com filtro seletivo → índice. Conferir seletividade antes.
2. **Índice errado:** ordem de colunas (igualdade primeiro, depois ordenação), falta de índice
   parcial (`WHERE status = 'published'`), falta de índice composto para o filtro + `ORDER BY`.
3. **FK sem índice** na coluna filha (joins e deletes em cascata lentos).
4. **RLS cara:** política que chama função por linha. Prefira `(SELECT auth.fun_auth_user_id())`
   para o planejador avaliar uma vez; funções usadas em política devem ser `STABLE`.
   Colunas usadas na política (`tenant_id`, `owner_uid`) precisam de índice.
5. **Paginação por `OFFSET` grande** → paginação por chave (keyset) com índice de ordenação.
6. **Contagem exata** (`Prefer: count=exact`) em tabela grande → `planned`/`estimated`, ou
   omitir a contagem.
7. **Embeds do PostgREST** que explodem (N níveis, sem limite) → limitar, ou uma RPC/view que
   devolve o formato pronto.
8. **`select=*`** trazendo colunas pesadas (`jsonb` grande, bytes de arquivo) → listar só o necessário;
   bytes de arquivo nunca na listagem.
9. **N+1 no Next:** várias chamadas pequenas em série → uma consulta com embed ou `Promise.all`.
10. **Busca textual** com `ILIKE '%x%'` → índice trigram (`pg_trgm`) ou full-text; ver plugin `search`.
11. **Tabela inchada / estatística velha:** `ANALYZE` desatualizado, autovacuum atrasado.
12. **Conexões:** pool do PostgREST (`db-pool`) vs. `max_connections`; pico de conexões no deploy.

## Passo 3 — Regras de proposta

* Toda proposta traz: SQL exato, **plano antes/depois**, custo (tamanho do índice, escrita mais
  lenta) e rollback (`DROP INDEX` correspondente).
* Índices em tabela grande são criados com `CREATE INDEX CONCURRENTLY` (não bloqueia escrita);
  isso não roda dentro de transação — avisar no plano.
* Migration entra como arquivo do plugin dono da tabela (`plugins/<p>/NNNN_*.sql`) ou em `sql/`,
  seguindo a skill `criar-plugin`; ajuste pontual de produção de um projeto vai em `db/extras/`
  **do projeto consumidor** (ex.: `db/extras/diagnostico_busca.sql` no starter).
* `CREATE INDEX CONCURRENTLY` não roda em transação. Conferir como o runner de migrations dos
  plugins executa o arquivo; se for em transação, o índice vai para aplicação manual via `psql`
  (registrada em `db/extras/`) e a migration usa `CREATE INDEX IF NOT EXISTS` em banco novo.
* Índice sobre expressão com `unaccent` exige wrapper `IMMUTABLE` (a função nativa é `STABLE`) ou
  coluna de busca mantida por trigger; `ILIKE '%x%'` pede `pg_trgm`.
* `join` por `reference_id = id::text` (cast) não usa índice de `id`: indexar `(domain, reference_id)`.
* Cada índice novo justificado por **consulta real**. Índice "por via das dúvidas" custa escrita.
* Remover índice só com evidência de `idx_scan = 0` por período longo **e** aprovação.

## Prudência (não fazer sem aprovação explícita)

* `DROP`, `TRUNCATE`, `VACUUM FULL`, `REINDEX` sem `CONCURRENTLY`, `ALTER TABLE` que reescreve
  tabela grande, mudança de tipo de coluna.
* Alterar configuração do Postgres (`work_mem`, `shared_buffers`) ou do PostgREST.
* Reescrever política RLS "para ficar mais rápido": a mudança de desempenho não pode alterar
  quem enxerga o quê. Qualquer mudança de política passa também por [Segurança — RLS](seguranca-rls.md)
  e por teste com os papéis `anon`, `auth_user` e um tenant diferente.
* Rodar `EXPLAIN ANALYZE` de `INSERT/UPDATE/DELETE` em produção (ele executa de verdade): usar
  transação com `ROLLBACK` ou ambiente de cópia.

## Cache e banco

Para cada consulta lenta, registrar na tabela de [Cache](cache.md) se o resultado pode ser
cacheado — às vezes a resposta certa é cache + índice, não só um deles.

## Saída da skill

Top consultas por impacto, plano antes/depois de cada uma, lista de índices propostos (e dos
sem uso), riscos e o [plano em etapas](plano-de-melhoria.md).
