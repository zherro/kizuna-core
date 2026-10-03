'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { TurnstileWidget } from '../captcha';
import { SelectPopover } from '../ui-better-soft/select-popover';
import { TicketCreatedNotice } from './ticket-created-notice';
import { TicketImagePicker } from './ticket-image-picker';
import { OTHER_SUBJECT, TICKET_SUBJECTS, TICKET_SUBJECT_OPTIONS } from './ticket-subjects';

const GENERIC_ERROR =
  'Não foi possível abrir o chamado. Confira o assunto (de 3 a 160 caracteres) e tente de novo.';

/**
 * Formulário ÚNICO de chamado/contato (painel e /contato). Logado: assunto, descrição e imagens —
 * nome/e-mail/telefone vêm da conta (o e-mail da sessão é o dono do chamado), POST em
 * /api/resources/tickets. Visitante: pede também nome, e-mail e telefone, POST em /api/contact
 * (sem imagens: upload exige login). Ao criar, mostra o número (com copiar) e o link do chamado.
 */
export function TicketCreateForm({ authenticated = true }: { authenticated?: boolean }) {
  const [subject, setSubject] = useState<string>(TICKET_SUBJECTS[0]);
  const [customSubject, setCustomSubject] = useState('');
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState(''); // honeypot: humano não vê nem preenche
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [createdId, setCreatedId] = useState('');
  const [createdSla, setCreatedSla] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const captchaRequired = !authenticated && Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const title = (subject === OTHER_SUBJECT ? customSubject : subject).trim();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');

    const common = { title, description: description.trim() };
    const res = authenticated
      ? await fetch('/api/resources/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...common, imageIds }),
        })
      : await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...common,
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            website,
            captchaToken,
          }),
        });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    const id = data?.item?.id;
    if (!res.ok || !id) {
      // O token do Turnstile vale uma vez: recarrega o desafio para tentar de novo.
      setCaptchaToken(null);
      setCaptchaKey((key) => key + 1);
      setError(authenticated ? GENERIC_ERROR : String(data?.message || GENERIC_ERROR));
      return;
    }
    setCreatedSla(data.item.slaDueAt ?? null);
    setCreatedId(String(id));
  }

  if (createdId) {
    return (
      <TicketCreatedNotice
        ticketId={createdId}
        authenticated={authenticated}
        email={email.trim()}
        slaDueAt={createdSla}
      />
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {authenticated ? null : (
        <>
          <label className="block space-y-1 text-sm font-medium">
            <span>Nome</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            <span>E-mail</span>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={254}
              required
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            <span>Telefone</span>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={40}
              placeholder="Opcional"
            />
          </label>
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
          />
        </>
      )}

      <div className="space-y-1 text-sm font-medium">
        <span>Assunto</span>
        <SelectPopover
          value={subject}
          options={TICKET_SUBJECT_OPTIONS}
          onChange={setSubject}
          ariaLabel="Assunto"
          className="w-full justify-between"
        />
      </div>
      {subject === OTHER_SUBJECT ? (
        <label className="block space-y-1 text-sm font-medium">
          <span>Qual é o assunto?</span>
          <Input
            value={customSubject}
            onChange={(e) => setCustomSubject(e.target.value)}
            maxLength={160}
          />
        </label>
      ) : null}

      <label className="block space-y-1 text-sm font-medium">
        <span>Descrição</span>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} />
      </label>

      {authenticated ? (
        <div className="space-y-1 text-sm font-medium">
          <span>Imagens</span>
          <TicketImagePicker onChange={setImageIds} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Quer anexar imagens? Entre na sua conta para enviar até 3.
        </p>
      )}

      {captchaRequired ? <TurnstileWidget key={captchaKey} onToken={setCaptchaToken} /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={saving || (captchaRequired && !captchaToken)}>
        Abrir chamado
      </Button>
    </form>
  );
}
