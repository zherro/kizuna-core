---
name: code-cleanup
description: Use quando for limpar código morto ou duplicado, remover dependências sem uso, reduzir bundle por código inútil, refatorar sem mudar comportamento ou verificar se o design respeita as camadas do core.
---

# Limpeza e design de código

## Overview

Levanta candidatos a remoção/refatoração, classifica por confiança e propõe etapas pequenas e reversíveis. Comportamento não muda. Só confiança **alta** entra direto no plano.

Spec: `kizuna-core/docs/analise/code-design.md`. Plano: `plano-de-melhoria.md`. Regras de camada: skills `padrao-de-projeto` e `criar-componente-core`.

## Quando usar

- Depois de feature grande ou de remover plugin; "tem coisa sem uso?", "simplificar", "bundle grande".

## Passos

1. **Levantar (só leitura):** export/arquivo sem uso (análise estática, `repowise:dead-code`), dependências, duplicação, arquivos enormes, camada violada, config/SQL obsoletos, TODO/código comentado.
   Sem ferramenta, escreva um script de grafo de imports (core + consumidor + template + testes, resolvendo o alias `@kizuna/core/*`). Exclua `.superpowers/` e `.agents/` da busca textual.
2. **Classificar:** `package.json#exports` **não** é a fronteira pública (o consumidor faz deep-import por path). Público = `STATUS.md`, docs, skills, template/manifest, o que o consumidor importa. **"Sem uso no starter" nunca basta para Alta** no core.
   - **Alta:** zero uso, nenhuma menção em lugar algum, sem convenção de carga, `tsc` sem sombreamento. Zero Alta é resultado válido.
   - **Média:** zero uso e sem nenhuma referência (nem doc), ou só teste/outro candidato, ou `@deprecated` (exige bump e nota no `STATUS.md`).
   - **Baixa:** zero uso em código mas documentado/listado (API pública por path), barrels, recursos de plugin, opt-in via CLI.
   Saída: tabela `candidato | confiança | evidência | ação`.
3. **Plano:** uma remoção/refatoração por etapa, com evidência de não-uso, verificação (type-check, testes, `next build`, bundle da rota) e rollback (`git revert`). Média vira pergunta; Baixa não se toca. **Mostrar e esperar aprovação.**
4. Aplicar uma etapa, rodar verificação, registrar antes/depois. Commit só se o usuário pedir.

## Prudência

Não remover exports públicos (`STATUS.md`), migrations já aplicadas, nem o que `kizuna.lock`/manifest referencia. Não reformatar arquivos que a tarefa não toca. Dependência: conferir se não é peer do core nem usada por script/CLI.

## Erros comuns

| Erro | Correção |
| ---- | -------- |
| Apagar por "parece sem uso" | Evidência de busca de referências + convenções |
| Refatorar e mudar comportamento junto | Etapas separadas |
| Abstrair para um único caso | Extrair só no segundo uso real |
| Lógica de projeto dentro do core | Mover para o projeto consumidor |
