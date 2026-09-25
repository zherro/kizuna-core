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
  onSuccess: (user: PublicSession) => void;
};

export function AuthModal({ open, initialMode = 'login', onClose, onSuccess }: Props) {
  const [mode, setMode] = useState(initialMode);
  const overlayRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);

  // voltar do celular fecha o modal em vez de sair da página
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ kizunaAuthModal: true }, '');
    const onPop = () => onCloseRef.current();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
      // fechou por X/Esc/overlay/sucesso: remove a entrada que empilhamos
      if (window.history.state?.kizunaAuthModal) window.history.back();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-6 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md">
        <button
          type="button"
          aria-label="Fechar"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        {mode === 'login' ? (
          <LoginForm onSuccess={onSuccess} onSwitchToRegister={() => setMode('register')} />
        ) : (
          <RegisterForm onSuccess={onSuccess} onSwitchToLogin={() => setMode('login')} />
        )}
      </div>
    </div>
  );
}
