'use client';

import { useEffect, useRef, useState } from 'react';
import { Heart, ThumbsUp } from 'lucide-react';
import { Button } from '../../ui/button';
import { useToast } from '../../../hooks/use-toast';
import { useAuth } from '../../../providers/auth-provider';
import { trackEvent } from '../../../analytics/analytics-api';
import { resolveLucideIcon } from '../../../../lib/lucide-icon';
import { RequireAuthProvider, useRequireAuth } from '../../auth/require-auth';
import { fetchReaction, setReaction, type Reaction, type ReactionKind } from './reaction-api';
import type { ReactionButtonConfig } from './category-style';

type Props = {
  serviceUid: string;
  likeCount: number;
  favoriteCount?: number;
  config?: { like?: ReactionButtonConfig; favorite?: ReactionButtonConfig } | null;
  /** quando informado, conta o evento `favorite` (plugin analytics) ao favoritar. */
  trackUid?: string;
};

/**
 * Gostei e Favoritar são independentes (uma linha por kind em `service_user_favorites`); os totais
 * vêm de `services.like_count` / `favorite_count` e são reconciliados com o que o servidor devolve.
 */
function Inner({ serviceUid, likeCount, favoriteCount = 0, config, trackUid }: Props) {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const toast = useToast();
  const [state, setState] = useState<Reaction>({ liked: false, favorite: false, likeCount, favoriteCount });
  const busy = useRef(false);

  useEffect(() => {
    let alive = true;
    fetchReaction(serviceUid).then((r) => {
      if (!alive || !r) return;
      // visitante: o servidor devolve só os totais (liked/favorite = false)
      setState(user ? r : { ...r, liked: false, favorite: false });
    });
    return () => {
      alive = false;
    };
  }, [user, serviceUid]);

  async function toggle(kind: ReactionKind) {
    if (busy.current) return;
    busy.current = true;
    const prev = state;
    const on = kind === 'like' ? !prev.liked : !prev.favorite;
    const delta = on ? 1 : -1;
    setState(
      kind === 'like'
        ? { ...prev, liked: on, likeCount: Math.max(prev.likeCount + delta, 0) }
        : { ...prev, favorite: on, favoriteCount: Math.max(prev.favoriteCount + delta, 0) }
    );
    try {
      setState(await setReaction(serviceUid, kind, on));
      if (kind === 'favorite' && on && trackUid) {
        trackEvent({ entityType: 'service', entityId: trackUid, event: 'favorite' });
      }
    } catch {
      setState(prev);
      toast.error('Não foi possível salvar. Tente novamente.');
    } finally {
      busy.current = false;
    }
  }

  const like = config?.like;
  const favorite = config?.favorite;
  if (!like && !favorite) return null;

  const LikeIcon = resolveLucideIcon(like?.icon) ?? ThumbsUp;
  const FavIcon = resolveLucideIcon(favorite?.icon) ?? Heart;

  return (
    <div className="flex gap-2">
      {like && (
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => requireAuth(() => toggle('like'))}
          aria-pressed={state.liked}
        >
          <LikeIcon className={state.liked ? 'mr-2 h-4 w-4 fill-current' : 'mr-2 h-4 w-4'} />
          {state.liked ? (like.labelActive ?? like.label ?? 'Gostei') : (like.label ?? 'Gostei')}
          {state.likeCount > 0 && <span className="ml-1 text-muted-foreground">{state.likeCount}</span>}
        </Button>
      )}
      {favorite && (
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => requireAuth(() => toggle('favorite'))}
          aria-pressed={state.favorite}
        >
          <FavIcon className={state.favorite ? 'mr-2 h-4 w-4 fill-current' : 'mr-2 h-4 w-4'} />
          {state.favorite
            ? (favorite.labelActive ?? favorite.label ?? 'Favoritado')
            : (favorite.label ?? 'Favoritar')}
          {state.favoriteCount > 0 && (
            <span className="ml-1 text-muted-foreground">{state.favoriteCount}</span>
          )}
        </Button>
      )}
    </div>
  );
}

export function ServiceReactionButtons(props: Props) {
  return (
    <RequireAuthProvider>
      <Inner {...props} />
    </RequireAuthProvider>
  );
}
