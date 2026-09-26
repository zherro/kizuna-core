---
description: Ativar "Continuar com Google" e "Entrar com telefone" (código por SMS/WhatsApp).
---

# Login com Google e com telefone

Além de email e senha, o login pode oferecer:

- **Continuar com Google**: OAuth 2.0 / OpenID Connect com PKCE. Não usa biblioteca externa.
- **Entrar com telefone**: o usuário recebe um código de uso único no celular. O envio passa por
  uma porta de provedor que você pluga (WhatsApp, SMS…).

{% hint style="info" %}
**Botão sem configuração não aparece.** O formulário consulta `GET /api/auth/providers` e só
mostra os métodos configurados. Sem `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, o botão do Google
fica escondido. Sem um provedor de OTP utilizável, o botão do telefone fica escondido. Nos dois
casos as rotas respondem 404.
{% endhint %}

Nenhum dos dois exige verificação no cadastro. A pessoa entra e usa. Ações sensíveis pedem
[níveis de conta](../arquitetura/niveis-de-conta.md) mais altos.

## 1. Banco

As migrations ficam no schema `auth`:

| Migration | O que faz |
| --- | --- |
| `sql/0113_external_identities.sql` | senha opcional, `auth.user_identities`, `email_verified_at` / `phone` / `phone_verified_at` / `sessions_revoked_at` em `auth.users`, RPC `fun_auth__external_login` |
| `sql/0114_phone_otp.sql` | `auth.otp_challenges`, RPCs `fun_auth__otp_create` / `fun_auth__otp_verify` |
| `sql/0115_account_facts.sql` | RPC `fun_auth__account_facts` (usada pelos níveis de conta) |

```bash
node kizuna-core/cli db migrate --db-url "..."   # aplica só o que falta
node db/build.mjs                                # regenera db/auth.sql (base limpa)
```

## 2. Rotas (casca do projeto)

Cada rota é uma linha, no mesmo padrão de `/api/auth/login`:

| Rota | Handler |
| --- | --- |
| `GET /api/auth/providers` | `createAuthProvidersHandler({ otp: cfg.otp })` |
| `GET /api/auth/oauth/[provider]/start` | `createOAuthStartHandler()` |
| `GET /api/auth/oauth/[provider]/callback` | `createOAuthCallbackHandler(pgrstRpc, { pgrstTable })` |
| `POST /api/auth/otp/request` | `createOtpRequestHandler(pgrstRpc, { config: cfg.otp })` |
| `POST /api/auth/otp/verify` | `createOtpVerifyHandler(pgrstRpc, { config: cfg.otp })` |

O `LoginForm`, o `RegisterForm` e o `AuthModal` já mostram os botões. Não há nada a mudar na UI.

## 3. Google

1. No [Google Cloud Console](https://console.cloud.google.com/apis/credentials), crie
   **Credenciais → ID do cliente OAuth → Aplicativo da Web**.
2. Em **URIs de redirecionamento autorizados**, cadastre um por ambiente:
   - `http://localhost:3000/api/auth/oauth/google/callback`
   - `https://seusite.com.br/api/auth/oauth/google/callback`
3. Na **Tela de consentimento OAuth**, use os escopos `openid`, `email` e `profile`. Nenhum deles
   é sensível, então não há revisão do Google. Publique o app para sair do modo teste, que só
   aceita os e-mails listados como testadores.
4. No `.env`:

```bash
GOOGLE_CLIENT_ID=1234-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
APP_URL=https://seusite.com.br   # obrigatório em produção: monta o redirect_uri
```

**Como a conta é resolvida** (`auth.fun_auth__external_login`):

1. Se a identidade `(google, sub)` já é conhecida, a pessoa entra nessa conta.
2. Senão, se existe conta com o **mesmo email** e o Google diz que o email é verificado, as duas
   são **vinculadas**. O email é único no sistema.
3. Senão, uma **conta nova sem senha** é criada. Nome e foto do Google vão para `public.user_data`,
   se o plugin estiver instalado.

{% hint style="warning" %}
**Proteção contra pre-hijack.** Suponha que alguém criou email + senha com o email de outra
pessoa e nunca verificou esse email. Quando o dono real entra pelo Google, **a senha antiga é
anulada** e `sessions_revoked_at` é marcado. Um dono legítimo que tinha senha e esqueceu usa
"Esqueci minha senha" normalmente.

