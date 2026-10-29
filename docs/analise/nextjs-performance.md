---
description: Spec da skill perf-nextjs — medir tempo de load e Core Web Vitals e propor melhorias em páginas Next.js (App Router).
---

# Next.js — performance de página

Spec da skill **`perf-nextjs`**. Foco: identificar por que uma página carrega devagar e propor
correções prudentes, sempre com [cache](cache.md) e [recursos bloqueantes](recursos-bloqueantes.md)
na análise.

## Quando a skill dispara

Pedidos como: "o site está lento", "nota baixa no PageSpeed/Lighthouse", "LCP alto", "TTFB alto",
"bundle grande", "página X demora para abrir", "caiu no teste de performance".

## Entradas

* URL ou rota alvo (produção ou staging; nunca medir só em `next dev`, que é mais lento e não
  representa produção).
* Perfil de teste: **mobile 4G simulado** por padrão (é o que o PageSpeed usa).

## Passo 0 — Alvo e acesso

Perguntar **qual rota** o teste mede: `/` e `/[cidade]` podem se comportar diferente (redirect,
render dinâmico por cookie, ISR). Sem URL para medir, entregar análise estática no modo de
[Plano de melhoria](plano-de-melhoria.md#sem-acesso-para-medir-analise-estatica): achados
rotulados como hipótese e medição como Etapa 0 (`npx lighthouse <url> --preset=mobile` ou a API
do PageSpeed; elemento do LCP pelo painel de Performance do DevTools).

Componentes da home costumam morar no `kizuna-core`: corrigir lá exige bump do core e commit nos
dois repositórios. Avisar no plano.

## Passo 1 — Baseline

Medir com **3 rodadas** e usar a mediana. Registrar:

| Métrica | Bom | Atenção |
| ------- | --- | ------- |
| TTFB | até 0,8 s | acima de 1,8 s |
| LCP | até 2,5 s | acima de 4 s |
| INP | até 200 ms | acima de 500 ms |
| CLS | até 0,1 | acima de 0,25 |
| TBT (laboratório) | até 200 ms | acima de 600 ms |

Fontes: Lighthouse (CLI ou DevTools), `curl -w` para TTFB, relatório do bundle do Next
(`next build` lista tamanho por rota; analisador de bundle para detalhe). Medir também o que
está **na resposta HTML** (`curl`), porque o que o servidor entrega define LCP e TTFB.

## Passo 2 — Diagnóstico por camada

Percorrer sempre nesta ordem; parar de aprofundar uma camada quando o ganho potencial for pequeno.

1. **Servidor (TTFB).** A rota é estática, ISR ou dinâmica? Quantas chamadas ao PostgREST na
   renderização, e elas são sequenciais? Procurar `await` em série que poderia ser `Promise.all`,
   e rota dinâmica "por acidente" (uso de `cookies()`, `headers()` ou `searchParams` na árvore
   inteira força render dinâmico).
2. **Cache.** Para cada dado da rota: ver [Cache](cache.md). Resposta típica do plano:
   "esta rota pode ser ISR com revalidação de N s e invalidação por evento".
3. **Recursos bloqueantes e imagens.** Ver [Recursos bloqueantes](recursos-bloqueantes.md) —
   costuma ser o maior ganho em nota de teste.
4. **JavaScript.** Componentes cliente desnecessários (`'use client'` alto demais na árvore),
   bibliotecas pesadas importadas estaticamente (mapas, editores, gráficos) que cabem em
   `dynamic()` com carregamento sob demanda, dependências duplicadas ou que o bundle inclui inteiras.
5. **Fontes.** `next/font` com `display: swap`, subconjunto latino, poucos pesos. Fonte via
   `<link>` externo é bloqueante.
6. **Hidratação e layout.** CLS: imagens/embeds sem dimensões, banners que empurram conteúdo,
   fontes trocando métrica.
7. **Rede.** Compressão, HTTP/2+, headers de cache em assets estáticos (`/_next/static` é
   imutável), região do servidor vs. banco (latência entre app e PostgREST).

## Passo 3 — Priorização

Ordenar por **impacto ÷ esforço**, marcando risco. Heurística do que costuma render mais:

1. Imagem LCP otimizada e com prioridade (`priority`/`fetchPriority`, tamanho correto, formato moderno).
2. Scripts de terceiros fora do caminho crítico.
3. Cache/ISR de rotas públicas hoje dinâmicas.
4. Consultas sequenciais viram paralelas; consulta lenta ganha índice ([SQL](sql-postgrest-tuning.md)).
5. Dividir JS (`dynamic`, menos `'use client'`).

## Passo 4 — Entrega

Montar o plano no formato de [Plano de melhoria](plano-de-melhoria.md) e **parar para aprovação**.

## Prudência (a skill não faz sem aprovação)

* Mudar a estratégia de render de uma rota (dinâmica → estática/ISR) — pode servir dado velho
  ou dado de outro usuário se houver personalização.
* Remover script de terceiros (analytics, chat, anúncios): é decisão de negócio; propor
  carregamento adiado, não remoção.
* Alterar `next.config.ts` (headers, imagens, `output`): afeta o site inteiro.
* Atualizar versão do Next ou de dependências.

## Antipadrões a sinalizar

* Medir só no `next dev` ou só no desktop.
* Otimizar nota do laboratório piorando a experiência real (esconder conteúdo até carregar).
* `'use client'` na página inteira só por causa de um botão.
* `cache: 'no-store'` espalhado "por garantia".
* Imagem de capa em `<img>` simples ou como background CSS (o navegador só a descobre tarde).

## Saída esperada da skill

Tabela de baseline, achados priorizados, tabela de cache, plano em etapas, e — depois da
aprovação e da aplicação — tabela antes/depois por etapa.
