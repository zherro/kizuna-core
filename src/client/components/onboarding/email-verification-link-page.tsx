'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, MailWarning } from 'lucide-react';
import { useAuth } from '../../providers/auth-provider';
import { useUrlSecret } from '../../hooks/use-url-secret';
import { buttonVariants } from '../ui/button';
import { cn } from '../../../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

type Status = 'working' | 'done' | 'error' | 'missing';

/**
 * Página do link "Confirmar meu e-mail" (`/verificar-email#t=<token>`).
 * Lê o token do `#` (e tira da URL). Logado: confirma na hora. Sem login: manda para
 * `/login?returnTo=/verificar-email` — o token fica guardado na aba e a confirmação segue na volta.
 */
export function EmailVerificationLinkPage({
  path = '/verificar-email',
  endpoint = '/api/onboarding/email/verify-code',
  manualHref = '/painel/verificar-email',
  doneHref = '/painel',
}: {
  path?: string;
  endpoint?: string;
  /** Tela para digitar o código / pedir outro. */
  manualHref?: string;
  /** Para onde ir depois de confirmar. */
  doneHref?: string;
}) {
  const { user, loading } = useAuth();
  const { value: token, ready, clear } = useUrlSecret('t');
  const [status, setStatus] = useState<Status>('working');
  const [message, setMessage] = useState('');
  const sent = useRef(false);

  useEffect(() => {
    if (!ready || loading || sent.current) return;
    if (!token) {
      setStatus('missing');
      return;
    }
    if (!user) {
      window.location.assign(`/login?returnTo=${encodeURIComponent(path)}`);
      return;
    }
    sent.current = true;
    (async () => {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        if (res.ok) {
          clear();
          setStatus('done');
          return;
        }
        // 401: a sessão caiu no meio do caminho — login de novo, o token continua guardado.
        if (res.status === 401) {
          window.location.assign(`/login?returnTo=${encodeURIComponent(path)}`);
          return;
        }
        clear();
        setMessage(data.error || 'Nao foi possivel confirmar o e-mail.');
        setStatus('error');
      } catch {
        sent.current = false;
        setMessage('Erro de conexao. Tente de novo.');
        setStatus('error');
      }
    })();
  }, [ready, loading, token, user, path, endpoint, clear]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-10">
      <Card className="w-full">
        {status === 'working' && (
          <CardHeader className="items-center text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
            <CardTitle>Confirmando seu e-mail…</CardTitle>
            <CardDescription>Só um instante.</CardDescription>
          </CardHeader>
        )}
        {status === 'done' && (
          <>
            <CardHeader className="items-center text-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" aria-hidden />
              <CardTitle>E-mail confirmado!</CardTitle>
              <CardDescription>Tudo certo com a sua conta.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={doneHref} className={cn(buttonVariants(), 'w-full')}>
                Continuar
              </Link>
            </CardContent>
          </>
        )}
        {(status === 'error' || status === 'missing') && (
          <>
            <CardHeader className="items-center text-center">
              <MailWarning className="h-10 w-10 text-amber-600" aria-hidden />
              <CardTitle>{status === 'missing' ? 'Link incompleto' : 'Não deu certo'}</CardTitle>
              <CardDescription>
                {status === 'missing'
                  ? 'Abra o link direto do e-mail, ou digite o código na tela de verificação.'
                  : message}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={manualHref} className={cn(buttonVariants(), 'w-full')}>
                Digitar o código ou pedir outro
              </Link>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
