---
description: Envio de e-mail por SMTP (nodemailer) e configuração passo a passo para Gmail, Outlook e Zoho.
---

# E-mail

O **transporte** vive no core: `@kizuna/core/server/email` expõe `sendEmail` e
`type EmailTemplate` (`src/server/email/`). As **templates** (a copy de cada e-mail) são funções
puras `(input) => EmailTemplate`. A exceção é o e-mail de
[recuperar senha](../comecando/recuperar-senha.md), que já traz um template padrão que pode ser
sobrescrito.

## Uso

```ts
import { sendEmail, type EmailTemplate } from '@kizuna/core/server/email';

const buildWelcome = (name: string): EmailTemplate => ({
  subject: 'Bem-vindo!',
  text: `Olá, ${name}!`,
  html: `<p>Olá, <strong>${name}</strong>!</p>`,
});

await sendEmail({ to: 'user@example.com', template: buildWelcome('Ana') });
```

* O transporter do nodemailer é criado a cada chamada, sem conexão persistente.
* `sendEmail` **lança exceção** quando o SMTP não está configurado ou o envio falha. Trate com
  try/catch na rota e decida se o erro aparece para o usuário (a falha de um e-mail de
  boas-vindas não deve derrubar o cadastro).
* O subpath é separado do barrel `@kizuna/core/server` para que um projeto que não envia e-mail
  não precise do `nodemailer`. A casca já inclui o `nodemailer` porque as rotas de recuperar
  senha usam.

## Variáveis

| Variável    | Uso                                                                  |
| ----------- | -------------------------------------------------------------------- |
| `SMTP_HOST` | Servidor SMTP                                                        |
| `SMTP_PORT` | `465` = SSL direto · `587` = STARTTLS. Default `587`                 |
| `SMTP_USER` | Usuário (normalmente o e-mail completo)                              |
| `SMTP_PASS` | Senha, de preferência **senha de app** (veja cada provedor)          |
| `SMTP_FROM` | Remetente, ex.: `"Meu App <no-reply@meuapp.com.br>"`                 |

Com `SMTP_PORT=465` a conexão já abre criptografada (`secure: true`). Com qualquer outra porta,
ela começa em texto e sobe para TLS via STARTTLS. Sem `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`, o app
roda normalmente, mas os envios falham.

{% hint style="warning" %}
**`SMTP_FROM` precisa ser o próprio e-mail da conta ou um alias verificado nela.** Gmail,
Outlook e Zoho recusam (ou reescrevem) um remetente que você não comprovou ser seu.
{% endhint %}

## Gmail / Google Workspace

1. Ative a **Verificação em duas etapas** na conta Google (Conta Google → Segurança).
2. Gere uma **senha de app**: Conta Google → Segurança → *Senhas de app* (ou acesse
   `myaccount.google.com/apppasswords`). Dê um nome como "Kizuna" e copie os 16 caracteres,
   **sem os espaços**.
