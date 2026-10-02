'use client';

import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const ERROR_MESSAGES: Record<string, string> = {
  email_mismatch: 'O e-mail não confere com o da sua conta.',
  root_forbidden: 'A conta root não pode ser excluída por aqui.',
  service_unavailable: 'A exclusão de conta está indisponível no momento.',
};

const DANGER_BUTTON = 'bg-destructive text-destructive-foreground hover:bg-destructive/90';

/** Sai da sessão atual e abre o login voltando para Minha conta (/login barra quem está logado). */
async function logoutAndLogin() {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
  window.location.assign('/login?returnTo=/painel/minha-conta');
}

type Props = {
  onDeleted?: () => void;
  onReauth?: () => void;
};

/**
 * Zona de perigo de Minha conta (bloco `delete-account`). Confirma digitando o e-mail; a rota
 * exige login recente e responde `reauth_required` — aqui oferecemos entrar de novo.
 * Ver POST /api/account/delete (core, server/account/delete-account-handler.ts).
 */
export function DeleteAccountSection({
  onDeleted = () => window.location.assign('/'),
  onReauth = logoutAndLogin,
}: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    setErrorCode(null);
    const res = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      onDeleted();
      return;
    }
    setErrorCode(String(data.code ?? 'delete_failed'));
  }

  return (
    <section className="mt-10 space-y-3 rounded-xl border border-destructive/40 p-4">
      <h2 className="text-base font-semibold text-destructive">Excluir conta</h2>
      <p className="text-sm text-muted-foreground">
        Seus anúncios saem do ar e você perde o acesso. Depois, você pode criar uma conta nova com o
        mesmo e-mail — ela começa do zero.
      </p>

      {!open ? (
        <Button className={DANGER_BUTTON} onClick={() => setOpen(true)}>
          Excluir minha conta
        </Button>
      ) : (
        <div className="space-y-3">
          <label className="block space-y-1 text-sm font-medium">
            <span>Digite seu e-mail para confirmar</span>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          {errorCode === 'reauth_required' ? (
            <div className="space-y-2 text-sm text-destructive">
              <p>Por segurança, entre de novo antes de excluir a conta.</p>
              <Button variant="outline" size="sm" onClick={onReauth}>
                Entrar novamente
              </Button>
            </div>
          ) : errorCode ? (
            <p className="text-sm text-destructive">
              {ERROR_MESSAGES[errorCode] ?? 'Não foi possível excluir a conta.'}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button className={DANGER_BUTTON} disabled={busy || !email.trim()} onClick={confirm}>
              Excluir definitivamente
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
