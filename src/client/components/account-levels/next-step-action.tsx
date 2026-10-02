'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { LevelStatus } from '../../../shared/account-levels';
import { PhoneLoginForm } from '../auth/phone-login-form';

const BUTTON =
  'inline-flex h-9 items-center rounded-[var(--ui-radius-pill,0.375rem)] bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90';

/** Botão do próximo passo de um nível. Celular verifica inline; o resto segue o `href` do nível. */
export function NextStepAction({
  level,
  phoneEnabled,
  onDone,
}: {
  level: LevelStatus;
  phoneEnabled: boolean;
  onDone: () => void;
}) {
  const [verifyingPhone, setVerifyingPhone] = useState(false);

  if (level.enabled === false || level.met) return null;

  if (level.requirement === 'contact_verified') {
    if (!level.missing.includes('Verificar celular') || !phoneEnabled) return null;
    if (verifyingPhone) {
      return (
        <div className="mt-3 max-w-sm">
          <PhoneLoginForm
            purpose="verify_phone"
            onVerified={() => {
              setVerifyingPhone(false);
              onDone();
            }}
          />
        </div>
      );
    }
    return (
      <button type="button" onClick={() => setVerifyingPhone(true)} className={`mt-3 ${BUTTON}`}>
        Verificar meu celular
      </button>
    );
  }

  if (level.requirement === 'listing_published' && level.missing.includes('Anuncio em analise')) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        Seu anuncio esta em analise. Voce vira Anunciante quando ele for aprovado.
      </p>
    );
  }

  if (!level.href) return null;
  return (
    <Link href={level.href} className={`mt-3 ${BUTTON}`}>
      {level.requirement === 'listing_published' ? 'Publicar anuncio' : 'Completar'}
    </Link>
  );
}
