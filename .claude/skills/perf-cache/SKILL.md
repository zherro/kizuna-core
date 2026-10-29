---
name: perf-cache
description: Use quando for decidir ou revisar cache de rota, consulta ou resposta (ISR, revalidate, unstable_cache, Cache-Control, CDN), ao ligar cache em página pública, ou quando aparece dado velho ou dado de outro usuário.
---

# Cache em camadas

## Overview

Para cada rota e consulta decide: cacheável? onde? quanto tempo? quem invalida? Na dúvida, a resposta é "não cachear ainda" com o motivo. Dado de usuário nunca vai para cache compartilhado.

Spec: `kizuna-core/docs/analise/cache.md`. Plano: `plano-de-melhoria.md`.

## Quando usar

- Toda análise de performance (`perf-nextjs`, `perf-sql`) chama esta skill para a tabela de cache.
- Cache novo, TTL novo, ou bug de dado velho / vazamento entre usuários.

## Passos

1. Para cada rota/consulta responder as 4 perguntas da spec (igual para todos? defasagem aceitável? quem invalida? custo de errar?).
2. Escolher a camada (ISR, `fetch` com `revalidate`, `unstable_cache`, `Cache-Control`/CDN, navegador, memória, banco) e a chave: inclui tudo que muda o resultado (filtros, cidade, página).
3. Definir invalidação: evento (`revalidateTag`/`revalidatePath`) > TTL curto com `stale-while-revalidate` > TTL longo só para dado estável.
4. Preencher a tabela de cache do plano e **parar para aprovação**.
5. Aplicar uma rota por vez, TTL curto primeiro; **testar o caminho de invalidação** (editar e ver o efeito) e `HIT`/`MISS`.

## RPC e dúvidas de negócio

Busca por `POST /api/resources/<rpc>` não é cacheada pela CDN e `publicCacheSeconds` não vale para RPC: use `unstable_cache` com chave completa ou rota GET com `s-maxage` curto; com `setseed(random())`, fixe a semente antes. "Quem invalida" e "defasagem aceitável" que o código não responde vão para **perguntas abertas**, não são inventados. Não ligue cache para esconder consulta lenta.

## Nunca cachear em camada compartilhada

Resposta com sessão/JWT/tenant, dados pessoais, mensagens, pedidos, painel admin, mutações, `/api/auth/*`, moderação e permissões.

## Erros comuns

| Erro | Correção |
| ---- | -------- |
| Chave sem o parâmetro que muda o resultado | Incluir filtros/cidade/página |
| Página inteira dinâmica por causa de um avatar | Miolo público estático, trecho do usuário no cliente |
| Cache sem invalidação testada | Testar editar → refletir |
| Cache para esconder consulta lenta | Tratar também em `perf-sql` |
