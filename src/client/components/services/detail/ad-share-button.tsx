'use client';

import { Share2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { useToast } from '../../../hooks/use-toast';
import { trackEvent } from '../../../analytics/analytics-api';
import { useAdPlacement, useAdSource } from '../../../analytics/ad-tracking';
import { withSource } from '../../../analytics/source';

/**
 * Usa a Web Share API quando o browser expõe uma (mobile e a maioria dos desktops hoje); cai pra
 * copiar o link quando não há alvo de compartilhamento. `path` é relativo (ex. `/anuncios/<uid>`)
 * — resolvido contra `window.location.origin` aqui, já que quem renderiza isso normalmente é um
 * Server Component sem origin de request próprio pra passar adiante.
 */
export function AdShareButton({
  title,
  path,
  trackUid,
}: {
  title: string;
  path: string;
  /** uid do anúncio: quando informado, conta o evento `share` (plugin analytics). */
  trackUid?: string;
}) {
  const toast = useToast();
  const source = useAdSource();
  const placement = useAdPlacement();

  async function handleShare() {
    // `?src=share`: quem abrir o link compartilhado conta como origem "compartilhamento"
    const url = `${window.location.origin}${withSource(path, 'share')}`;
    if (trackUid) trackEvent({ entityType: 'service', entityId: trackUid, event: 'share', source, placement });

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // Usuário cancelou o compartilhamento — não é um erro a reportar.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado!');
    } catch {
      toast.error('Não foi possível copiar o link.');
    }
  }

  return (
    <Button variant="ghost" className="w-full" onClick={handleShare}>
      <Share2 className="mr-2 h-4 w-4" /> Compartilhar
    </Button>
  );
}
