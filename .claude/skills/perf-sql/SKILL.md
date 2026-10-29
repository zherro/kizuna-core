---
name: perf-sql
description: Use quando uma consulta, rota PostgREST ou RPC está lenta, o TTFB é alto por causa do banco, faltam índices, há seq scan, paginação por OFFSET grande, embeds pesados ou política RLS cara.
---

# Tuning SQL / PostgREST / Postgres

## Overview

Acha a consulta lenta, prova com plano de execução e propõe índice/ajuste com rollback. O diagnóstico só **lê** o banco; qualquer alteração é migration aprovada.

Spec: `kizuna-core/docs/analise/sql-postgrest-tuning.md`. Complementos: `cache.md`, `seguranca-rls.md`, `plano-de-melhoria.md`.

## Quando usar

- Rota lenta cuja causa é o banco, ou "tudo lento" sem causa definida.
- Não usar para auditar segurança de políticas (`sec-rls`), mas toda mudança de política passa por lá.

## Passos

1. **Achar:** `pg_stat_statements`, log de lentas, `pg_stat_user_tables/indexes`, logs do PostgREST. Traduzir a URL PostgREST para SQL.
   **Sem acesso ao banco:** modo estático de `plano-de-melhoria.md` (achados [LIDO], Etapa 0 = comandos de medição, baseline com tempo por camada Postgres/PostgREST/Next).
2. **Provar:** `EXPLAIN (ANALYZE, BUFFERS)` com volume realista e **com o papel e as claims reais** (senão a RLS não entra no plano). Em RPC plpgsql o `EXPLAIN` mostra só a chamada: use `auto_explain` com `log_nested_statements` ou extraia a query do `RETURN QUERY`.
3. **Classificar** pelos 12 padrões da spec (seq scan, índice errado, FK sem índice, RLS por linha, OFFSET, count exato, embeds, `select=*`, N+1, `ILIKE`, estatística velha, conexões).
4. **Propor:** SQL exato, plano antes/depois, custo (tamanho do índice, escrita), rollback. Índices em tabela grande com `CREATE INDEX CONCURRENTLY` (fora de transação). Registrar o veredito de cache da consulta.
5. **Plano** de `plano-de-melhoria.md`; **mostrar e esperar aprovação**. Migration vai no plugin dono da tabela (skill `criar-plugin`); ajuste pontual vai em `db/extras/` do **projeto consumidor**. `CONCURRENTLY` não roda em transação: confira o runner de migrations e, se preciso, aplique manualmente via `psql`. RPC grande com CTE `MATERIALIZED` que enriquece tudo antes do `LIMIT` é mudança estrutural: só por último, com teste de equivalência (inclusive `setseed`).

## Prudência (aprovação explícita)

`DROP`, `TRUNCATE`, `VACUUM FULL`, `REINDEX` sem `CONCURRENTLY`, `ALTER TABLE` que reescreve tabela grande, config do Postgres/PostgREST, reescrever política RLS, `EXPLAIN ANALYZE` de escrita em produção (executa de verdade: usar transação com `ROLLBACK`).

## Erros comuns

| Erro | Correção |
| ---- | -------- |
| Medir em banco vazio | Volume realista |
| `EXPLAIN` sem o papel do usuário | `SET ROLE` + claims |
| Índice "por via das dúvidas" | Só com consulta real que o use |
| Remover índice por intuição | Evidência de `idx_scan = 0` por período longo + aprovação |
