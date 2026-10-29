---
description: Template obrigatório do plano em etapas que toda skill de performance monta e mostra antes de agir.
---

# Plano de melhoria (template)

Toda skill de performance **termina a análise entregando este plano e para**. Só aplica depois
de o usuário aprovar (a etapa inteira ou itens específicos).

## Formato

```markdown
# Plano de performance — <alvo> — AAAA-MM-DD

## 1. Baseline (medido, não estimado)
| Métrica | Valor | Como foi medido |
| ------- | ----- | --------------- |
| LCP / INP / CLS / TTFB (mobile) | ... | Lighthouse mobile, 3 rodadas, mediana |
| JS carregado na rota | ... KB | relatório de bundle |
| Consulta mais lenta | ... ms | EXPLAIN (ANALYZE, BUFFERS) |

## 2. Achados (ordenados por impacto ÷ esforço)
| # | Achado | Evidência | Impacto | Esforço | Risco |
| - | ------ | --------- | ------- | ------- | ----- |

## 3. Cache (obrigatório, mesmo quando a resposta é "não cachear")
| Rota / consulta | Cacheável? | Camada | TTL | Invalidação | Risco de dado velho |
| --------------- | ---------- | ------ | --- | ----------- | ------------------- |

## 4. Etapas
### Etapa 1 — <nome> (seguro, reversível, ganho rápido)
- Mudança: ...
- Arquivos / objetos: ...
- Meta: LCP de X para Y
- Verificação: <comando ou medição>
- Rollback: <como desfazer>

### Etapa 2 — ...

## 5. Fora do plano (de propósito)
O que foi visto e não será feito agora, e por quê.

## 6. Perguntas abertas
Decisões que dependem do usuário.
```

## Sem acesso para medir (análise estática)

Se não há URL, banco ou ambiente, a skill **não finge medir**. Ela entrega o plano assim:

* Baseline: "NÃO MEDIDO", dizendo o que falta (URL, relatório do Lighthouse, acesso de leitura ao banco).
* Cada achado recebe um rótulo de evidência: **[MEDIDO]**, **[LIDO]** (visto só no código/SQL, é hipótese) ou **[NÃO VERIFICÁVEL]** (depende do estado real do ambiente).
* A **Etapa 0 é medir** (somente leitura), com os comandos exatos a rodar. As demais etapas são condicionais ao resultado dela, e a meta numérica fica "a definir após a Etapa 0".
* Perguntas abertas incluem o alvo exato (qual rota, qual consulta) quando houver mais de um.

## Plano de segurança (variante para `sec-rls`)

O baseline e a tabela de cache de performance não se aplicam. Usar:

```markdown
# Plano de segurança — <alvo> — AAAA-MM-DD
## 1. Inventário e evidência (tabelas, políticas, grants, funções; rótulo por achado)
## 2. Achados
| # | Achado | Regra | Evidência | Cenário de abuso | Severidade | Esforço | Risco de quebrar fluxo |
## 3. Etapas (uma migration revisada por etapa)
- Correção (SQL) · teste que a comprova · teste do fluxo legítimo · rollback (migration inversa)
## 4. Fora do plano · 5. Perguntas abertas (decisões de desenho: o que é intencional?)
```

Críticos primeiro. "Cache: não aplicável" basta, se for o caso.

## Regras do plano

* **Etapas pequenas e independentes.** Cada uma pode ser aplicada, medida e revertida sozinha.
* **Ordem:** (1) ganho sem risco — config, cache, recursos bloqueantes, índices que faltam;
  (2) mudanças de código localizadas; (3) mudanças estruturais (estratégia de render, schema).
  Nunca começar pela (3).
* **Cada etapa tem meta numérica e rollback.** Sem os dois, a etapa não entra.
* **Estimativa de ganho é sempre marcada como estimativa.** Só o "depois" medido vale como resultado.
* A skill **mostra o plano e pergunta** "aplico a Etapa 1?" — não encadeia etapas sozinha. A
  aprovação pode ser da etapa inteira ou de itens específicos; a skill pergunta por item quando
  a etapa mistura riscos diferentes.
* **Mudança em componente do `kizuna-core` custa bump do core e commit nos dois repositórios**
  (core e starter). O plano avisa isso na etapa afetada.
* Após cada etapa aplicada: tabela antes/depois e decisão de seguir, ajustar ou reverter.
