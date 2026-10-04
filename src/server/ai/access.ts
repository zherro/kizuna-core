/**
 * Regra única de acesso às rotas e páginas da revisão por IA (gate das rotas `/api/ai/*` e guard
 * das páginas): somente `is_root === true` (estrito). O banco repete a regra (RLS/RPCs checam a
 * claim `is_root` do JWT); permissões de papel não abrem acesso.
 */

export interface AiAccessSession {
  is_root?: unknown;
}

export function canAccessAiReview(session: AiAccessSession | null | undefined): boolean {
  return session?.is_root === true;
}
