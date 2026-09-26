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
  ]
}
```

| Campo | Efeito |
| --- | --- |
| `key` | Nome usado no mapa de capacidades. Renumerar `level` não quebra o mapa. |
| `level` | 1..N. O nível é **sequencial**: a pessoa está no N só se cumpre todos de 1 a N. O visitante é 0 (implícito). |
| `title`, `description` | Texto mostrado na escada e no modal "Evolua sua conta". |
| `onboardingOrder` | Ordem na tela `/painel/onboarding`. |
| `profileOrder` | Ordem no resumo da conta: `<AccountLevelsPanel order="profile" />`. |
| `requirement` | `authenticated`, `contact_verified` (email **ou** celular verificado), `profile_complete` (nome, foto, documento válido se exigido, CEP, estado e cidade) ou `identity_verified`. |
| `enabled: false` | Nível "em breve": aparece na escada, mas ninguém alcança. |
| `href` | Para onde o botão "Completar" leva. |

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

**Servidor.** Esta é a barreira real:

```ts
import { canDoServer } from '@kizuna/core/server';
import { accountLevelsSetup } from '@/lib/server/account-levels';

if (!(await canDoServer(accountLevelsSetup, 'service.create')).allowed) {
  redirect('/painel/onboarding?acao=service.create');
}
```

Se não conseguir ler os fatos (sem sessão, erro no banco), trata a pessoa como visitante e
**nega**.

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

## Pendências conhecidas

- **Verificação de email por código.** O fluxo antigo do plugin `user_data` (a rota
  `request-code` e a tela `email-verification`) está incompleto. Hoje o email conta como
  verificado quando a pessoa entra pelo Google, ou quando `user_data.email_verified` é true.
  Quem entrou com email e senha sobe para o nível 2 verificando o celular.
- **Checagem por RLS.** O nível ainda não é verificado no Postgres. As barreiras são
  `canDoServer` nas páginas e rotas.
