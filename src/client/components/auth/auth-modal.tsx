'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { PublicSession } from '../../providers/auth-provider';
import { LoginForm } from './login-form';
import { RegisterForm } from './register-form';

type Props = {
  open: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  /** Chamado depois que a entrada do modal sai do histórico (ver `succeed`). */
  onSuccess: (user: PublicSession) => void;
  /**
   * Chamado no mesmo tick do login/registro, antes do re-render com o usuário e antes de
   * `onSuccess` — para limpar estado que efeitos de "acabou de logar" não devem ver.
   */
  onAuthenticated?: (user: PublicSession) => void;
};

function ownEntryOnTop(): boolean {
  return Boolean(window.history.state?.kizunaAuthModal);
}

export function AuthModal({ open, initialMode = 'login', onClose, onSuccess, onAuthenticated }: Props) {
  const [mode, setMode] = useState(initialMode);
  const overlayRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  // sucesso aguardando o popstate da nossa própria entrada (ver `succeed`)
  const successUserRef = useRef<PublicSession | null>(null);

  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);

  // Fechamento explícito (X, Esc, overlay): remove a entrada que empilhamos, se ainda estiver no
  // topo. Nunca no cleanup do effect: desmontar por navegação (link "Esqueci minha senha",
  // "termos de uso") não pode disparar um back() que corre com essa navegação.
  const dismiss = () => {
    if (ownEntryOnTop()) window.history.back();
    onCloseRef.current();
  };

  // Sucesso: tira a entrada e só executa onSuccess quando o popstate dela chegar — assim a ação
  // pendente (ex.: router.push('/curtidos')) roda depois do restore que o Next faz no popstate,
  // em vez de ser desfeita por ele.
  const succeed = (user: PublicSession) => {
    onAuthenticated?.(user);
    if (!ownEntryOnTop()) {
      onSuccessRef.current(user);
      return;
    }
    successUserRef.current = user;
    window.history.back();
  };

  // voltar do celular fecha o modal em vez de sair da página
  useEffect(() => {
    if (!open) return;
    // sem back() no cleanup, a remontagem do StrictMode acharia a entrada já no topo: não duplica
    if (!ownEntryOnTop()) window.history.pushState({ kizunaAuthModal: true }, '');
    const onPop = () => {
      // a entrada já saiu do histórico: aqui nunca chama back()
      const user = successUserRef.current;
      successUserRef.current = null;
      if (user) onSuccessRef.current(user);
      else onCloseRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dismiss só lê refs
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) dismiss();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-6 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md">
        <button
          type="button"
          aria-label="Fechar"
          onClick={dismiss}
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        {mode === 'login' ? (
          <LoginForm onSuccess={succeed} onSwitchToRegister={() => setMode('register')} />
        ) : (
          <RegisterForm onSuccess={succeed} onSwitchToLogin={() => setMode('login')} />
        )}
      </div>
    </div>
  );
}
