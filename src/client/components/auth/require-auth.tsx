'use client';

import { createContext, lazy, Suspense, useCallback, useContext, useRef, useState } from 'react';
import { useAuth } from '../../providers/auth-provider';

// O modal (formulários, captcha, OAuth) só é baixado na primeira vez que alguém anônimo tenta uma
// ação protegida: fica fora do JS inicial das páginas que só oferecem curtir/favoritar.
const AuthModal = lazy(() => import('./auth-modal').then((m) => ({ default: m.AuthModal })));

const PENDING_KEY = 'kizuna.auth.pending';

type RequireAuth = (action: () => void, pendingKey?: string) => void;
const Ctx = createContext<RequireAuth | null>(null);

export function consumePendingAuthAction(): string | null {
  try {
    const v = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    return v;
  } catch {
    return null;
  }
}

function clearPending() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export function RequireAuthProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  // Monta o modal (e dispara o download) só depois da primeira abertura; depois fica montado.
  const [requested, setRequested] = useState(false);
  const pendingRef = useRef<(() => void) | null>(null);

  const requireAuth = useCallback<RequireAuth>(
    (action, pendingKey) => {
      if (user) {
        action();
        return;
      }
      pendingRef.current = action;
      if (pendingKey) {
        try {
          sessionStorage.setItem(PENDING_KEY, pendingKey);
        } catch {
          /* ignore */
        }
      }
      setRequested(true);
      setOpen(true);
    },
    [user]
  );

  return (
    <Ctx.Provider value={requireAuth}>
      {children}
      {requested && (
        <Suspense fallback={null}>
          <AuthModal
            open={open}
            onClose={() => {
              pendingRef.current = null;
              clearPending();
              setOpen(false);
            }}
            // A pendência persistida (reload) sai já no login: o efeito de "acabou de logar" da página
            // roda antes do onSuccess (que espera o popstate do modal) e não pode reaplicá-la.
            onAuthenticated={clearPending}
            onSuccess={() => {
              const action = pendingRef.current;
              pendingRef.current = null;
              setOpen(false);
              action?.();
            }}
          />
        </Suspense>
      )}
    </Ctx.Provider>
  );
}

export function useRequireAuth(): RequireAuth {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRequireAuth precisa de <RequireAuthProvider>');
  return ctx;
}