Limitação atual: a sessão é um JWT sem estado, com validade de 7 dias. Um JWT emitido antes da
revogação continua válido até expirar, porque `sessions_revoked_at` ainda não é checado em cada
requisição.
{% endhint %}

Depois do login, o usuário volta para a página onde estava (`returnTo`, que aceita só caminho
relativo). Uma ação pendente, como uma curtida feita antes do login, é aplicada na volta. Em caso
de erro, o usuário cai em `/login?erro=<código>` e vê uma mensagem amigável.

**Outro provedor (Apple, Facebook…):** crie um arquivo que implemente `OAuthProvider`
(`src/server/oauth/types.ts`) e registre-o em `src/server/oauth/providers.ts`. O banco já é
genérico: a coluna `provider` de `auth.user_identities` aceita qualquer provedor.

## 4. Telefone (OTP)

Bloco `otp` do `kizuna.config.json`:

```json
"otp": {
  "providers": ["log"],
  "codeLength": 6,
  "ttlSec": 300,
  "cooldownSec": 60,
  "dailyLimit": 10,
  "maxAttempts": 5
}
```

| Campo | Padrão | Efeito |
| --- | --- | --- |
| `providers` | `[]` (desligado) | Cadeia de envio. A ordem define o fallback: se o 1º falhar, tenta o 2º. |
| `codeLength` | 6 | Dígitos do código (4–8). |
| `ttlSec` | 300 | Validade do código (60–1800). |
| `cooldownSec` | 60 | Intervalo mínimo entre pedidos para o mesmo número. |
| `dailyLimit` | 10 | Máximo de códigos por número em 24h. |
| `maxAttempts` | 5 | Tentativas erradas antes de queimar o código. |

### O adaptador `log` (desenvolvimento)

`"providers": ["log"]` **não envia nada**. Ele só imprime no log do servidor o JSON que um
provedor real receberia:

```
[auth.otp] log_provider {"phone":"+5565999998888","code":"482913","expiresInSec":300,"purpose":"login","locale":"pt-BR","requestId":"..."}
```

Em dev, é só copiar o código do terminal. **Em produção o `log` é ignorado.** Com só ele na lista,
o login por telefone fica desligado e o botão some, para ninguém subir um site que "envia" código
para o log.

### Plugar um provedor real

O **texto da mensagem não fica no código**. Ele mora no gateway do provedor: template de
autenticação aprovado na Meta, template da Zenvia ou da Twilio. O adaptador só repassa os dados:

```ts
// ex.: src/lib/server/otp-whatsapp.ts no projeto
import { registerOtpProvider, type OtpProvider } from '@kizuna/core/server';

const whatsapp: OtpProvider = {
  name: 'meta-whatsapp',
  async send({ phone, code, expiresInSec, locale }) {
    // POST no gateway com o template de autenticação + variáveis {code}
    const res = await fetch('https://graph.facebook.com/...', { /* ... */ });
    return { ok: res.ok, provider: 'meta-whatsapp' };
  },
};

registerOtpProvider(whatsapp);
```

Importe esse módulo nas rotas `otp/request` e `providers`, e coloque o nome na config:
`"providers": ["meta-whatsapp", "zenvia-sms"]`.

### Regras do fluxo

- O telefone é normalizado para E.164 e **só aceita celular brasileiro**: DDD válido e 9 dígitos
  começando com 9.
- **Login:** acha a conta pelo `auth.users.phone` verificado. Se não existir, cria uma conta sem
  email e sem senha, com `login = telefone`.
- **Verificar celular** (usuário já logado, com `purpose: "verify_phone"`): liga o número à conta.
  Número que já é de outra conta retorna erro `phone_in_use`. Não há merge automático.
- **Segurança:**
  - O banco guarda só um HMAC do código, calculado com o segredo do servidor.
  - As RPCs exigem o claim `purpose = "otp"`, que só o servidor assina.
  - Há throttle por número e por IP, cooldown e teto diário, mais o Turnstile quando está ligado.
  - A resposta não revela se a conta existe.

## Esqueci a senha

Continua [por email](recuperar-senha.md). Conta criada pelo Google ou pelo telefone não tem senha.
A pessoa entra pelo mesmo método, e o próprio login serve de recuperação.
