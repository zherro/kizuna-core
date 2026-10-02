'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

/** Abre um chamado de suporte (POST /api/resources/tickets) e vai para o detalhe. */
export function TicketCreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch('/api/resources/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), description: description.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    const id = data?.item?.id;
    if (!res.ok || !id) {
      setError('Não foi possível abrir o chamado. O assunto precisa ter de 3 a 160 caracteres.');
      return;
    }
    router.push(`/painel/chamados/${id}`);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1 text-sm font-medium">
        <span>Assunto</span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
      </label>
      <label className="block space-y-1 text-sm font-medium">
        <span>Descrição</span>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={saving}>
        Abrir chamado
      </Button>
    </form>
  );
}
