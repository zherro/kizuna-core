'use client';

import { useEffect, useState } from 'react';
import { useAuth, type PublicSession } from '../../providers/auth-provider';
import { TurnstileWidget } from '../captcha';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

type PhoneLoginFormProps = {
  onSuccess?: (user: PublicSession) => void;
  /**
   * `login` (padrão): entra/cria conta pelo celular. `verify_phone`: conta já logada adicionando e
   * verificando o celular — chama `onVerified` em vez de `onSuccess`.
   */
  purpose?: 'login' | 'verify_phone';
  onVerified?: () => void;
  /** Volta para o login por email. */
  onBack?: () => void;
  requestEndpoint?: string;
  verifyEndpoint?: string;
};

type RequestResponse = {
  message: string;
  phone?: string;
  resendInSec?: number;
  codeLength?: number;
};

/** Máscara leve de celular BR enquanto digita: (65) 99999-8888. */
function formatPhone(value: string): string {
  const d = value.replace(/\D+/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Login por celular em dois passos: número → código. Conta nova é criada no primeiro login.
 * O envio real depende do provedor configurado no servidor (`otp.providers`).
 */
export function PhoneLoginForm({
  onSuccess,
  purpose = 'login',
  onVerified,
  onBack,
  requestEndpoint = '/api/auth/otp/request',
  verifyEndpoint = '/api/auth/otp/verify',
}: PhoneLoginFormProps) {
  const { setUser } = useAuth();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeLength, setCodeLength] = useState(6);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRequired = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const requestCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(requestEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, captchaToken, purpose }),
      });
      const data = (await res.json().catch(() => ({}))) as RequestResponse;
      if (!res.ok) {
        setError(data.message || 'Nao foi possivel enviar o codigo.');
        setCaptchaToken(null);
        return;
      }
      setMaskedPhone(data.phone ?? phone);
      setCodeLength(data.codeLength ?? 6);
      setResendIn(data.resendInSec ?? 60);
      setCode('');
      setStep('code');
    } catch {
      setError('Erro de conexao com o servidor.');
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(verifyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, purpose }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        user?: PublicSession;
      };
      if (purpose === 'verify_phone') {
        if (!res.ok) {
          setError(data.message || 'Codigo invalido.');
          return;
        }
        onVerified?.();
        return;
      }
      if (!res.ok || !data.user) {
        setError(data.message || 'Codigo invalido.');
        return;
      }
      setUser(data.user);
      onSuccess?.(data.user);
    } catch {
      setError('Erro de conexao com o servidor.');
    } finally {
      setBusy(false);
    }
  };

  const phoneDigits = phone.replace(/\D+/g, '');

  return (
    <div className="space-y-4">
      {step === 'phone' ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void requestCode();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="otp-phone">Celular</Label>
            <Input
              id="otp-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(65) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">{purpose === 'verify_phone'
                ? 'Vamos enviar um codigo para confirmar o numero.'
                : 'Vamos enviar um codigo de acesso.'}</p>
          </div>
          <TurnstileWidget onToken={setCaptchaToken} />
          <Button
            type="submit"
            className="w-full"
            disabled={busy || phoneDigits.length < 11 || (captchaRequired && !captchaToken)}
          >
            {busy ? 'Enviando...' : 'Receber codigo'}
          </Button>
        </form>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void verifyCode();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="otp-code">Codigo enviado para {maskedPhone}</Label>
            <Input
              id="otp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={codeLength}
              placeholder={'0'.repeat(codeLength)}
              className="text-center text-lg tracking-[0.4em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D+/g, '').slice(0, codeLength))}
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy || code.length !== codeLength}>
            {busy ? 'Validando...' : purpose === 'verify_phone' ? 'Verificar' : 'Entrar'}
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              className="text-muted-foreground hover:underline"
              onClick={() => {
                setStep('phone');
                setError(null);
              }}
            >
              Trocar numero
            </button>
            <button
              type="button"
              className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
              disabled={busy || resendIn > 0}
              onClick={() => {
                // Token do Turnstile é de uso único: com captcha ligado, volta ao passo do número.
                if (captchaRequired) {
                  setCaptchaToken(null);
                  setStep('phone');
                  return;
                }
                void requestCode();
              }}
            >
              {resendIn > 0 ? `Reenviar em ${resendIn}s` : 'Reenviar codigo'}
            </button>
          </div>
        </form>
      )}

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </p>
      ) : null}

      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="w-full text-center text-sm text-muted-foreground hover:underline"
        >
          Entrar com email
        </button>
      ) : null}
    </div>
  );
}
