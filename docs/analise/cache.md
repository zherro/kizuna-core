---
description: Spec da skill perf-cache — decidir, por rota e por consulta, o que pode ser cacheado no servidor, na CDN e no navegador, sem vazar nem servir dado velho.
---

# Cache — estratégia em camadas

Spec da skill **`perf-cache`**. Toda análise de performance ([Next.js](nextjs-performance.md),
[SQL](sql-postgrest-tuning.md)) inclui a tabela de cache do [plano](plano-de-melhoria.md). Esta
página define como preenchê-la.

## Pergunta-guia (para cada rota e cada consulta)

1. O conteúdo é **igual para todos** os visitantes ou depende de quem acessa?
2. Quanto tempo de defasagem é aceitável (segundos, minutos, horas)?
3. **Quem invalida** quando o dado muda (tempo, evento, ação do admin)?
4. Qual o custo de errar: mostrar dado velho é incômodo ou é dano (preço, vaga, permissão)?

Sem resposta para as quatro, a resposta do plano é "não cachear ainda" — e o motivo.

## Camadas

| Camada | Ferramenta no projeto | Bom para | Cuidado |
| ------ | --------------------- | -------- | ------- |
| Página inteira | ISR / rota estática (`revalidate` na rota) | páginas públicas de listagem e detalhe | qualquer uso de cookie/headers/searchParams na árvore torna a rota dinâmica |
| Dado de servidor | `fetch` com `next: { revalidate }`, `unstable_cache` (ver `src/server/postgrest-crud.ts`, `src/server/services/today-feed-data.ts`) | consultas repetidas entre requisições | a chave precisa incluir tudo que muda o resultado (filtros, cidade, página) |
| Resposta HTTP / CDN | `Cache-Control` com `s-maxage` e `stale-while-revalidate` (já usado em `postgrest-crud.ts`) | API pública de leitura, imagens servidas pelo app | nunca em resposta com sessão ou dado de usuário |
| Navegador | `Cache-Control` longo + URL versionada | `/_next/static`, imagens com id/versão na URL | sem versão na URL, o usuário fica preso ao arquivo antigo |
| Memória do processo | variável de módulo com TTL | tabelas minúsculas e estáveis (taxonomia) | cada instância tem a sua; some no deploy |
| Banco | índice, view materializada, cache de plano do Postgres | agregações caras e estáveis | view materializada exige estratégia de refresh |

## Não cachear em camada compartilhada

* Resposta que depende de **sessão, JWT ou tenant** do usuário.
* Dados pessoais, mensagens, pedidos, painel administrativo.
* Resultado de mutação (POST/PATCH/DELETE) e qualquer `/api/auth/*`.
* Estado de moderação ou permissão (precisa refletir na hora).

Se a página mistura público + personalizado: **estática com o miolo público e o trecho do
usuário carregado no cliente** (ou em rota própria dinâmica), nunca a página toda dinâmica por
causa de um avatar.

## RPC e POST

Busca e filtros chamados por `POST /api/resources/<rpc>` não são cacheados pela CDN, e o
`publicCacheSeconds` do core vale para listagem de recurso, não para RPC. Opções: `unstable_cache`
no servidor (chave com **todos** os parâmetros), ou rota GET dedicada com `s-maxage` curto. Se a
RPC usa ordem aleatória (`setseed(random())`), o resultado nunca repete: fixar a semente (por
exemplo, derivada da chave da consulta) antes de cachear. Combinações demais de filtros dão taxa de
acerto baixa; nesse caso o ganho está no banco, não no cache.

Quando "quem invalida" e "defasagem aceitável" são decisão de negócio (não deduzíveis do código),
a skill os registra em **perguntas abertas** em vez de inventar.

## Invalidação

Preferir, nesta ordem: (1) **por evento** (`revalidateTag`/`revalidatePath` ao salvar/moderar),
(2) **por tempo curto** com `stale-while-revalidate`, (3) por tempo longo só para dado que
quase não muda. Toda entrada da tabela de cache registra a invalidação; "só espera expirar"
precisa de TTL justificado.

## Chaves e tags

* Tags por entidade e por escopo (`services`, `services:cidade:<id>`), para invalidar o mínimo.
* Chave de `unstable_cache` inclui parâmetros que alteram o resultado; esquecer um é servir a
  resposta de um usuário/cidade para outro.

## Saída da skill

Para cada rota/consulta: decisão (cachear / não / depois), camada, TTL, invalidação, risco de
dado velho e como testar (requisição repetida mostrando `HIT`/`MISS`, ou o timestamp do dado).

## Prudência

* Introduzir cache **uma rota por vez**, com TTL curto no início e aumento gradual.
* Depois de ligar, testar o caminho de invalidação (editar → ver o efeito) — cache sem
  invalidação testada é bug adiado.
* Cache não conserta consulta lenta: se o MISS é lento, tratar também em
  [SQL](sql-postgrest-tuning.md); o primeiro visitante depois da expiração paga o preço.
