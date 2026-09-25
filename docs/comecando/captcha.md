---
description: Ativar o Cloudflare Turnstile no login e no cadastro só com variáveis de ambiente.
---

# Captcha (Cloudflare Turnstile)

O login (`/login`) e o cadastro (`/registre-se`) já vêm com suporte a
[Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/). Não há código para escrever:
o captcha **liga sozinho** quando as chaves estão nas variáveis de ambiente.

| Peça                         | Arquivo                                                         |
| ---------------------------- | --------------------------------------------------------------- |
| Verificação no servidor      | `src/server/captcha.ts` (`isCaptchaEnabled`, `verifyCaptcha`)   |
| Uso no login e cadastro      | `src/server/auth-handlers.ts`                                   |
| Widget                       | `src/client/components/captcha/turnstile-widget.tsx`            |
| Telas                        | `src/client/components/{login,register}-page.tsx`               |

## Variáveis

| Variável                         | Onde é lida | Função                                                  |
| -------------------------------- | ----------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | client      | Renderiza o widget. **Embutida no build.**              |
| `TURNSTILE_SECRET_KEY`           | server      | Valida o token na API `siteverify` da Cloudflare.       |
| `AUTH_CAPTCHA_ENABLED`           | server      | Opcional. `"false"` desliga mesmo com as chaves.        |

Regra: **habilitado ⟺ as duas chaves presentes E `AUTH_CAPTCHA_ENABLED !== "false"`**. Sem as
chaves, o captcha não existe (nem widget, nem verificação).

## Passo a passo

1. No painel da Cloudflare → **Turnstile** → **Add site**. Informe o domínio do app (e
   `localhost` se quiser testar em dev). Modo **Managed** é o recomendado.
2. Copie a **Site Key** e a **Secret Key** para o `.env`:

   ```bash
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA...
   TURNSTILE_SECRET_KEY=0x4AAAAAAA...
   # AUTH_CAPTCHA_ENABLED=false   # desliga temporariamente
   ```

3. Em produção (Dokploy/Docker), cadastre as mesmas variáveis no ambiente do deploy. O
   `Dockerfile` e o `docker-compose.yml` do template já repassam `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   como build arg.
4. **Rebuild** (`npm run build` ou redeploy). Reiniciar o container não basta.

{% hint style="warning" %}
`NEXT_PUBLIC_*` é substituída no bundle **em tempo de build**. Se você adicionar ou trocar a Site
Key sem rebuildar, o widget não aparece (ou usa a chave antiga), e o servidor vai recusar o login
com `captcha_failed` / `missing`.
{% endhint %}

## Como se comporta

* Com o captcha ativo, o botão de enviar fica desabilitado até o Turnstile devolver um token.
  Depois de um erro, o token é descartado e o widget pede um novo.
* O servidor responde **400** `captcha_failed` com `details`:
  `missing` (sem token), `invalid` (Cloudflare recusou) ou `config` (sem secret).
  Cada recusa gera um `console.warn` com `[auth.login]` ou `[auth.register]`.
* **Fail-open:** se a Cloudflare der erro de rede ou demorar mais de 5 s, a requisição **passa**
  (com `console.warn('[captcha] ...')`). Instabilidade do Turnstile não derruba o login; o
  lockout por tentativas continua valendo. Veja [Hardening](../manutencao/hardening.md).

## Testar em dev

A Cloudflare publica
[chaves de teste](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) que
sempre passam ou sempre falham, e que funcionam em `localhost` sem cadastrar domínio. Use-as
para validar os dois caminhos antes de colocar as chaves reais.
