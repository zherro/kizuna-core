---
description: Spec da skill sec-rls — auditar RLS, grants e funções SECURITY DEFINER de todas as tabelas, com testes por papel e tenant.
---

# Segurança — análise de RLS das tabelas

Spec da skill **`sec-rls`**. Como o app fala com o banco por **PostgREST puro**, a RLS do Postgres
é a última barreira: se a política estiver errada, a API entrega o dado. Esta skill audita tabela
por tabela. Complementa a [Avaliação de segurança](../manutencao/avaliacao-seguranca.md) (OWASP) e o
modelo de papéis em [Auth & permissões](../arquitetura/auth.md).

## Modelo de papéis do core

| Papel | Quem é | Observação |
| ----- | ------ | ---------- |
| `anon` | visitante sem login | só deve ler o que é público |
| `auth_user` | usuário logado (claims do JWT: usuário e tenant) | acesso filtrado por dono/tenant/permissão |
| `authenticator` | conexão do PostgREST | troca para `anon`/`auth_user`; dono das grants amplas no schema `auth` |
| dono das tabelas / superusuário | migrations, manutenção | **ignora RLS** (sem `FORCE`) |

Funções-chave nas políticas: `auth.fun_auth_user_id()`, `auth.fun_auth_current_tenant_id()`,
`auth.fun_auth__has_permission(recurso, ação)` (`sql/0006`) e `auth.fun_auth_has_perm(...)`
(`sql/0102`, lê as permissões das claims do JWT). Os plugins usam as duas; no `grep` do inventário
procure pelas duas grafias. **`has_perm` sozinho não escopa por tenant**: ver regra 6.

## Rótulos de evidência

Todo achado leva um rótulo: **[PROVADO]** (teste executado), **[LIDO]** (visto só no SQL — é
hipótese) ou **[NÃO VERIFICÁVEL]** (depende do estado real do banco: divergência entre banco e
migration, papel de conexão do app, claims montadas por tenant). Sem banco acessível, a skill entrega
o inventário e os testes **a rodar**, com tudo marcado [LIDO]/[NÃO VERIFICÁVEL]; nunca "provado".

## Passo 1 — Inventário (somente leitura)

Rodar no banco alvo e guardar o resultado no relatório:

```sql
-- Tabelas dos schemas de aplicação e estado de RLS
SELECT n.nspname, c.relname, c.relrowsecurity AS rls, c.relforcerowsecurity AS rls_force
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r','p') AND n.nspname IN ('public','auth')
ORDER BY 1,2;

-- Políticas
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies WHERE schemaname IN ('public','auth') ORDER BY 1,2,3;

-- Grants por papel
SELECT table_schema, table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE grantee IN ('anon','auth_user','authenticator','PUBLIC')
  AND table_schema IN ('public','auth') ORDER BY 1,2,3;

-- Funções SECURITY DEFINER e seu search_path
SELECT n.nspname, p.proname, p.proconfig
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prosecdef AND n.nspname IN ('public','auth') ORDER BY 1,2;
```

Cruzar com os `.sql` do repositório (`sql/`, `plugins/*/`): o que está no banco deve bater com o
que as migrations declaram. Divergência é achado.

## Passo 2 — Regras verificadas, por tabela

| # | Verificação | Severidade se falhar |
| - | ----------- | -------------------- |
| 1 | Tabela exposta (grant para `anon`/`auth_user`) **tem RLS ligada** | Crítico |
| 2 | RLS ligada **e** sem política para um papel = acesso negado; conferir se é intencional | Médio |
| 3 | Política `USING (true)` só em dado realmente público; para `anon`, restringir por status (ex.: publicado) | Alto |
| 4 | Política de escrita tem `WITH CHECK` (impede inserir/atualizar linha de outro dono/tenant) | Crítico |
| 5 | `UPDATE` não permite trocar `tenant_id`/`owner_uid`/campos de moderação (`status`, `sponsored`) — usar trigger de guarda | Alto |
| 6 | Isolamento por tenant: toda tabela multi-tenant filtra por `tenant_id` na política | Crítico |
| 7 | Grants mínimos: `anon` só `SELECT` onde necessário; nenhum `ALL`, nenhum grant a `PUBLIC` em tabela sensível | Alto |
| 8 | `DELETE` concedido só quando a política de `DELETE` existe e é restrita | Alto |
| 9 | Funções `SECURITY DEFINER`: `SET search_path` fixo, validam permissão/dono dentro do corpo, `EXECUTE` revogado de `PUBLIC` e concedido só aos papéis necessários | Crítico |
| 10 | Colunas sensíveis (hash de senha, tokens, OTP, e-mail/telefone de terceiros) inacessíveis a `anon`/`auth_user` — por grant de coluna, view ou tabela separada | Crítico |
| 11 | Views: `security_invoker` ligado (ou a view não expõe linhas além da RLS da tabela base) | Alto |
| 12 | Tabela de arquivos/bytes: leitura filtrada por finalidade/dono; sem listagem pública irrestrita | Alto |
| 13 | Política não usa dado controlável pelo usuário sem validar (ex.: claim que o cliente consegue forjar — o JWT é assinado pelo servidor, mas `request.headers` não) | Alto |
| 14 | Tabela do dono (sem `FORCE`): o app nunca conecta como dono; senão a RLS não vale | Alto |
| 15 | Tabela nova de plugin segue o padrão da skill `criar-plugin` (RLS + grants + políticas na mesma migration) | Médio |

