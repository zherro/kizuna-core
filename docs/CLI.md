# CLI do kizuna (`kizuna-core/cli`)

O `kizuna-core` não é só uma biblioteca consumida por path alias — ele carrega a **casca base**
de um app Next.js (`template/`) e um **CLI Node** que a materializa num projeto, mantém projeto ↔
core alinhados e aplica o schema do banco.

Zero dependências: só builtins `node:*`, ESM (`.mjs`), Node ≥ 20.

## Invocação

```bash
node kizuna-core/cli <cmd> [opções]     # sempre funciona (o core é submódulo de todo projeto)
npm run kizuna -- <cmd> [opções]        # atalho; o script vem do package.kizuna.json
```

O CLI resolve `coreDir` a partir do próprio `import.meta.url` e `projectDir` a partir do `cwd`
(ou `--project <dir>`), então funciona com o submódulo aninhado sem configuração.

### Opções globais

| Flag              | Efeito                                                                       |
| ----------------- | ---------------------------------------------------------------------------- |
| `--project <dir>` | raiz do projeto (padrão: `cwd`)                                              |
| `--yes`           | responde "sim" a toda confirmação; `choose` pega a 1ª opção                  |
| `--no-input`      | falha em vez de perguntar (útil em CI)                                       |
| `--db-url <url>`  | URL do Postgres para `install` / `db` / `update` (senão usa `$DATABASE_URL`) |
| `--skip-db`       | `install` / `plugin add` / `update` não tocam o banco                        |
| `--no-pull`       | `update` não roda `git pull` no submódulo antes de aplicar                   |
| `--force`         | `sync` roda mesmo com o submódulo em `main`/`master`/HEAD destacado          |
| `--help`          | ajuda                                                                        |

## Comandos

| Comando             | Propósito                                                                                                                                                                                                                                                                                       | Direção        | Flags principais                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------- |
| `install`           | 1ª vez num projeto. Cria `kizuna.plugins.json` (interativo se faltar) → valida manifests (um dono por path) → materializa `template/` (managed + seed) → faz merge do `package.json` → roda `scripts/install.sh` (SQL core + plugins) → escreve `kizuna.lock` → pergunta "`npm install` agora?" | core → projeto | `--db-url`, `--skip-db`, `--yes`, `--no-input` |
| `update`            | `git -C kizuna-core pull` (read-only no submódulo) → aplica pra frente: migrations novas (core + plugins ativos, da `migrations`+1 em diante) + fast-forward / 3-way dos managed → regrava `kizuna.lock`                                                                                        | core → projeto | `--no-pull`, `--db-url`, `--skip-db`           |
| `sync`              | **Dev only.** Diff dos managed do projeto contra `template/` → empurra as mudanças escolhidas para `kizuna-core/template/` (ou `plugins/<n>/shell/`) → você commita/push no submódulo. Não toca o `kizuna.lock` do projeto — o `update` seguinte reconcilia.                                    | projeto → core | `--force`                                      |
| `plugin add <nome>` | Habilita em `kizuna.plugins.json` → valida conflito de path (aborta ANTES de persistir) → materializa só `plugins/<nome>/shell/` → aplica as migrations do plugin → atualiza `kizuna.lock`                                                                                                      | core → projeto | `--db-url`, `--skip-db`                        |
| `plugin list`       | Ativos (do `kizuna.plugins.json`) vs disponíveis (subdirs de `plugins/` com ao menos um `NNNN_*.sql`)                                                                                                                                                                                           | —              | —                                              |
| `lock`              | Marca o estado atual do submódulo como "visto": atualiza `version`/`sha`/`syncedAt` e as contagens de migration, **sem** aplicar nada nem mexer nos hashes. Silencia o warn de um bump irrelevante.                                                                                             | —              | `--yes`                                        |
| `check`             | O que o `predev` chama. Imprime o banner de divergência lock ↔ submódulo. **Sempre sai com código 0** — nunca bloqueia `npm run dev`.                                                                                                                                                           | —              | `--verbose`                                    |
| `adopt`             | Gera o `kizuna.lock` de um projeto que **já** tem a casca (retrofit). Assume que cada managed presente está sincronizado com o core; não copia nada. Deps do `package.kizuna.json` que o projeto já tem com valor idêntico entram em `ownedKeys`.                                               | —              | —                                              |
| `db install`        | Wrapper sobre `scripts/install.sh`: aplica SQL do core + de todos os plugins ativos. Idempotente (instalador do zero, não histórico de migração).                                                                                                                                               | —              | `--db-url`                                     |
| `db migrate`        | Aplica só as migrations pendentes por plugin (+ core) a partir das contagens no `kizuna.lock`, e regrava as contagens.                                                                                                                                                                          | —              | `--db-url`                                     |

### Wiring no `package.json` do projeto (vem do `package.kizuna.json` pelo merge)

