---
description: Como transformar cada spec desta seção em uma skill consistente, com o mesmo esqueleto, e onde ela fica.
---

# Como virar skill

Cada spec desta seção gera **uma skill**. Todas seguem o mesmo esqueleto para se comportarem de
forma previsível: medir, diagnosticar, **montar plano em etapas, parar para aprovação**, aplicar,
medir de novo.

## Mapa spec → skill

| Spec | Skill | Local sugerido |
| ---- | ----- | -------------- |
| [Next.js](nextjs-performance.md) + [Recursos bloqueantes](recursos-bloqueantes.md) | `perf-nextjs` | `kizuna-core/.claude/skills/perf-nextjs/SKILL.md` |
| [Cache](cache.md) | `perf-cache` | `kizuna-core/.claude/skills/perf-cache/SKILL.md` |
| [SQL / PostgREST](sql-postgrest-tuning.md) | `perf-sql` | `kizuna-core/.claude/skills/perf-sql/SKILL.md` |
| [Segurança — RLS](seguranca-rls.md) | `sec-rls` | `kizuna-core/.claude/skills/sec-rls/SKILL.md` |
| [Design de código](code-design.md) | `code-cleanup` | `kizuna-core/.claude/skills/code-cleanup/SKILL.md` |

## Esqueleto de cada SKILL.md

```markdown
---
name: <nome>
description: Use quando <gatilhos e sintomas>. (Só gatilhos — não resuma o processo.)
---

# <Título>

## Overview          1–2 frases + princípio central
## Quando usar       sintomas, e quando NÃO usar
## Passos            medir → diagnosticar → plano → (aprovação) → aplicar → medir
## Plano             usa o template de docs/analise/plano-de-melhoria.md
## Prudência         o que exige aprovação explícita
## Erros comuns      tabela
```

## Regras de escrita

1. **A skill aponta para a spec**, não a copia inteira: o `SKILL.md` fica enxuto (checklist e
   comandos) e referencia `docs/analise/<spec>.md` para o detalhe. Uma fonte de verdade.
2. `description` começa com "Use quando…" e traz só gatilhos (palavras que o usuário diria:
   "lento", "LCP", "nota do PageSpeed", "RLS", "código morto").
3. **Plano obrigatório e parada para aprovação** em toda skill. Nenhuma altera arquivo ou banco
   antes do "sim".
4. **Cache em toda análise de performance** — a tabela de cache faz parte do plano.
5. Em português; comandos e SQL copiáveis, em blocos com linguagem.
6. Skills de banco só **leem** no diagnóstico; escrita é migration aprovada.

## Teste da skill (antes de dar como pronta)

Seguir a skill `writing-skills`: rodar um cenário **sem** a skill e anotar onde o agente erra
(aplica sem plano, esquece cache, mede só no desktop, escreve policy sem teste); depois com a
skill e confirmar que o plano sai no formato certo e que ele para para aprovação. Cenários de
referência:

* "A home está com nota 45 no PageSpeed mobile" → deve achar LCP/script bloqueante e entregar plano.
* "A busca de anúncios demora 3 s" → deve pedir/rodar `EXPLAIN`, propor índice com rollback e
  tabela de cache.
* "Revise a RLS do plugin `reviews`" → deve inventariar, testar por papel e não alterar nada.
* "Tem código sem uso?" → deve separar confiança alta de média/baixa.

## Manter em dia

Mudou uma spec → atualizar a skill correspondente no mesmo trabalho. Skill nova entra na tabela
acima e no `README.md` desta seção.
