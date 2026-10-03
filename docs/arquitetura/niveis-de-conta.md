---
description: Níveis de conta progressivos. Entrar é fácil, e cada ação sensível pede um nível mais alto.
---

# Níveis de conta

A ideia é a mesma do iFood e do Uber: **entrar é sem burocracia** (Google, telefone, email) e
nada é verificado no cadastro. Quando a pessoa tenta algo que exige confiança (avaliar, anunciar,
vender), o sistema pede só o que falta para aquele nível.

## Onde fica cada coisa

| O quê | Onde | Por quê |
| --- | --- | --- |
| Quais níveis existem: título, descrição, ordem, requisito | `kizuna.config.json` → `accountLevels` | Rótulo e ordem mudam por projeto, sem código. |
| O que cada **requisito** exige | `kizuna-core/src/shared/account-levels` (`REQUIREMENTS`) | Regra de segurança não deve morar em JSON editável. |
| O que cada nível **libera** | projeto: `src/lib/account-levels.ts` (`CAPABILITIES`) | Mapa único, fácil de manter. |
| Fatos da conta (verificações, perfil) | `auth.fun_auth__account_facts()` (`sql/0115`) | Lidos do banco a cada consulta. |

O nível **não fica no JWT**. Ele é calculado na hora a partir do banco, então sobe assim que a
pessoa verifica o celular ou completa o perfil, sem precisar relogar.

## Config

```json
"accountLevels": {
  "levels": [
    { "key": "conta",      "level": 1, "title": "Conta criada",          "requirement": "authenticated" },
    { "key": "contato",    "level": 2, "title": "Contato verificado",    "requirement": "contact_verified", "href": "/painel/onboarding#contato" },
    { "key": "perfil",     "level": 3, "title": "Perfil completo",       "requirement": "profile_complete", "href": "/painel/minha-conta" },
    { "key": "identidade", "level": 4, "title": "Identidade verificada", "requirement": "identity_verified", "enabled": false }
  ],
  "contactVerification": { "email": true, "phone": false },
  "missingLinks": { "avatar": "/painel/minha-conta#foto" }
}
```

| Campo | Efeito |
| --- | --- |
| `key` | Nome usado no mapa de capacidades. Renumerar `level` não quebra o mapa. |
| `level` | 1..N. O nível é **sequencial**: a pessoa está no N só se cumpre todos de 1 a N. O visitante é 0 (implícito). |
| `title`, `description` | Texto mostrado na escada e no modal "Evolua sua conta". |
| `onboardingOrder` | Ordem na tela `/painel/onboarding`. |
| `profileOrder` | Ordem no resumo da conta: `<AccountLevelsPanel order="profile" />`. |
| `requirement` | `authenticated`, `contact_verified` (os contatos ligados em `contactVerification`), `profile_complete` (nome, foto, documento válido se exigido, CEP, estado e cidade), `listing_published` (ao menos um anúncio ativo) ou `identity_verified`. |
| `enabled: false` | Nível "em breve": aparece na escada, mas ninguém alcança. |
| `href` | Para onde o botão "Completar" leva. |

Campos no nível de `accountLevels` (fora de `levels`):

| Campo | Padrão | Efeito |
| --- | --- | --- |
| `contactVerification` | `{ "email": true, "phone": true }` | Quais contatos o requisito `contact_verified` exige. `false` tira a verificação da lista do que falta (o starter vem só com email). |
| `missingLinks` | ver abaixo | Para onde cada pendência leva. Sobrescreve só as chaves informadas. |

Cada pendência ("Falta: …") é um link para onde ela se resolve. Chaves e links padrão
(`DEFAULT_MISSING_LINKS`): `login` → `/login`; `email`, `phone` → `/painel/minha-conta#contato`;
`fullName`, `document` → `/painel/minha-conta#dados-pessoais`; `avatar` →
`/painel/minha-conta#foto`; `address` → `/painel/minha-conta#endereco`; `listing` →
`/painel/meus-servicos/novo`; `listingPending` → `/painel/meus-servicos`. `identity` e `comingSoon`
não têm link (aparecem como texto).

Uma config inválida (key repetida, requisito desconhecido etc.) **quebra o boot** com mensagem
clara (`parseAccountLevelsConfig`). Uma capacidade apontando para uma key que não existe também
quebra o boot (`defineCapabilities`).

## O que cada nível libera

```ts
// src/lib/account-levels.ts
export const CAPABILITIES = defineCapabilities(accountLevelsConfig, {
  like: 'conta',
  save: 'conta',
  review: 'contato',
  comment: 'contato',
  'service.create': 'perfil',
  'event.create': 'perfil',
  sell: 'identidade',
});
```

Uma ação que **não** está no mapa exige só estar logado (nível ≥ 1).

## Usando

**Servidor.** Esta é a barreira real. Em páginas, use o componente de servidor `RequireLevel`, que
renderiza o conteúdo só se o nível libera a ação e, caso contrário, mostra na mesma URL a **mesma
tela de `/painel/onboarding`** (`AccountLevelsOnboarding`), com o nível exigido destacado, em vez
de redirecionar. `/painel/onboarding` usa o mesmo componente, com os dados de
`getAccountLevelView(setup, acao)`. Exemplo real, a página de edição de serviço, que
só barra a criação (`novo`):

```tsx
import { RequireLevel, isPhoneLoginEnabled, type OtpConfig } from '@kizuna/core/server';
import cfg from '@/../kizuna.config.json';
import { accountLevelsSetup } from '@/lib/server/account-levels';

return (
  <RequireLevel
    setup={accountLevelsSetup}
    action="service.create"
    returnTo="/painel/meus-servicos/novo"
    phoneEnabled={isPhoneLoginEnabled((cfg as { otp?: OtpConfig }).otp)}
  >
    {wizard}
  </RequireLevel>
);
```

