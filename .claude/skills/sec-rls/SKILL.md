---
name: sec-rls
description: Use quando for auditar RLS, políticas, grants ou funções SECURITY DEFINER das tabelas, revisar a segurança de um plugin/tabela nova, ou investigar se um papel (anon, auth_user) ou outro tenant enxerga ou altera o que não deveria.
---

# Auditoria de RLS

## Overview

O app fala com o banco por PostgREST puro: a RLS é a última barreira. Esta skill inventaria o banco, verifica regras por tabela e **prova por teste** com papéis e tenants diferentes. O diagnóstico só lê; correção é migration revisada e aprovada.

Spec: `kizuna-core/docs/analise/seguranca-rls.md`. Contexto: `docs/arquitetura/auth.md`, `docs/manutencao/avaliacao-seguranca.md`.

## Quando usar

- Tabela/plugin novo ou alterado, revisão pré-produção, suspeita de vazamento entre usuários/tenants.
- Não usar para performance de consulta (`perf-sql`).

## Passos

1. **Inventário** (SQL da spec): RLS ligada/forçada, políticas, grants por papel, funções `SECURITY DEFINER` e `search_path`. Cruzar com as migrations (`sql/`, `plugins/*/`); divergência é achado.
2. **Verificar** as 23 regras da spec por tabela e por função (RLS em tabela exposta, `WITH CHECK`, isolamento por `tenant_id` — `has_perm` sozinho não isola —, grants mínimos, **INSERT/UPDATE direto contornando a RPC**, colunas imutáveis, identificador exposto a `anon`, `SECURITY DEFINER` com `search_path` + `pg_temp` e `EXECUTE` revogado de `PUBLIC`, tabelas filhas, views, arquivos).
   **Rotule cada achado:** [PROVADO] / [LIDO] / [NÃO VERIFICÁVEL]. Sem banco acessível, entregue inventário + testes a rodar, tudo [LIDO]; nunca "provado".
3. **Testar** em banco de teste, nunca produção: `anon`, dono A, outro dono B, outro tenant C, moderador. Tentar ler/inserir/atualizar/apagar linha alheia e trocar `tenant_id`. Testar também via PostgREST com e sem token.
4. **Relatório:** tabela por tabela + achados com evidência, cenário de abuso, correção (SQL) e teste que a comprova. Montar o plano na **variante de segurança** de `plano-de-melhoria.md`, Críticos primeiro; decisões de desenho (moderador global? campo público? RPC definer ou invoker?) viram perguntas abertas. **Esperar aprovação**, por etapa ou por item.

## Prudência

Nunca `ALTER POLICY` direto em produção. Endurecer pode quebrar fluxo legítimo: cada correção vem com teste do fluxo. Não imprimir dados reais nem segredos. Mudança de política revalida custo com `perf-sql` (índice nas colunas da política).

## Erros comuns

| Erro | Correção |
| ---- | -------- |
| Concluir só lendo a política | Provar com teste por papel |
| Testar como dono/superusuário | Dono ignora RLS: usar `SET ROLE` |
| `FOR ALL` sem `WITH CHECK` | Adicionar `WITH CHECK` |
| Corrigir sem rodar o fluxo legítimo | Testar a tela/rota que usa a tabela |
