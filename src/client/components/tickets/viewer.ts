import type { SessionPayload } from '../../../server/auth';
import type { Viewer } from './types';

/** Quem está vendo o chamado, a partir da sessão (usado nas páginas, no servidor). */
export function viewerFromSession(session: SessionPayload): Viewer {
  const perms = session.perms as Record<string, Record<string, boolean>> | undefined;
  return {
    userId: session.user_id,
    isStaff: Boolean(session.is_root || perms?.tickets?.manage),
  };
}
