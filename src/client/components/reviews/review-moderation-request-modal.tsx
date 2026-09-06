'use client';

import { useEffect, useState } from 'react';
import { Flag } from 'lucide-react';
import { ModalPanel } from '../ui-better-soft/overlay/modal-panel';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { requestModeration } from './use-reviews';

type ReviewModerationRequestModalProps = {
  open: boolean;
  onClose: () => void;
  reviewId: string;
  onSubmitted?: () => void;
};

// i18n(track-e): reviews.moderation.request.*
const REASON_MAX = 800;

/**
 * Owner-only "ask for a re-review" flow. Sends `fn_review_moderation_request`;
 * a 403 (not the owner) surfaces as an inline message from the hook.
 */
export function ReviewModerationRequestModal({
  open,
  onClose,
  reviewId,
  onSubmitted,
}: Readonly<ReviewModerationRequestModalProps>) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setReason('');
    setError('');
    setSubmitting(false);
  }, [open]);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Descreva o motivo da solicitação.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await requestModeration(reviewId, reason);
      onSubmitted?.();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível enviar a solicitação.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalPanel
      open={open}
      onClose={onClose}
      icon={<Flag className="h-4 w-4 text-amber-500" />}
      title="Solicitar revisão da avaliação"
      description="A avaliação não será editada nem removida — a moderação vai reanalisar o caso."
      footerFixed
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? 'Enviando...' : 'Enviar solicitação'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <label htmlFor="moderation-reason" className="block text-sm font-medium">
          Motivo
        </label>
        <Textarea
          id="moderation-reason"
          value={reason}
          rows={5}
          maxLength={REASON_MAX}
          disabled={submitting}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Explique por que esta avaliação deveria ser reanalisada (ex.: informação incorreta, ofensa, engano de serviço)."
        />
        <span className="block text-right text-xs text-muted-foreground">
          {reason.length}/{REASON_MAX}
        </span>
        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </ModalPanel>
  );
}
