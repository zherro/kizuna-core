# Email

> **Status:** o **transporte** vive no core — `@kizuna/core/server` → `sendEmail` + `type EmailTemplate`
> (`src/server/email/`). As **templates** (código de cada e-mail — verificação, boas-vindas, …) são
> copy/branding do projeto consumidor e ficam nele, como funções puras `(input) => EmailTemplate`.

## Pattern

Nodemailer, transporter created per call (no persistent connection). One `sendEmail` function
takes a recipient + a pre-built template object:

```ts
const { messageId } = await sendEmail({ to: 'user@example.com', template: buildXxxTemplate({ ... }) });
```

```ts
type EmailTemplate = { subject: string; text: string; html: string };
```

A template is a pure builder function `(input) => EmailTemplate` — no I/O. Add a new one by
adding a builder and calling `sendEmail` from the relevant route.

`sendEmail` throws on SMTP failure — wrap in try/catch in the route and decide whether to surface
to the user or fail silently (e.g. a verification email failing should not 500 the signup).

## Env

| Var                       | Notes                              |
| ------------------------- | ---------------------------------- |
| `SMTP_HOST`               | server hostname                    |
| `SMTP_PORT`               | 465 (SSL) or 587 (TLS)             |
| `SMTP_USER` / `SMTP_PASS` | auth                               |
| `SMTP_FROM`               | `"App Name <noreply@example.com>"` |

All optional — with no SMTP config the app runs, email sends just fail. Project-specific templates
(verification code, welcome, …) stay documented in the consuming project.
