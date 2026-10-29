---
description: Como achar e tratar scripts, estilos, fontes e imagens bloqueantes que derrubam a nota em testes de performance.
---

# Recursos bloqueantes

Parte da skill **`perf-nextjs`** ([spec](nextjs-performance.md)). "Bloqueante" é todo recurso que
o navegador precisa baixar/executar **antes** de pintar a parte principal da página, ou que
disputa banda com o recurso do LCP. É a causa mais comum de nota baixa em PageSpeed/Lighthouse
(alertas: *Eliminate render-blocking resources*, *Reduce unused JavaScript*, *Largest Contentful
Paint image was lazily loaded*, *Properly size images*).

## Como achar

1. Abrir o relatório do Lighthouse (mobile) e listar as seções **Opportunities** e **Diagnostics**.
2. Aba *Network* do DevTools com throttling "Slow 4G": ordenar por *Priority* e *Waterfall*;
   o que começa antes do LCP e não é o HTML, CSS crítico ou imagem LCP é suspeito.
3. Aba *Performance*: tarefas longas (acima de 50 ms) na thread principal → TBT/INP.
4. `curl` do HTML: ver quais `<script>` e `<link rel="stylesheet">` estão no `<head>` e se
   têm `async`, `defer` ou `media`.
5. Aba *Coverage*: quanto de cada JS/CSS é realmente usado na carga inicial.

## Scripts

| Sintoma | Causa provável | Tratamento (em ordem de prudência) |
| ------- | -------------- | ----------------------------------- |
| Script de terceiro no `<head>` sem `async`/`defer` | tag colada na mão | `next/script` com `strategy="afterInteractive"` |
| Analytics, pixel, chat, widgets que não afetam a primeira tela | carregam no início | `strategy="lazyOnload"` ou carregar após interação/ocioso |
| Tag manager carregando dezenas de pixels | container inchado | auditar o container; remover o que ninguém usa (decisão do negócio) |
| Anúncios/embeds (mapa, vídeo) acima da dobra | iframe pesado | fachada: imagem estática + carregar o embed no clique |
| Bundle próprio grande na rota | importação estática de lib pesada | `dynamic()` com `ssr: false` só quando o componente não precisa de SSR |
| Muito JS "não usado" | `'use client'` alto demais, lib inteira importada | empurrar o limite cliente para as folhas; importar por caminho específico |
| Tarefas longas no carregamento | hidratação grande, trabalho síncrono | dividir, adiar para `requestIdleCallback`, mover cálculo para o servidor |

Regra: nenhum script de terceiro entra no caminho crítico sem justificativa registrada.
Remover ou trocar o fornecedor de um script **é decisão do usuário** — a skill propõe o
adiamento e mostra o ganho medido.

## CSS e fontes

* CSS crítico pequeno; evitar `@import` em CSS e folhas externas no `<head>`.
* Fonte: `next/font` (self-host, sem requisição a terceiro), `display: swap`, só os pesos
  usados. `<link>` para Google Fonts é bloqueante e custa uma conexão extra.
* Ícones: SVG inline ou sprite; evitar fonte de ícones inteira.

## Imagens

| Problema | Correção |
| -------- | -------- |
| Imagem do LCP carregada com lazy | remover `loading="lazy"` e usar `priority` (ou `fetchPriority="high"`) só nela |
| Imagem do LCP em CSS `background-image` | trocar por `next/image` para o navegador descobri-la cedo |
| Imagem maior que o espaço exibido | `sizes` correto no `next/image`; gerar variantes por largura |
| Formato antigo | AVIF/WebP via otimizador do Next |
| Sem dimensões → CLS | `width`/`height` ou `fill` com contêiner de proporção fixa (`aspect-ratio`) |
| Muitas imagens abaixo da dobra carregando já | `loading="lazy"` (padrão do `next/image`) |
| Carrossel carregando todos os slides | só o primeiro slide é eager; os outros sob demanda |
| Imagem servida pelo banco/API sem cache | cabeçalho `Cache-Control` longo com identificador na URL; conferir `s-maxage` ([Cache](cache.md)) |

Só **uma** imagem por página deve ter prioridade alta (a do LCP). Várias com `priority` se
anulam e voltam a competir.

## Preload e preconnect

* `preconnect` apenas para origens realmente usadas na primeira tela (CDN de imagens, API).
* `preload` só para o recurso do LCP e fonte crítica; excesso de preload atrasa o resto.

## Checklist de verificação (antes/depois)

- [ ] Nenhum `<script>` de terceiro no `<head>` sem `async`/`defer`/`next/script`.
- [ ] Imagem do LCP: não lazy, com prioridade, tamanho correto, formato moderno.
- [ ] Nenhuma folha de CSS ou fonte externa bloqueante.
- [ ] Todas as imagens com dimensão reservada (CLS no verde).
- [ ] TBT e "JavaScript não usado" menores que no baseline.
- [ ] Funcionalidade intacta: o script adiado ainda dispara (evento de analytics, chat abre).

{% hint style="warning" %}
Adiar um script pode quebrar medição ou funcionalidade (evento perdido antes do carregamento,
chat sem o botão). Sempre testar o fluxo que depende dele após a mudança.
{% endhint %}
