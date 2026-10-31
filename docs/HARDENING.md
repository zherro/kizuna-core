# Hardening — performance e segurança

Este levantamento (risco da stack Next + PostgREST + JWT/RLS multi-tenant + checklist "Fase B")
foi **consolidado no tracker único do projeto consumidor**. No foco-total:
[`docs/PENDENCIAS.md`](../../docs/PENDENCIAS.md) — seções **Segurança** e **Performance**, numeração
contínua, com esforço/risco por item.

Itens já fechados (v0.8.0 layout público / ISR; headers de segurança base no `next.config.ts`;
rate-limit por IP em `/api/auth/*`): ver `git log`.

> Para um projeto novo sobre o `kizuna-core`, copie as seções Segurança/Performance do
> `PENDENCIAS.md` do foco-total como ponto de partida do seu próprio tracker.
