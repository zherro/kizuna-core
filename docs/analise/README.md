---
description: Specs para criar skills de análise e tuning — performance (Next.js, SQL/PostgREST, cache), segurança de RLS e limpeza de código.
---

# Análise: performance e segurança

Esta seção é a **fonte de verdade para criar skills** de análise. Cada página é uma spec: diz o
que a skill mede, como decide, o que entrega e onde precisa ser prudente. A skill é escrita a
partir da spec ([Como virar skill](como-virar-skill.md)), nunca de memória.

| Spec | Vira a skill | Cobre |
| ---- | ------------ | ----- |
| [Next.js — performance de página](nextjs-performance.md) | `perf-nextjs` | Tempo de load, Core Web Vitals, rendering, bundle, fontes |
| [Recursos bloqueantes](recursos-bloqueantes.md) | parte de `perf-nextjs` | Scripts e imagens que derrubam a nota em teste de performance |
| [Cache — estratégia em camadas](cache.md) | `perf-cache` | Cache server side, CDN, navegador; o que pode e o que não pode cachear |
| [SQL / PostgREST / Postgres](sql-postgrest-tuning.md) | `perf-sql` | Índices, planos de execução, RLS, paginação, RPC, pooling |
| [Segurança — RLS das tabelas](seguranca-rls.md) | `sec-rls` | Políticas, grants, `SECURITY DEFINER`, testes por papel e tenant |
| [Design de código e limpeza](code-design.md) | `code-cleanup` | Código morto, duplicação, camadas, dependências |
| [Plano de melhoria (template)](plano-de-melhoria.md) | usado por todas | Formato obrigatório do plano em etapas |
| [Como virar skill](como-virar-skill.md) | — | Esqueleto, regras e testes das skills |

## Princípios (valem para todas as skills)

1. **Medir antes de mexer.** Sem número de antes, não existe melhoria — existe palpite.
2. **Plano primeiro, sempre.** A skill monta um plano em etapas, mostra e **espera aprovação**
   antes de alterar arquivo ou banco. Formato em [Plano de melhoria](plano-de-melhoria.md).
3. **Cache é considerado em toda análise de performance.** Para cada rota e consulta: pode ser
   cacheada? por quanto tempo? quem invalida? Ver [Cache](cache.md).
4. **Bloqueantes primeiro.** Scripts, fontes e imagens que seguram a primeira pintura costumam
   ser o maior ganho em nota de teste ([Recursos bloqueantes](recursos-bloqueantes.md)).
5. **Prudência.** Uma mudança por vez, reversível, com critério de rollback. Nada de `DROP`,
   `VACUUM FULL`, remoção em massa, troca de estratégia de render ou mudança de política RLS
   sem aprovação explícita.
6. **Desempenho nunca compra segurança.** Otimização não pode mudar quem enxerga o quê; dado de
   usuário não vai para cache compartilhado.
7. **Resultado comprovado.** Depois de aplicar, medir de novo com o mesmo método e registrar
   antes/depois. Se piorou ou ficou igual, reverter.

## Fluxo comum

```
medir (baseline) → diagnosticar → PLANO em etapas → aprovação → aplicar 1 etapa → medir → registrar → próxima
```

## Onde guardar os resultados

Relatórios e planos aprovados ficam no projeto consumidor, em
`docs/melhorias/perf-AAAA-MM-DD-<tema>.md` (ou `sec-...`), seguindo o template. O core guarda só
as specs.
