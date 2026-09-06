'use client';

import { useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { ModalPanel } from '../ui-better-soft/overlay/modal-panel';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { useAuth } from '../../providers/auth-provider';
import { RatingInput } from './rating-input';
import { ReviewTags } from './review-tags';
import { submitReview, useReviewTags } from './use-reviews';
import type { ReviewView } from './types';

type ReviewModalProps = {
  open: boolean;
  onClose: () => void;
  domain: string;
  /** = referenceId of the rated entity. Comes from props, never a form field. */
  serviceId: string;
  /** Author id — informational only; the server derives it from the JWT. */
  customerId: string;
  existingReview?: ReviewView | null;
  onSubmitted?: (review: ReviewView) => void;
};

// i18n(track-e): reviews.modal.*
const COMMENT_MAX = 1000;

export function ReviewModal({
  open,
  onClose,
  domain,
  serviceId,
  customerId,
  existingReview,
  onSubmitted,
}: Readonly<ReviewModalProps>) {
  void customerId;
  const { user } = useAuth();
  const { tags, loading: tagsLoading } = useReviewTags(domain);
  const selectableTags = useMemo(
    () => tags.filter((tag) => tag.selectable && tag.active),
    [tags]
  );

  const isEdit = Boolean(existingReview);
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [comment, setComment] = useState(existingReview?.comment ?? '');
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(
    existingReview?.tags.map((t) => t.slug) ?? []
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setRating(existingReview?.rating ?? 0);
    setComment(existingReview?.comment ?? '');
    setSelectedSlugs(existingReview?.tags.map((t) => t.slug) ?? []);
    setError('');
    setSubmitting(false);
  }, [open, existingReview]);

  const toggleTag = (slug: string) => {
    setSelectedSlugs((current) =>
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]
    );
  };

  const handleSubmit = async () => {
    if (rating < 1) {
      setError('Escolha uma nota de 1 a 5.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const tagIds = selectableTags
        .filter((tag) => selectedSlugs.includes(tag.slug))
        .map((tag) => tag.id);
      const result = await submitReview({
        domain,
        referenceId: serviceId,
        rating,
        comment,
        tagIds,
        existingReviewId: existingReview?.id,
      });
      onSubmitted?.(result);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar sua avaliação.');
    } finally {
      setSubmitting(false);
    }
  };

  const unauthorized = !user;

  return (
    <ModalPanel
      open={open}
      onClose={onClose}
      icon={<Star className="h-4 w-4 text-amber-500" />}
      title={isEdit ? 'Editar minha avaliação' : 'Avaliar este serviço'}
      description={
        isEdit
          ? 'Você pode ajustar a nota e o comentário dentro do prazo de edição.'
          : 'Conte como foi sua experiência para ajudar outras pessoas.'
      }
      headerFixed
      footerFixed
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting || unauthorized}>
            {submitting ? 'Enviando...' : isEdit ? 'Salvar alterações' : 'Enviar avaliação'}
          </Button>
        </>
      }
    >
      {/* mobile = full-height sheet (ModalPanel is already inset-y-0 / w-full below sm) */}
      {unauthorized ? (
        <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <p className="font-medium">Entre para avaliar</p>
          <p className="mt-1 text-muted-foreground">
            É preciso ter uma conta para deixar uma avaliação.
          </p>
          <a
            href="/login"
            className="mt-3 inline-flex text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            Ir para o login
          </a>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <span className="mb-1.5 block text-sm font-medium">Sua nota</span>
            <RatingInput value={rating} onChange={setRating} size="lg" disabled={submitting} />
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium">
              O que se destacou? <span className="text-muted-foreground">(opcional)</span>
            </span>
            {tagsLoading ? (
              <div className="h-8 w-48 animate-pulse rounded bg-muted" aria-hidden="true" />
            ) : selectableTags.length ? (
              <ReviewTags
                tags={selectableTags}
                selected={selectedSlugs}
                onToggle={toggleTag}
              />
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma tag disponível.</p>
            )}
          </div>

          <div>
            <label htmlFor="review-comment" className="mb-1.5 block text-sm font-medium">
              Comentário <span className="text-muted-foreground">(opcional)</span>
            </label>
            <Textarea
              id="review-comment"
              value={comment}
              maxLength={COMMENT_MAX}
              disabled={submitting}
              rows={4}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Descreva com detalhes como foi o atendimento, o prazo, a qualidade..."
            />
            <span className="mt-1 block text-right text-xs text-muted-foreground">
              {comment.length}/{COMMENT_MAX}
            </span>
          </div>

          {error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </ModalPanel>
  );
}
