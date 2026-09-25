---
description: Ativar o "Esqueci minha senha" — link de redefinição enviado por e-mail.
---

# Recuperar senha

O login traz o link **"Esqueci minha senha"**. O usuário informa o email, recebe um link
(`/redefinir-senha?token=…`) e define uma nova senha. Tudo já vem no core e na casca. Para
funcionar, você precisa de três coisas:

1. **Migration** `sql/0112_password_reset.sql` aplicada no banco.
2. **SMTP configurado**, com um passo a passo por provedor em [E-mail](../servicos/email.md).
3. **`APP_URL`** definida com a URL pública do app, usada para montar o link.

## Ativar num projeto existente

```bash
cd kizuna-core && git pull && cd ..
node kizuna-core/cli update                     # traz rotas e telas novas + dependência nodemailer
npm install
node kizuna-core/cli db migrate --db-url "..."  # aplica 0112_password_reset.sql
```

No `.env`:

```bash
APP_URL=https://meuapp.com.br        # sem barra no final
APP_NAME=Meu App                     # aparece no assunto e no corpo do e-mail
PASSWORD_RESET_TTL_MINUTES=60        # opcional (5–1440); default 60

SMTP_HOST=...                        # ver servicos/email.md
SMTP_PORT=465
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM="Meu App <no-reply@meuapp.com.br>"
```

{% hint style="warning" %}
Sem `APP_URL`, o link é montado a partir do host da requisição. Isso serve em dev, mas em
produção atrás de proxy pode gerar um link errado ou manipulável. **Defina `APP_URL` em produção.**
{% endhint %}

## O que vem pronto

| Peça                    | Onde                                                                   |
| ----------------------- | ---------------------------------------------------------------------- |
| Link no login           | `LoginPageContent`, prop `forgotPasswordHref` (`null` esconde)         |
| Tela "Esqueci a senha"  | `/esqueci-senha` → `ForgotPasswordPageContent` (seed)                  |
| Tela "Nova senha"       | `/redefinir-senha` → `ResetPasswordPageContent` (seed, em `<Suspense>`) |
| API                     | `POST /api/auth/forgot-password` e `POST /api/auth/reset-password` (managed) |
| Handlers                | `@kizuna/core/server/password-reset`                                   |
| Banco                   | `auth.password_reset_tokens` + 2 RPCs em `sql/0112_password_reset.sql` |

## Personalizar o e-mail

O template padrão é `buildPasswordResetEmail`. Para usar a copy e a marca do projeto, passe
`buildEmail` na rota (que é *managed*: se você editar, o `update` mostra o diff em vez de
sobrescrever):

```ts
// src/app/api/auth/forgot-password/route.ts
import { pgrstRpc } from '@kizuna/core/server';
import { createForgotPasswordHandler } from '@kizuna/core/server/password-reset';

export const runtime = 'nodejs';

export const POST = createForgotPasswordHandler(pgrstRpc, {
  expiresInMinutes: 30,
  buildEmail: ({ resetUrl, expiresInMinutes, appName }) => ({
    subject: `${appName}: sua nova senha`,
    text: `Crie sua nova senha (válido por ${expiresInMinutes} min): ${resetUrl}`,
    html: `<p><a href="${resetUrl}">Criar nova senha</a></p>`,
  }),
});
```

## Segurança

* **Sem enumeração:** a resposta é a mesma exista ou não a conta. Contas inativas não recebem
  e-mail.
* **Token:** 32 bytes aleatórios. O banco guarda só o **SHA-256**, então vazar a tabela não
  permite resetar ninguém. Cada token é de uso único e expira. Um pedido novo invalida os
  anteriores, e trocar a senha invalida todos os tokens pendentes.
* **Só o servidor chama as RPCs:** elas exigem o claim `purpose: "password_reset"` num JWT
  assinado com `PGRST_JWT_SECRET`. Um cliente que chama o PostgREST direto recebe `42501`.
* **Throttle:** usa o mesmo mecanismo em memória do [lockout de login](../arquitetura/auth.md),
  por email e por IP (no 5º pedido seguido bloqueia 1 min, e escala). Tentativas de token
  inválido também contam por IP.
* **Captcha:** se o [Turnstile](captcha.md) estiver ativo, a tela de pedido também exige o
  captcha.
* A sessão atual do usuário **não** é derrubada ao trocar a senha, porque o JWT expira sozinho
  (7 dias).

## Erros comuns

| Sintoma                                                    | Causa                                                                                         |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| "Não foi possível enviar o email agora" (503)              | SMTP ausente ou recusado. Veja o log `[auth.forgot] email_failed` e [E-mail](../servicos/email.md). |
| "Não foi possível processar o pedido" (500) + `rpc_failed` | Migration `0112` não aplicada, ou o PostgREST sem reload do schema.                           |
| Link aponta para `localhost` em produção                   | Falta `APP_URL`.                                                                              |
| "Link inválido ou expirado"                                | Token usado, vencido, ou um pedido mais novo o invalidou.                                     |
