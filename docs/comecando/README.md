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
# pré-requisitos: Node >= 20, Git e Docker Desktop rodando
mkdir meu-app && cd meu-app && git init
git submodule add -b develop https://github.com/zherro/kizuna-core.git kizuna-core
cp kizuna-core/starter/kizuna.plugins.json kizuna-core/starter/kizuna.config.json kizuna-core/starter/.env.example .

node kizuna-core/cli install --yes              # casca + Dockerfile + docker-compose.db.yml + npm install
cp .env.example .env                            # PGRST_JWT_SECRET (gerar abaixo) + trocar a senha nos 2 lugares
#   gerar o secret: node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))"
docker compose -f docker-compose.db.yml up -d --wait   # Postgres :5432 + PostgREST :3001 (portas: DB_PORT/PGRST_PORT)
node kizuna-core/cli db install                 # schema core + plugins (lê DATABASE_URL do .env). Só em banco VAZIO.

npm run dev                                     # http://localhost:3000/registre-se → 1º usuário vira root
node kizuna-core/cli db run kizuna-core/plugins/pages/0002_pages_seed.sql   # páginas sobre/termos sob o root
node kizuna-core/cli token service              # opcional → POSTGREST_SERVICE_TOKEN no .env (só servidor)
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

* **managed** (proxy, rotas de API, login, páginas por cidade, anúncio, painel, IA — a casca
  genérica): `update` faz fast-forward se você não editou;
  senão mostra o diff.
* **seed** (layout, componentes da home, painel, `globals.css`): se você **não mexeu**, o `update` aplica a versão nova sozinho (hash em `kizuna.lock`); se **customizou**, não toca e lista no fim da saída. `--reseed "<paths>"` sobrescreve esses; `--reseed all` não atropela customizados.
* **install** (imagens/ícones, artes de login/cadastro, páginas de conteúdo como sobre/termos/
  privacidade e a home `app/page.tsx`): copiados só quando faltam (`install` ou `update`). Nem
  `--reseed all` nem `install --force` sobrescrevem; para pegar a versão do core, apague o
  arquivo e rode `update`.
* **Recomeçar do zero** (se só editou o `.env`): apague `src`, `package.json`, …, `kizuna.lock` e
  rode `cli install --force`.

## Outros comandos úteis

```bash
node kizuna-core/cli plugin add <nome>     # ativa plugin depois (+ db migrate)
node kizuna-core/cli plugin list           # ativos + disponíveis
node kizuna-core/cli sync                  # empurra melhorias da SUA casca pro template (dev)
node kizuna-core/cli lock                  # marca versão como "vista" sem aplicar
```

Referência completa dos comandos, do `kizuna.lock` e das estratégias managed/seed/install/merge:
[CLI](cli.md).