```json
"scripts": {
  "kizuna": "node kizuna-core/cli",
  "predev": "node kizuna-core/cli check",
  "dev":    "next dev"
}
```

## `kizuna.lock`

Commitado na raiz do projeto. Gerado por `install`/`adopt`, mantido por `update`/`lock`/`plugin add`/`db migrate`.
Shape real (ver `cli/lib/lockfile.mjs` → `emptyLock()`):

```json
{
  "lockVersion": 1,
  "kizunaCore": { "version": "0.5.0", "sha": "c3bdfb2…", "syncedAt": "2026-09-06T12:00:00Z" },
  "template": {
    "version": "0.5.0",
    "files": {
      "app/proxy.ts": "sha256:…",
      "app/api/resources/[resource]/route.ts": "sha256:…"
    }
  },
  "plugins": {
    "agenda": { "migrations": 2, "shellFiles": { "app/api/agenda/ufs/route.ts": "sha256:…" } },
    "storage": { "migrations": 1, "shellFiles": { "app/api/storage/files/route.ts": "sha256:…" } },
    "core": { "migrations": 25 }
  },
  "packageJson": {
    "ownedKeys": {
      "dependencies": { "jsonwebtoken": "^9.0.3" },
      "devDependencies": {},
      "scripts": { "kizuna": "node kizuna-core/cli", "predev": "node kizuna-core/cli check" }
    }
  }
}
```

Campo a campo:

