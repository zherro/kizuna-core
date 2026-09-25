---
description: Estrutura, convenções e checklist para escrever e manter a documentação do kizuna-core.
---

# Escrevendo a documentação

A pasta `docs/` é publicada no **GitBook** via Git Sync. A configuração está em `.gitbook.yaml`
(raiz do repositório): `root: ./docs/`, página inicial `README.md`, sumário `SUMMARY.md`.

## Estrutura

```
docs/
├── README.md            página inicial (índice)
├── SUMMARY.md           navegação lateral do GitBook — toda página precisa estar aqui
├── comecando/           instalação e CLI
├── arquitetura/         layout, API/PostgREST, auth, schemas, utils
├── interface/           componentes, screen engine, wizard
├── servicos/            storage, e-mail, IA
├── plugins/             plugins de banco
└── manutencao/          hardening, backlog, esta página
```

* Cada seção é uma **pasta** com um `README.md` (página de abertura da seção) e uma página por
  assunto.
* Nomes de arquivo em **minúsculas, kebab-case, sem acento** (`screen-engine.md`, `todo-ai.md`).
* Uma página nova só aparece no GitBook se for adicionada ao `SUMMARY.md`.

## Convenções de escrita

* **Idioma:** português. Páginas antigas em inglês podem continuar assim até serem revisadas —
  ao reescrever uma seção inteira, traduza.
* **Um `# Título` por página**, na primeira linha de conteúdo. Subtítulos com `##` / `###`.
* **Frontmatter `description`** (uma frase) nas páginas novas — o GitBook usa como subtítulo:

  ```markdown
  ---
  description: O que esta página cobre, em uma frase.
  ---
  ```
* **Links internos são relativos e clicáveis**: `[Auth](../arquitetura/auth.md)`. Nada de
  caminho em crase para outra página da doc — no GitBook isso não vira link.
* Arquivos de código são citados **em crase**, relativos à raiz do core (`src/server/auth-handlers.ts`)
  ou pelo alias (`@kizuna/core/server`). Eles não são links (ficam fora de `docs/`).
* Avisos com os blocos do GitBook:

  ```markdown
  {% hint style="warning" %}
  Texto do aviso.
  {% endhint %}
  ```

  Estilos: `info`, `success`, `warning`, `danger`.
* Exemplos de código sempre com a linguagem no fence (` ```ts `, ` ```bash `, ` ```sql `).
* Documente o **porquê** e as armadilhas, não só a assinatura — a assinatura exata está no código.

## Mover ou renomear uma página

Código, comentários, skills (`.claude/skills/*`) e o `STATUS.md` referenciam a doc por caminho
(`docs/arquitetura/auth.md`). Ao mover um arquivo:

1. `git mv` (preserva o histórico).
2. Atualize o `SUMMARY.md`.
3. Procure o caminho antigo no repositório inteiro (`grep -rn "docs/<antigo>"`) e corrija.

## Checklist

- [ ] Arquivo na pasta da seção certa, nome kebab-case.
- [ ] Entrada no `SUMMARY.md` (e na tabela do `README.md` da seção).
- [ ] `description` no frontmatter.
- [ ] Links internos relativos e funcionando.
- [ ] Referências ao caminho antigo atualizadas (se moveu algo).
