---
description: Spec da skill code-cleanup — limpar código morto e duplicado e manter o design em camadas do core, com segurança.
---

# Design de código e limpeza

Spec da skill **`code-cleanup`**. Objetivo: menos código para carregar, manter e auditar — o que
também reduz bundle ([Next.js](nextjs-performance.md)) e superfície de ataque.

## Quando dispara

"limpar código", "tem coisa sem uso", "refatorar", "simplificar", "bundle grande", "código
duplicado", depois de uma feature grande ou de remover um plugin.

## Passo 1 — Levantar candidatos (somente leitura)

| Alvo | Como achar |
| ---- | ---------- |
| Export/arquivo sem uso | análise estática (ferramenta de código morto do projeto; skill `repowise:dead-code`) e busca por referências |
| Dependência não usada ou duplicada | `package.json` vs. imports reais; versões duplicadas no lockfile |
| Duplicação | blocos quase iguais em componentes/handlers; helpers repetidos que já existem em `lib/*` |
| Componente de projeto que deveria estar no core (ou o contrário) | regra da skill `criar-componente-core` |
| Arquivos enormes / funções com muitas responsabilidades | tamanho, complexidade, muitos `if` por tipo |
| Camada violada | UI falando direto com banco; lógica de negócio dentro de componente; página com regra que cabe em `server/` |
| Config e SQL obsoletos | chaves de `kizuna.config.json` sem leitor, `db/extras/*` já aplicados e sem função, migrations duplicadas |
| `TODO`/`FIXME` e código comentado | busca textual |

### O que é "público" no core

O `package.json#exports` **não** é a fronteira: o projeto consumidor importa por path via alias
(`@kizuna/core/server/ai/gate`, `@kizuna/core/client/components/...`). Considere público tudo que
aparece em `STATUS.md`, na `docs/`, em skills (`.claude/skills/`), em `template/` ou no manifest, ou
que o consumidor importa por path. E **no core, "sem uso no starter" nunca basta para Alta**: o
starter usa só parte do core por desenho.

Como levantar sem depender de ferramenta: usar `repowise:dead-code` se disponível; senão, um
script de grafo de imports que varre core + consumidor + template + testes e resolve imports
relativos e o alias. Excluir `.superpowers/`, `.agents/` e briefs antigos da busca textual (não
são evidência de uso). Cobrir também export morto **dentro** de arquivo usado, em passada separada.

## Passo 2 — Classificar por confiança

* **Alta:** nenhum uso no repo **e** não citado em `STATUS.md`/docs/skills/template **e** não
  carregado por convenção (rotas do App Router, `kizuna.manifest.json`, registro de plugin,
  referência por string/config) **e** `tsc` não acusa sombreamento (arquivo `x.ts` ao lado de
  pasta `x/`). Num repositório de framework, é comum o resultado ser **zero alta** — isso é um
  resultado válido.
* **Média:** zero uso em código e **sem nenhuma referência** em lugar algum (nem doc), ou usado só
  por teste/outro candidato, ou marcado `@deprecated` (remoção exige bump e nota no `STATUS.md`).
* **Baixa:** zero uso em código, mas **documentado** ou listado no `STATUS.md`/skill (API
  pública que o consumidor usa por path), barrels, recursos de plugin, opt-in via CLI.

Só **alta** entra direto no plano. Média vira pergunta (com a evidência); baixa não se toca.
Tabela de saída: `candidato | confiança | evidência | ação proposta`.

## Princípios de design a verificar

1. **Camadas do core:** `types` → `server` (dados, auth) → `client` (UI/hooks). Cliente não importa
   código de servidor; servidor não importa componente.
2. **Core é genérico, projeto é específico:** nada de regra de negócio de um projeto no core
   (skill `padrao-de-projeto`).
3. **Config sobre código:** variação de comportamento por `ResourceConfig`/`ScreenConfig`, não por
   cópia de componente.
4. **Uma fonte de verdade** por regra (permissão, validação, formatação).
5. **Funções pequenas e nomes que dizem a intenção;** extrair só quando houver segundo uso
   real — não criar abstração para um caso.
6. **API pública estável:** exports listados em `STATUS.md` só mudam com bump de versão e nota.

## Regras de proposta

* Uma remoção/refatoração por etapa, cada uma com: o que sai, evidência de não-uso, como
  verificar (type-check, testes, build) e rollback (`git revert` da etapa).
* **Comportamento não muda** em refatoração. Se precisar mudar, vira outra etapa.
* Antes e depois: `type-check`, testes e `next build` passam; tamanho do bundle da rota registrado.
* Cada etapa vira um commit isolado (quando o usuário pedir commit).

## Prudência

* Não apagar o que for confiança Média/Baixa sem aprovação.
* Não remover exports públicos do core, migrations já aplicadas, nem arquivos referenciados por
  `kizuna.lock`/manifest.
* Não "limpar" estilo/formatação de arquivos que a tarefa não toca (ruído no diff).
* Remover dependência: conferir se não é peer do core nem usada por script/CLI.

## Saída da skill

Lista de candidatos com confiança e evidência, ganho estimado (linhas, KB de bundle, dependências),
e o [plano em etapas](plano-de-melhoria.md). Depois da aplicação: tabela antes/depois.
