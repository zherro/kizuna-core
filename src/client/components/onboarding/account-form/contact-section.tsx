'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Mail, Smartphone } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { Input } from '../../ui/input';
import { PhoneLoginForm } from '../../auth/phone-login-form';
import { Field, SectionCard } from './section-card';
import { fieldError, type AccountFormik } from './types';

function StatusChip({ verified }: { verified: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        verified ? 'bg-success/15 text-success' : 'bg-warning/15 text-foreground/70'
      )}
    >
      {verified ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {verified ? 'Verificado' : 'Pendente'}
    </span>
  );
}

type Props = {
  formik: AccountFormik;
  emailVerified: boolean;
  phoneVerified: boolean;
  /** Chamado depois de verificar o celular — recarrega o nível da conta. */
  onVerified: () => void;
};

export function ContactSection({ formik, emailVerified, phoneVerified, onVerified }: Props) {
  const [phoneLoginEnabled, setPhoneLoginEnabled] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/providers')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { phone?: boolean } | null) => {
        if (active) setPhoneLoginEnabled(data?.phone === true);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return (
    <SectionCard
      id="contato"
      title="Contato e verificação"
      description="Contato verificado deixa você avaliar, comentar e anunciar."
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Mail className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">E-mail</p>
            <StatusChip verified={emailVerified} />
          </div>
          <p className="truncate text-sm text-muted-foreground">{formik.values.email || '—'}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            É o e-mail de acesso da sua conta e não pode ser alterado aqui.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Smartphone className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">Celular</p>
            <StatusChip verified={phoneVerified} />
          </div>

          {!phoneVerified && phoneLoginEnabled ? (
            verifyingPhone ? (
              <div className="max-w-sm">
                <PhoneLoginForm
                  purpose="verify_phone"
                  onVerified={() => {
                    setVerifyingPhone(false);
                    onVerified();
                  }}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setVerifyingPhone(true)}
                className="inline-flex h-9 items-center rounded-[var(--ui-radius-pill,0.375rem)] bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Verificar meu celular
              </button>
            )
          ) : null}

          <div className="max-w-xs">
            <Field
              label="Telefone para contato"
              htmlFor="phone"
              optional
              error={fieldError(formik, 'phone')}
            >
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                placeholder="(65) 99999-9999"
                {...formik.getFieldProps('phone')}
              />
            </Field>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
