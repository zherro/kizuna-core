---
description: Serviços server-side do core — arquivos, e-mail e IA.
---

# Serviços

Serviços server-only expostos por `@kizuna/core/server/*`. Cada um tem uma implementação padrão
no core e deixa o conteúdo específico (templates, prompts, rotas) no projeto consumidor.

| Página                            | Cobre                                                                                         |
| --------------------------------- | --------------------------------------------------------------------------------------------- |
| [Storage & imagens](storage.md)   | `getStorageService()`, arquivos em `bytea` (plugin `storage`), `optimizeImageBuffer`, rotas.  |
| [E-mail](email.md)                | Transporte nodemailer (`sendEmail` / `EmailTemplate`); templates ficam no app.               |
| [IA](ai.md)                       | Plugin `ai_assistant`: provider sem SDK, skills, rate-limit e degradação graciosa.           |
