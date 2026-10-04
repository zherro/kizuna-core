/**
 * Regra única de acesso às rotas e páginas da revisão por IA (usada pelo gate das rotas `/api/ai/*`
 * e pelo guard da página): `is_root` estrito, ou permissão `ai_review.<perm>` estritamente `true`.
 * `manage` cobre `review` (e o banco aceita ambas nas RPCs). Qualquer outra coisa nega.
 */

export type AiReviewPerm = 'manage' | 'review';

export interface AiAccessSession {
  is_root?: unknown;
  perms?: Record<string, Record<string, unknown> | undefined> | null;
}

export function canAccessAiReview(
  session: AiAccessSession | null | undefined,
  perm: AiReviewPerm
): boolean {
  if (!session) return false;
  if (session.is_root === true) return true;
  const p = session.perms?.ai_review;
  if (!p || typeof p !== 'object') return false;
  return p[perm] === true || (perm === 'review' && p.manage === true);
}
