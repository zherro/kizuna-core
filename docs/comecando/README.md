---
description: Criar um projeto sobre o kizuna-core, subir o banco e manter o core atualizado.
---

# Instalação

A casca do app (rotas, layout, `package.json`…) é **materializada** por
`node kizuna-core/cli install` a partir do `kizuna-core/template/` — e daí em diante é do projeto.

{% hint style="warning" %}
`kizuna-core/` é um **submódulo**: um `git clone` normal traz a pasta vazia. Use
`--recurse-submodules` ou rode `git submodule update --init --recursive`.
{% endhint %}

## Projeto novo

```bash
git clone --recurse-submodules <repo-do-projeto> meu-app && cd meu-app

# 1. escolher os plugins em kizuna.plugins.json (ver Plugins)

node kizuna-core/cli install                    # materializa a casca + npm install
cp .env.example .env                            # preencher PGRST_JWT_SECRET + POSTGREST_URL
node kizuna-core/cli db install --db-url "postgresql://user:pass@host:5432/db"
#   Windows:  --psql "C:\Program Files\PostgreSQL\17\bin\psql.exe"
#   Docker:   --psql "docker exec -i <container> psql"

npm run dev                                     # /registre-se → 1º usuário vira root
node kizuna-core/cli db install --db-url "..."  # re-rodar: seeds que dependem de tenant
```

Depois do install, commite: `src/ package.json package-lock.json tsconfig*.json
postcss.config.mjs next.config.ts next-env.d.ts kizuna.lock`.

Plugins disponíveis e ordem de dependência: [Plugins](../plugins/README.md). Nome, tema, home,
cabeçalho, clima e wizards: [Configuração](configuracao.md). Captcha no login/cadastro:
[Captcha (Turnstile)](captcha.md). "Esqueci minha senha":
[Recuperar senha](recuperar-senha.md). Login com Google e por telefone:
[Login com Google e telefone](login-social-telefone.md). Níveis de conta progressivos:
[Níveis de conta](../arquitetura/niveis-de-conta.md).

## Atualizar o core

O `predev` roda `kizuna check` e **avisa** (não bloqueia) quando o core diverge do `kizuna.lock`.

```bash
cd kizuna-core && git pull && cd ..
node kizuna-core/cli update                                # fast-forward dos managed + migrations
node kizuna-core/cli update --reseed "src/app/layout.tsx"  # seeds que mudaram (ele lista quais)
node kizuna-core/cli db migrate --db-url "..."             # só as migrations pendentes
git add kizuna-core kizuna.lock src/ && git commit -m "chore: bump kizuna-core"
```

* **managed** (proxy, rotas de API, catch-all): `update` faz fast-forward se você não editou;
  senão mostra o diff.
* **seed** (`// EXEMPLO` — layout, home, painel, `globals.css`): nunca são tocados. `update`
  **lista** os que mudaram no core; `--reseed "<paths>"` (ou `--reseed all`) sobrescreve.
* **Recomeçar do zero** (se só editou o `.env`): apague `src`, `package.json`, …, `kizuna.lock` e
  rode `cli install --force`.

## Outros comandos úteis

```bash
node kizuna-core/cli plugin add <nome>     # ativa plugin depois (+ db migrate)
node kizuna-core/cli plugin list           # ativos + disponíveis
node kizuna-core/cli sync                  # empurra melhorias da SUA casca pro template (dev)
node kizuna-core/cli lock                  # marca versão como "vista" sem aplicar
```

Referência completa dos comandos, do `kizuna.lock` e das estratégias managed/seed/merge:
[CLI](cli.md).