Regras adicionais (aprendidas na revisão do plugin `reviews`):

| # | Verificação | Severidade se falhar |
| - | ----------- | -------------------- |
| 16 | **INSERT/UPDATE direto não contorna a RPC.** Se a regra de negócio (status inicial, serviço existe, não avaliar o próprio) vive numa função, a tabela exposta precisa de trigger de guarda ou o `INSERT` deve ser revogado. Testar `POST /<tabela>` direto, escolhendo `status`, `tenant_id`, `domain`, autor | Crítico |
| 17 | **Colunas imutáveis** para quem não é moderador/dono do sistema: `id`, `uid`, `created_at` (reabre janelas de edição), `tenant_id`, dono, autor, `status`, `active`. Guarda por trigger ou grant de coluna (`UPDATE (coluna, ...)`) | Alto |
| 18 | Identificador que permite rastrear pessoa (`id_customer`, `uid`) exposto a `anon`, mesmo que não seja segredo | Alto |
| 19 | Função `SECURITY DEFINER` **que escreve em tabela sem grant de escrita** precisa validar o chamador e ter `EXECUTE` revogado de `PUBLIC`/`anon`; `search_path` fixo termina com `pg_temp`. Função `INVOKER` com `GRANT` só a `auth_user` continua executável por `PUBLIC` até o `REVOKE` | Alto |
| 20 | Política baseada só em `has_perm` (claims) **não isola tenant**: exigir também `tenant_id = auth.fun_auth_current_tenant_id()`, ou registrar como decisão que a tabela/ação é cross-tenant por desenho (ex.: moderador global) | Alto |
| 21 | Tabela filha herda a visibilidade do pai: `USING (true)` em tabela de vínculo expõe linhas de itens pendentes/ocultos do pai. Texto livre gravado em snapshot público deve ser derivado do cadastro, não aceito do cliente | Médio |
| 22 | O que as funções de apoio leem (ex.: `auth.system_config` como INVOKER) tem grant/política coerente com o uso; conferir se configuração interna ficou pública | Médio |
| 23 | Mensagem de erro de cast/validação (`22P02`) vaza detalhe interno: validar entrada antes do cast | Baixo |

RLS ligada **sem política** para um papel é negação; quando for intencional (tabela só de
auditoria, só via função), registre como "intencional" e não conte como achado de severidade Média
(regra 2).

Pontos que costumam dar achado neste stack: política de leitura aberta demais em tabela de
arquivos, falta de `WITH CHECK` em `FOR ALL`, função `SECURITY DEFINER` sem `search_path`,
`INSERT` que aceita `status` de moderação definido pelo cliente, RPC chamável por `anon` que
deveria exigir login.

## Passo 3 — Teste de comportamento (prova, não leitura)

Para cada tabela exposta, em **banco de teste** (nunca produção), por papel:

```sql
BEGIN;
SET LOCAL ROLE anon;                       -- ou auth_user
SELECT set_config('request.jwt.claims',
  '{"sub":"<uid-A>","tenant_id":"<tenant-A>"}', true);
SELECT count(*) FROM public.<tabela>;      -- o que A enxerga
-- tentar: ler linha de B, inserir com owner de B, atualizar tenant_id, apagar linha de B
ROLLBACK;
```

Matriz mínima: `anon`, usuário A (dono), usuário B (outro dono, mesmo tenant), usuário C
(outro tenant), usuário com permissão de moderação. Resultado esperado documentado por tabela;
o teste que contradiz a expectativa é o achado. Testar também ao vivo via PostgREST (requisição
com e sem token) para pegar grant/exposição que o SQL direto não mostra.

Papéis extras quando a tabela usa permissões que não são de moderação: um usuário com a permissão
específica (ex.: gerenciar tags) no tenant A, tentando agir no tenant B.

## Passo 4 — Relatório

Tabela `schema.tabela | RLS | políticas | grants anon | grants auth_user | achados | severidade`,
mais lista de achados no formato: evidência (consulta e saída), cenário de abuso, correção
proposta (SQL) e teste que a comprova. Montar o plano na variante de segurança do
[Plano de melhoria](plano-de-melhoria.md#plano-de-seguranca-variante-para-sec-rls) —
correções de severidade Crítica primeiro. As decisões de desenho (moderador global? campo
público? RPC definer ou invoker?) vão em "perguntas abertas".

## Prudência

* A skill **só lê** o banco no diagnóstico. Correção de política/grant é migration revisada e
  aprovada; nada de `ALTER POLICY` direto em produção.
* Endurecer política pode **quebrar a aplicação** (tela que dependia da leitura aberta). Cada
  correção vem com o teste de que o fluxo legítimo continua funcionando.
* Não imprimir dados reais nem segredos no relatório; usar contagens e identificadores de teste.
* Mudança de política com impacto de desempenho: validar também com [SQL](sql-postgrest-tuning.md)
  (índice nas colunas da política).
* Correção entra na migration do plugin dono da tabela (`criar-plugin`) e, se alterar contrato
  de acesso, atualiza a [Avaliação de segurança](../manutencao/avaliacao-seguranca.md).
