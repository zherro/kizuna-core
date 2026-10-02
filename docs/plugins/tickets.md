---
description: Plugin tickets — chamados do usuário para a equipe, tickets automáticos do sistema (conta recriada), comentários e respostas com RLS.
---

# Plugin `tickets`

Chamados. O usuário abre um chamado de suporte e conversa com a equipe; a equipe (root, ou quem
tiver a permissão `tickets.manage`) vê todos, muda o status e responde. O sistema também abre
tickets sozinho — hoje, quando alguém **recria uma conta excluída** (ver
[Auth](../arquitetura/auth.md), "Excluir conta").

Versão atual: **1.0.0** (`plugins/tickets/0001_tickets.sql`). **Sem funções, views nem
triggers**: toda a regra está em RLS e GRANT de coluna. Tickets do sistema são gravados pelo
servidor com o token de serviço (`service_role`).

## Tabelas

| Tabela | Conteúdo |
|---|---|
| `tickets` | `type` (`support` \| `account_recreated`), `title` (3 a 160 caracteres), `description`, `status` (`open` \| `in_progress` \| `resolved`), `created_by` (NULL = sistema), `subject_user_id` / `related_user_id` (contas envolvidas), `payload jsonb`, `created_at`, `updated_at`, `resolved_at` |
| `ticket_comments` | comentários do **usuário**: `ticket_id`, `author_id`, `body`, `created_at`, `updated_at`, `deleted_at` (apagar é lógico) |
| `ticket_replies` | respostas da **equipe** e registros de troca de status: `ticket_id`, `author_id`, `kind` (`reply` \| `status_change`), `body`, `created_at`, `updated_at` |

**Por que comentários e respostas separados:** a regra "o usuário edita/apaga o próprio comentário
enquanto a equipe não respondeu depois" precisa consultar as respostas. Se elas ficassem na mesma
tabela, a política de RLS consultaria a própria tabela — o Postgres recusa (`infinite recursion
detected in policy`) e só daria para contornar com função `SECURITY DEFINER`. Em tabela própria, a
resposta da equipe já é o fato que trava a edição: atômico, garantido pelo banco, sem função.

## Quem pode o quê

| Quem | `tickets` | `ticket_comments` | `ticket_replies` |
|---|---|---|---|
| Usuário | vê e abre os **seus** (`type = 'support'`, `status = 'open'`); não edita | vê os dos seus tickets; comenta; edita/apaga os próprios **enquanto não houver resposta posterior** | vê as dos seus tickets |
| Equipe (`tickets.manage`, root sempre) | vê todos, inclusive os do sistema; muda `status` | vê todos (apagados aparecem marcados); não comenta aqui | responde; edita as próprias |
| Sistema (`service_role`) | abre tickets com `created_by` NULL | — | — |

- Só estas colunas mudam (GRANT de coluna): `tickets.status/resolved_at/updated_at`,
  `ticket_comments.body/updated_at/deleted_at`, `ticket_replies.body/updated_at`.
- Apagado não volta (a política de `UPDATE` exige `deleted_at IS NULL` na linha atual).
- O autor ainda recebe da API os **próprios** comentários apagados: no soft delete, o Postgres exige
  que a linha resultante do `UPDATE` passe na política de `SELECT`. A tela os esconde; ninguém além
  do autor e da equipe os vê.
- Mudar o status são duas escritas: `UPDATE` no ticket e uma resposta `status_change`. Não é
  atômico (não há função); a tela grava o status primeiro.

{% hint style="info" %}
A permissão `tickets.manage` é só registrada no catálogo; quem a recebe é decisão do projeto (tela
de papéis). Root sempre passa.
{% endhint %}

## Recursos e telas

- Recursos `tickets`, `ticket_comments` e `ticket_replies` (`screen-engine/resources/tickets.ts`,
  `resourceTickets`): espalhe em `src/lib/server/resources.ts` do projeto.
- Páginas do shell: `/painel/chamados` (lista — a mesma para usuário e equipe, a RLS decide),
  `/painel/chamados/novo` e `/painel/chamados/[id]` (detalhe + conversa, seletor de status para a
  equipe). Componentes em `client/components/tickets/`; as regras da tela (`comment-rules.ts`)
  espelham a RLS.
- Item de menu "Chamados" com contador de abertos: `renderItemBadge` do `PanelShellBase` com
  `OpenTicketsBadge`. Para o root, é o alerta de "conta recriada".

## Ticket `account_recreated`

Aberto no cadastro (senha ou OAuth) quando existe conta excluída com o mesmo e-mail
(`auth.users.deleted_login`). `subject_user_id` = conta nova, `related_user_id` = a última
excluída, `payload` = `{ login, deletedAt, previousDeletions }`. Cada root ativo também recebe uma
linha em `notifications` (`context_type = 'ticket'`, `context_id` = uid do ticket) via
`auth.fun_notify`. Sem o plugin instalado, nada é aberto e o cadastro segue normal.

## Verificar as RLS

`plugins/tickets/rls-check.sql` roda os cenários acima como `auth_user` (usuário e root) numa
transação com `ROLLBACK` e termina com `TUDO OK` ou `HA FALHAS`:

```bash
psql "$DATABASE_URL" -v usr=<uid usuário> -v root=<uid root> -f kizuna-core/plugins/tickets/rls-check.sql
```