Em rotas de API, use `canDoServer(accountLevelsSetup, 'ação')`. Exemplo real: o `POST` de
`src/app/api/resources/[resource]/route.ts` barra `service.create` para o recurso `services` e
responde `403` com `{ error: 'level_required', can }`. Sem essa checagem, quem chama a API
direto contornaria a barreira da página. Se não conseguir ler
os fatos (sem sessão, erro no banco), trata a pessoa como visitante e **nega**.

## Rótulos e o que cada nível libera

`AccountLevelsSetup.labels` mapeia a ação para um texto humano (por exemplo, "Publicar anuncios"), usado na tela de bloqueio e no aviso do onboarding. `unlocksByLevel` lista, por key de
nível, o que ele libera. `GET /api/account/level` devolve também o campo `unlocks` com essa lista.

## Card no painel

`AccountLevelCard` mostra o nível atual ("Nivel N de M"), a barra de progresso com um segmento por
nível e o próximo passo. Quando o projeto usa `listing_published`, um anúncio em análise mostra
"Seu anuncio esta em analise".

| Prop            | Padrão                                 | O que faz                                                                 |
| --------------- | -------------------------------------- | ------------------------------------------------------------------------- |
| `phoneEnabled`  | —                                      | Oferece "Verificar meu celular" inline (login por telefone ligado).       |
| `initial`       | `null`                                 | Status já lido no servidor. Sem ele, o card busca no browser.             |
| `allLevelsHref` | `/painel/onboarding`                   | Link "Ver todos os niveis".                                               |
| `snoozeDays`    | `15`                                   | Dias que o card fica escondido depois que o usuário fecha.                |
| `snoozeKey`     | `kizuna:account-level-card:snoozed`    | Chave no localStorage (troque para ter dois cards independentes).         |

Comportamento:

- **Só aparece com conta incompleta.** Sem próximo nível alcançável (`status.next === null`), não
  renderiza nada.
- **Pode ser fechado.** O X grava o prazo com `snooze` (ver [Utils](utils.md)) e o card volta
  depois de `snoozeDays`. É por navegador: outro aparelho mostra de novo.
- **Não segura a página.** Sem `initial`, a consulta roda no browser e o card entra deslizando de
  cima para baixo quando os dados chegam. É o uso recomendado no painel:

```tsx
{session ? <AccountLevelCard phoneEnabled={isPhoneLoginEnabled(cfg.otp)} /> : null}
```

**Cliente.** Serve só para a experiência do usuário:

```tsx
import { LevelGateProvider, useLevelGate } from '@kizuna/core/client/components/account-levels';

const gate = useLevelGate();
<button onClick={() => gate('review', () => abrirAvaliacao())}>Avaliar</button>
```

Se o nível libera a ação, ela roda. Se não, abre o modal **"Evolua sua conta"** com só os níveis
que faltam e o que falta em cada um.

- `useAccountLevel()` devolve `{ status, allowed, refresh }`, que serve para esconder ou mostrar UI.
- O `ListBlock` aceita `createGateAction: 'service.create'`. O botão "Novo" consulta
  `/api/account/level?action=…` antes de navegar. Se o projeto não tem essa rota, o botão volta
  ao check antigo de onboarding.

**Rota:** `GET /api/account/level[?action=x]` → `{ status, allowed, can? }`, criada por
`createAccountLevelHandler(accountLevelsSetup)`.

**Tela:** `/painel/onboarding[?acao=x]` mostra a escada de níveis e destaca o nível exigido pela
ação. O nível de contato permite "Verificar meu celular" ali mesmo, quando o
[login por telefone](../comecando/login-social-telefone.md) está ligado.

## Adicionar um requisito novo

Por exemplo, a verificação de identidade com IA:

1. Adicione o id em `REQUIREMENT_IDS` e a função em `REQUIREMENTS`
   (`kizuna-core/src/shared/account-levels/index.ts`).
2. Exponha o fato em `auth.fun_auth__account_facts()` com uma migration nova. Hoje
   `identity_verified` sempre retorna `false`: é só a porta.
3. Aponte o nível na config (`"requirement": "identity_verified"`) e tire o `enabled: false`.

## Requisito `listing_published`

Usa o fato `listings`, lido pela função `public.fun_services__my_listing_counts` (migração
`plugins/services/0006_services_account_facts.sql`). Ela só é consultada quando algum nível
habilitado usa esse requisito, então projetos sem ele não pagam a consulta.

## Pendências conhecidas

- **Sem SMS real, ninguém passa do nível 1.** Com `otp.enabled: false` não há como verificar o
  celular, e `contact_verified` exige email e celular.
- **Verificação de email por senha** depende do plano 2 (ainda não implementado).
- **Verificação de email por código.** O fluxo antigo do plugin `user_data` (a rota
  `request-code` e a tela `email-verification`) está incompleto. Hoje o email conta como
  verificado quando a pessoa entra pelo Google, ou quando `user_data.email_verified` é true.
  Quem entrou com email e senha sobe para o nível 2 verificando o celular.
- **Checagem por RLS.** O nível ainda não é verificado no Postgres. As barreiras são
  `RequireLevel` nas páginas (por exemplo, `src/app/painel/meus-servicos/[serviceId]/page.tsx`) e
  `canDoServer` nas rotas de API (por exemplo, o `POST` de `src/app/api/resources/[resource]/route.ts`).