3. Configure:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=voce@gmail.com
SMTP_PASS=abcdefghijklmnop          # senha de app, não a senha da conta
SMTP_FROM="Meu App <voce@gmail.com>"
```

* No **Google Workspace** (domínio próprio), o admin pode ter bloqueado senhas de app. Nesse caso,
  libere em Admin → Segurança, ou use o *SMTP relay* do Workspace (`smtp-relay.gmail.com`).
* Para enviar como outro endereço, cadastre-o em Gmail → Configurações → Contas → *Enviar e-mail
  como*.
* Há limites diários de envio (algumas centenas por dia no Gmail gratuito e mais no Workspace).
  Para volume, use um serviço transacional.

## Outlook / Microsoft 365

{% hint style="danger" %}
A Microsoft está **desligando a autenticação básica (usuário + senha) no SMTP**, tanto no
Exchange Online (Microsoft 365) quanto nas contas pessoais Outlook.com/Hotmail, e passando a
exigir OAuth2. O `sendEmail` do core hoje só suporta usuário e senha. Antes de adotar, confira o
status atual na documentação da Microsoft ("SMTP AUTH" / "Basic authentication deprecation"). Se
a sua conta não aceitar mais, use Gmail, Zoho ou um serviço transacional.
{% endhint %}

**Microsoft 365 (conta de trabalho/escola, domínio próprio):**

1. No Microsoft 365 admin center → Usuários → a caixa que vai enviar → *Email* → *Gerenciar apps
   de email* → marque **SMTP autenticado**. O tenant também precisa permitir SMTP AUTH.
2. Se a conta usa MFA, gere uma senha de app (quando a política permitir).
3. Configure:

```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587                       # STARTTLS (o Microsoft 365 não usa 465)
SMTP_USER=no-reply@suaempresa.com.br
SMTP_PASS=senha-ou-senha-de-app
SMTP_FROM="Meu App <no-reply@suaempresa.com.br>"
```

**Outlook.com / Hotmail (conta pessoal):**

```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=voce@outlook.com
SMTP_PASS=senha-de-app               # conta com verificação em duas etapas
SMTP_FROM="Meu App <voce@outlook.com>"
```

## Zoho Mail

1. Em Zoho Mail → Configurações → *Contas de e-mail*, confirme que **SMTP está habilitado** para
   a conta.
2. Se a conta usa autenticação em dois fatores, gere uma **senha específica de aplicativo** em
   `accounts.zoho.com` → Segurança → *Senhas específicas de aplicativo*.
3. Escolha o host conforme o tipo de conta e o **data center** (é o domínio que aparece quando
   você acessa o Zoho Mail):

| Conta                                   | `.com` (EUA)       | `.eu`             | `.in`             | `.com.au`             |
| --------------------------------------- | ------------------ | ----------------- | ----------------- | --------------------- |
| Pessoal (`@zohomail.com`)               | `smtp.zoho.com`    | `smtp.zoho.eu`    | `smtp.zoho.in`    | `smtp.zoho.com.au`    |
| Organização (domínio próprio)           | `smtppro.zoho.com` | `smtppro.zoho.eu` | `smtppro.zoho.in` | `smtppro.zoho.com.au` |

```bash
SMTP_HOST=smtppro.zoho.com
SMTP_PORT=465                        # ou 587 (STARTTLS)
SMTP_USER=no-reply@meuapp.com.br
SMTP_PASS=senha-ou-senha-especifica-de-app
SMTP_FROM="Meu App <no-reply@meuapp.com.br>"
```

* Host de data center errado resulta em erro de autenticação (`535`), mesmo com a senha certa.

## Entregabilidade (domínio próprio)

Para o e-mail não cair no spam, configure no DNS do domínio do `SMTP_FROM` o que o provedor
indicar:

* **SPF**, um TXT que autoriza o provedor a enviar pelo domínio (ex.: `include:_spf.google.com`,
  `include:spf.protection.outlook.com` ou `include:zoho.com`).
* **DKIM**, a chave gerada no painel do provedor.
* **DMARC**, um TXT em `_dmarc.seudominio`, por exemplo `v=DMARC1; p=none; rua=mailto:...`.

## Testar

Com o app rodando, abra `/esqueci-senha` e peça o link para um e-mail cadastrado. Se não chegar:

| Log / erro                                     | Causa provável                                                                      |
| ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| `SMTP nao configurado`                         | Falta `SMTP_HOST`, `SMTP_USER` ou `SMTP_PASS`                                        |
| `535 Authentication failed` / `Invalid login`  | Senha da conta em vez de senha de app, SMTP desabilitado na conta ou host de região errado (Zoho) |
| `SmtpClientAuthentication is disabled`         | SMTP AUTH desligado na caixa ou no tenant (Microsoft 365)                            |
| `ETIMEDOUT` / `ECONNREFUSED`                   | Porta bloqueada pelo provedor de hospedagem. Troque 465 por 587 ou vice-versa         |
| `wrong version number` / SSL                   | Porta e modo trocados: 465 = SSL, 587 = STARTTLS                                     |
| E-mail chega com "enviado em nome de" ou no spam | `SMTP_FROM` diferente da conta, ou faltam SPF/DKIM                                 |