| Campo                                                          | O que dirige                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lockVersion`                                                  | versão do schema do próprio lock (hoje `1`).                                                                                                                                                                                                                                                        |
| `kizunaCore.version`                                           | comparado a `kizuna-core/VERSION`: se diferente → o `check` mostra o banner (sinal humano do gate).                                                                                                                                                                                                 |
| `kizunaCore.sha`                                               | ponto de partida do `git -C kizuna-core log <sha>..HEAD --oneline` que compõe o "Mudanças:" do banner.                                                                                                                                                                                              |
| `kizunaCore.syncedAt`                                          | ISO timestamp do último `install`/`update`/`lock`. Informativo.                                                                                                                                                                                                                                     |
| `template.version`                                             | versão do core na última materialização do template; comparada à viva para o banner.                                                                                                                                                                                                                |
| `template.files["<path>"]`                                     | hash `sha256:` (EOL normalizado CRLF→LF) do managed **como o projeto o tem**. Entra no `classify(live, locked, current)`: `current === locked` → fast-forward seguro; senão → conflito 3-way.                                                                                                       |
| `plugins.<n>.shellFiles["<path>"]`                             | idem para os managed do shell de cada plugin.                                                                                                                                                                                                                                                       |
| `plugins.<n>.migrations`                                       | quantos arquivos `plugins/<n>/NNNN_*.sql` já foram aplicados; `update`/`db migrate` rodam de `N`+1 em diante.                                                                                                                                                                                       |
| `plugins.core.migrations`                                      | idem para `sql/*.sql` do core.                                                                                                                                                                                                                                                                      |
| `packageJson.ownedKeys.{dependencies,devDependencies,scripts}` | `Record<string,string>` — proveniência do merge. O que o core escreveu da última vez. No merge seguinte: se o valor atual do projeto == `ownedKeys` (core controlava) → atualiza; se difere (usuário mexeu) → mantém o do usuário e registra conflito. Nunca remove chave que o core não contribui. |

## Estratégias `managed` / `seed` / `merge`

Cada path da casca é classificado em `template/kizuna.manifest.json` (e nos
`plugins/<n>/shell/manifest.json`):

- **`managed`** — o core é o dono. `update` reaplica. Editar no projeto gera conflito no próximo
  `update`; a forma certa de mudar um managed é `sync` (empurra pro `template/`) + commit no submódulo.
- **`seed`** — copiado **uma vez**, no `install`, só se o arquivo ainda não existe. Depois é do
  usuário: `update` **nunca** reaplica um seed (mesmo se o do core mudou — ver "Limitações"). São
  os arquivos que todo projeto vai querer editar: `app/layout.tsx`, `app/page.tsx`, `tsconfig.json`,
  `next.config.ts`, `env.example`, `.gitignore`, etc.
- **`merge`** — só `package.json`, contra `template/package.kizuna.json`, campo a campo em
  `dependencies`/`devDependencies`/`scripts` pela lógica de `ownedKeys` acima.

### Algoritmo 3-way dos `managed` (`cli/lib/diff3.mjs` → `classify`)

`classify(liveHash, lockedHash, currentHash)`:

| Condição                                       | Resultado      | Ação                                             |
| ---------------------------------------------- | -------------- | ------------------------------------------------ |
| `live === locked`                              | `noop`         | core não mudou desde o lock — nada a fazer       |
| `current == null` (arquivo ausente no projeto) | `fast-forward` | copia `template/` → projeto                      |
| `current === locked`                           | `fast-forward` | projeto não editou — copia a versão nova do core |
| todos diferem                                  | `conflict`     | pergunta (`sobrescreve` / `mantém` / `ver diff`) |

Um conflito que o usuário opta por **manter** não avança o lock: `update` restaura o hash anterior
para aquele path, então o conflito reaparece no próximo `update` até ser resolvido.

## Regra de bump do `VERSION`

`kizuna-core/VERSION` é uma string semver única (hoje `0.5.0`). Suba **só** numa mudança
relevante para quem consome o core:

- uma mudança em `template/` (casca base) ou num `plugins/<n>/shell/`;
- uma migration nova de plugin ou do core (`sql/`, `plugins/<n>/NNNN_*.sql`);
- uma mudança de API pública (`src/` exportado por `@kizuna/core/*`).

Refator interno que não muda nada disso **não** bumpa. Não existe `CHANGELOG` separado:
`git -C kizuna-core log <lock.sha>..HEAD --oneline` é o changelog, e é o que o banner do `check`
mostra. `major`/`minor`/`patch` seguem semver normal (breaking / feature / fix na superfície do
consumidor).

## Fluxo — projeto novo

```bash
mkdir meu-projeto && cd meu-projeto && git init
git submodule add <url-do-kizuna-core> kizuna-core
node kizuna-core/cli install          # materializa a casca; pergunta "npm install agora?"
cp .env.example .env                  # preencher PGRST_JWT_SECRET + POSTGREST_URL
node kizuna-core/cli db install --db-url "$DATABASE_URL"
npm run dev                           # abrir /registre-se → 1º usuário vira is_root automaticamente
node kizuna-core/cli db install --db-url "$DATABASE_URL"   # re-rodar: seeds que dependem de um tenant/root
```

## Fluxo — sync bidirecional

- **Melhorou algo no projeto** que devia estar no core: `kizuna sync` (o submódulo precisa estar
  num branch de trabalho, não `main`) → escolhe os arquivos → `cd kizuna-core && git add -A &&
git commit && git push`. Bumpa o `VERSION` se a mudança for relevante (ver acima).
- **Melhorou o core** (você ou outro projeto): `git -C kizuna-core pull` + `kizuna update` no
  projeto → revisa fast-forward / conflitos → o `kizuna.lock` avança.

## Conhecido / backlog Fase A — back-references `@/` em `kizuna-core/src/`

Seis módulos do core ainda importam do espaço do **projeto consumidor** via `@/`. Um projeto só
precisa satisfazê-los **se importar aquele módulo específico do core**:

| Back-reference                         | Quem no core usa                     | Nota                                                                                            |
| -------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `@/i18n/messages`                      | `AppPreferencesProvider`             | a casca base **não** monta esse provider (é concern do plugin `account_preferences`)            |
| `@/lib/server/resources`               | rotas `resources` (`postgrest-crud`) | **semeado pelo template** (`src/lib/server/resources.ts`, seed) — já resolvido num projeto novo |
| `@/lib/server/app-preferences-config`  | telas de preferências                | só quem usa a tela de preferências                                                              |
| `@/lib/server/user-data-fields-config` | `system-config-screen`               | só quem usa essa tela                                                                           |
| `@/components/services/service-type`   | showcase de serviços                 | só quem importa esse showcase                                                                   |
| `@/types/chat`                         | componentes de chat                  | só quem usa o plugin de mensageria                                                              |

A **casca base + os 5 shells de plugin limpos** (`storage`, `location`, `pages`, `onboarding`,
`agenda`) **não** tocam nenhum desses — verificado no smoke (projeto novo, `next build` verde).
Desacoplar as 5 refs restantes é o grosso da Fase A (spec
`docs/superpowers/specs/2026-09-04-kizuna-starter-setup-design.md`).

## Limitações conhecidas

- **`update` não conta merges.** As linhas "N aplicado(s), M sem mudança" cobrem só os managed;
  um merge de `package.json` que de fato mudou deps não aparece na contagem (o merge acontece, só
  não é reportado).
- **Seed com bug não chega a projeto existente.** `update` nunca reaplica um `seed` — se um seed
  do core for corrigido, projetos que já rodaram `install` não recebem a correção via `update`.
  Re-seed opcional é um follow-up.
- **`check` "nunca falha" só é garantido em `kizuna check` puro.** O special-case que engole
  qualquer erro interno keia em `process.argv[2]`, então `kizuna --project X check` não seria
  reconhecido como `check`. O `predev` usa `kizuna check` puro, então segura na prática.
- **`tsc --noEmit` na raiz do core quebra.** `kizuna-core/tsconfig.json` tem um TS5070
  pré-existente (`resolveJsonModule` sem `moduleResolution`); um `tsc --noEmit` bare no root do
  core aborta na validação de config. Não afeta os projetos consumidores (o `template/tsconfig.json`
  exclui `kizuna-core/` do type-check — é dependência, não fonte do app). Follow-up fora desta entrega.
