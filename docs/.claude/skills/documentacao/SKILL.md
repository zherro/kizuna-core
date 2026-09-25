---
name: documentacao
description: Use ao criar, mover, revisar ou atualizar qualquer página em kizuna-core/docs/ (documentação oficial publicada no GitBook) — inclusive ao documentar uma feature, plugin ou comando novo do core.
---

# Documentação oficial — kizuna-core

## Overview

`kizuna-core/docs/` é a documentação oficial, publicada no **GitBook** via Git Sync
(`.gitbook.yaml` na raiz do core: `root: ./docs/`, `README.md` = home, `SUMMARY.md` = navegação).
Guia completo para humanos: `docs/manutencao/documentacao.md`. Esta skill é o passo a passo.

## Onde cada assunto mora

| Assunto                                              | Pasta / página                         |
| ---------------------------------------------------- | -------------------------------------- |
| Instalação, atualização, fluxo de projeto            | `comecando/README.md`                  |
| `kizuna.config.json` (chave nova ou alterada)       | `comecando/configuracao.md`            |
| Comandos do CLI, `kizuna.lock`, managed/seed/merge   | `comecando/cli.md`                     |
| Layout do repo, `ResourceConfig` vs `ScreenConfig`   | `arquitetura/README.md`                |
| PostgREST, rota genérica, hooks de client, erros     | `arquitetura/api.md`                   |
| Sessão, JWT, tenant, RBAC, proxy                     | `arquitetura/auth.md`                  |
| Exemplos de `ResourceConfig`/`ScreenConfig`          | `arquitetura/schemas.md`               |
| `lib/*` e helpers compartilhados                     | `arquitetura/utils.md`                 |
| Componentes, hooks, providers, tema                  | `interface/componentes.md`             |
| Screen engine                                        | `interface/screen-engine.md`           |
| Wizard engine                                        | `interface/wizard.md`                  |
| Storage / imagens · e-mail · IA                      | `servicos/{storage,email,ai}.md`       |
| Plugins (tabela do que existe, ativação)             | `plugins/README.md`                    |
| Segurança/performance, backlog                       | `manutencao/*`                         |

Assunto novo que não cabe em nenhuma página → página nova na seção certa. Seção nova só se
nenhuma das seis servir (e aí: pasta + `README.md` + grupo `## ` no `SUMMARY.md`).

## Regras sem exceção

1. **Toda página está no `SUMMARY.md`.** Página fora dele não aparece no GitBook.
2. **Nome de arquivo:** minúsculas, kebab-case, sem acento. Abertura de seção = `README.md`.
3. **Primeira linha de conteúdo = `# Título`**, único H1. Páginas novas têm frontmatter
   `description:` de uma frase.
4. **Links entre páginas são markdown relativo** (`[Auth](../arquitetura/auth.md)`), nunca caminho
   em crase. Arquivos de código ficam em crase, relativos à raiz do core — não são links.
5. **Português** em página nova ou reescrita. Não traduza página inteira só de passagem.
6. **Mover/renomear = `git mv` + `SUMMARY.md` + grep do caminho antigo** no core inteiro
   (`src/`, `template/`, `.claude/skills/`, `STATUS.md`, `starter/`) e no `README.md` do projeto
   consumidor. Referências de fora de `docs/` usam `docs/<secao>/<pagina>.md`.
7. **Não invente API.** Antes de documentar um export/prop/flag, leia o código. Na dúvida, cite o
   arquivo em vez de afirmar.
8. **Avisos** usam `{% hint style="info|success|warning|danger" %} … {% endhint %}`.

## Passo a passo — documentar algo novo

1. Leia o código da feature e a página de destino inteira (evite duplicar seção existente).
2. Escreva: o quê → quando usar → exemplo mínimo que roda → armadilhas / "por quê".
3. Página nova: crie o arquivo, adicione ao `SUMMARY.md` e à tabela do `README.md` da seção.
4. Chave nova no `kizuna.config.json`: tabela + exemplo em `comecando/configuracao.md` e
   `_comment` em `starter/kizuna.config.json`.
5. Plugin novo: linha na tabela de `plugins/README.md` + `STATUS.md`.
6. Rode a verificação abaixo.

## Verificação (antes de dar como pronto)

Da raiz do `kizuna-core`, confirme que todo link relativo de `docs/` resolve e que toda página
está no sumário:

```bash
node -e '
const fs=require("fs"),p=require("path");const bad=[];const all=[];
(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name.startsWith("."))continue;const f=p.join(d,e.name);e.isDirectory()?w(f):f.endsWith(".md")&&all.push(f)}})("docs");
for(const f of all){for(const m of fs.readFileSync(f,"utf8").matchAll(/\]\(([^)#\s]+\.md)(#[^)]*)?\)/g)){if(!/^https?:/.test(m[1])&&!fs.existsSync(p.resolve(p.dirname(f),m[1])))bad.push(f+" -> "+m[1])}}
const sum=fs.readFileSync("docs/SUMMARY.md","utf8");
for(const f of all){const r=p.relative("docs",f).split(p.sep).join("/");if(r!=="SUMMARY.md"&&!sum.includes("("+r+")"))bad.push("fora do SUMMARY: "+r)}
console.log(bad.length?bad.join("\n"):"ok")'
```

Saída esperada: `ok`.

## Erros comuns

| Erro                                                   | Correção                                                  |
| ------------------------------------------------------ | --------------------------------------------------------- |
| Página criada mas invisível no GitBook                 | Faltou entrada no `SUMMARY.md`.                           |
| Link aparece como texto em crase                       | Trocar por `[texto](caminho-relativo.md)`.                |
| Link quebrado depois de mover arquivo                  | Grep do caminho antigo; corrigir relativos (`../`).       |
| `docs/X.md` citado de dentro de `docs/`                | Dentro de `docs/`, use caminho relativo à página atual.   |
| Doc descreve prop/flag que não existe                  | Conferir no código antes; citar o arquivo-fonte.          |
