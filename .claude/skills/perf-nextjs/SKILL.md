---
name: perf-nextjs
description: Use quando uma página Next.js está lenta, com nota baixa no PageSpeed/Lighthouse, LCP/TTFB/INP/CLS ruins, bundle grande, ou caiu em teste de performance por scripts, fontes ou imagens bloqueantes.
---

# Performance de página Next.js

## Overview

Mede o load da página, acha a causa por camada e entrega um **plano em etapas**. Nunca altera nada antes de o usuário aprovar. Cache e recursos bloqueantes entram em toda análise.

Specs (fonte de verdade, leia antes de agir): `kizuna-core/docs/analise/nextjs-performance.md`, `recursos-bloqueantes.md`, `cache.md`, `plano-de-melhoria.md`.

## Quando usar

- "site lento", "nota baixa", "LCP alto", "TTFB alto", "bundle grande", "caiu no teste de performance".
- Não usar para consulta SQL lenta isolada (`perf-sql`) nem para RLS (`sec-rls`).

## Passos

0. **Alvo:** pergunte qual rota o teste mede (`/` e `/[cidade]` diferem: redirect, cookie, ISR).
1. **Baseline:** Lighthouse mobile, 3 rodadas, mediana (`npx lighthouse <url> --preset=mobile`); TTFB via `curl`; tamanho por rota no `next build`. Medir produção/staging, nunca só `next dev` nem só desktop. **Sem URL:** modo estático de `plano-de-melhoria.md` — baseline "NÃO MEDIDO", achados [LIDO] como hipótese, medição como Etapa 0, metas "a definir após a Etapa 0".
2. **Diagnóstico por camada**, nesta ordem: servidor/TTFB → cache → bloqueantes (scripts, CSS, fontes, imagem do LCP) → JS → fontes → CLS → rede.
3. **Cache:** preencher a tabela de cache do plano (use `perf-cache`).
4. **Plano:** formato de `plano-de-melhoria.md`. **Mostrar e perguntar** "aplico a Etapa 1?".
5. Após aprovação: aplicar **uma** etapa, medir de novo igual ao baseline, registrar antes/depois; piorou ou igual → reverter.

## Monorepo

Componente da home no `kizuna-core` → a etapa exige bump do core e commit nos dois repositórios. Avisar no plano.

## Prudência (exige aprovação explícita)

Mudar estratégia de render, remover script de terceiro (propor adiamento), editar `next.config.ts`, atualizar Next/dependências.

## Erros comuns

| Erro | Correção |
| ---- | -------- |
| Medir só em `next dev` ou desktop | Produção/staging, mobile 4G |
| Várias imagens com `priority` | Só a do LCP |
| `'use client'` na página inteira | Empurrar para as folhas |
| Adiar script sem testar o fluxo que depende dele | Testar evento/chat após a mudança |
| Aplicar várias etapas de uma vez | Uma etapa, medir, próxima |
