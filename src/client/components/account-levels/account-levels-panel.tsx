'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle2, Circle, Lock } from 'lucide-react';
import type { LevelStatus } from '../../../shared/account-levels';
import { PhoneLoginForm } from '../auth/phone-login-form';
import { useAccountLevel, type AccountLevelResponse } from './use-account-level';

type Props = {
  /** Status já calculado no servidor (evita o piscar no primeiro render). */
  initial?: AccountLevelResponse | null;
  /** `onboarding` ordena por onboardingOrder; `profile` por profileOrder. */
  order?: 'onboarding' | 'profile';
  /** Ação que trouxe o usuário aqui (`?acao=`), para destacar o nível exigido. */
  highlightLevelKey?: string | null;
  /** Mostra "verificar celular" inline no nível de contato. Padrão: true. */
  inlinePhoneVerification?: boolean;
  /** Login por telefone configurado no servidor (sem isso, não oferece verificar celular). */
  phoneEnabled?: boolean;
};

function StateIcon({ level }: { level: LevelStatus }) {
  if (level.reached) return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
  if (level.enabled === false) return <Lock className="h-5 w-5 text-muted-foreground" />;
  return <Circle className="h-5 w-5 text-muted-foreground" />;
}

/** Escada de níveis da conta com o que falta em cada um e o CTA para completar. */
export function AccountLevelsPanel({
  initial = null,
  order = 'onboarding',
  highlightLevelKey = null,
  inlinePhoneVerification = true,
  phoneEnabled = false,
}: Props) {
  const { status, loading, refresh } = useAccountLevel({ initial });
  const [verifyingPhone, setVerifyingPhone] = useState(false);

  if (!status) {
    return (
      <p className="text-sm text-muted-foreground">
        {loading ? 'Carregando...' : 'Nao foi possivel carregar.'}
      </p>
    );
  }

  const sortKey = order === 'profile' ? 'profileOrder' : 'onboardingOrder';
  const levels = [...status.levels].sort(
    (a, b) => (a[sortKey] ?? a.level) - (b[sortKey] ?? b.level)
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Seu nivel atual:{' '}
        <strong className="text-foreground">
          {status.level === 0
            ? 'Visitante'
            : `${status.level} - ${status.levels.find((l) => l.key === status.levelKey)?.title ?? ''}`}
        </strong>
      </p>

      <ol className="space-y-3">
        {levels.map((l) => {
          const isNext = status.next?.key === l.key;
          const highlighted = highlightLevelKey === l.key;
          return (
            <li
              key={l.key}
              id={l.key}
              className={`rounded-lg border p-4 ${
                highlighted ? 'border-primary ring-1 ring-primary' : 'border-border'
              } ${l.enabled === false ? 'opacity-70' : ''}`}
            >
              <div className="flex items-start gap-3">
                <StateIcon level={l} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {l.level}. {l.title}
                    {l.enabled === false ? (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        em breve
                      </span>
                    ) : null}
                  </p>
                  {l.description ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">{l.description}</p>
                  ) : null}
                  {!l.reached && l.enabled !== false && l.missing.length ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Falta: {l.missing.join(', ')}
                    </p>
                  ) : null}

                  {!l.met && l.enabled !== false && l.requirement === 'contact_verified' ? (
                    inlinePhoneVerification && phoneEnabled ? (
                      verifyingPhone ? (
                        <div className="mt-3 max-w-sm">
                          <PhoneLoginForm
                            purpose="verify_phone"
                            onVerified={() => {
                              setVerifyingPhone(false);
                              void refresh();
                            }}
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setVerifyingPhone(true)}
                          className="mt-3 inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
                        >
                          Verificar meu celular
                        </button>
                      )
                    ) : null
                  ) : !l.met && l.enabled !== false && l.href && (isNext || highlighted) ? (
                    <Link
                      href={l.href}
                      className="mt-3 inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
                    >
                      Completar
                    </Link>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
