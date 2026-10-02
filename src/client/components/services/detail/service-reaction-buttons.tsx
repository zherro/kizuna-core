'use client';

import { useEffect, useRef, useState } from 'react';
import { Heart, ThumbsUp } from 'lucide-react';
import { Button } from '../../ui/button';
import { useToast } from '../../../hooks/use-toast';
import { useAuth } from '../../../providers/auth-provider';
import { trackEvent } from '../../../analytics/analytics-api';
import { resolveLucideIcon } from '../../../../lib/lucide-icon';
import { RequireAuthProvider, useRequireAuth } from '../../auth/require-auth';
import { fetchReaction, saveReaction, type Reaction } from './reaction-api';
import type { ReactionButtonConfig } from './category-style';

type Props = {
  serviceUid: string;
  likeCount: number;
  config?: { like?: ReactionButtonConfig; favorite?: ReactionButtonConfig } | null;
  /** quando informado, conta o evento `favorite` (plugin analytics) ao favoritar. */
  trackUid?: string;
};

const NONE: Reaction = { uid: null, liked: false, favorite: false };

function Inner({ serviceUid, likeCount, config, trackUid }: Props) {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const toast = useToast();
  const [state, setState] = useState<Reaction>(NONE);
  const [count, setCount] = useState(likeCount);
  const busy = useRef(false);

  useEffect(() => {
    if (!user) {
      setState(NONE);
      return;
    }
    let alive = true;
    fetchReaction(serviceUid).then((r) => alive && setState(r));
    return () => {
      alive = false;
    };
  }, [user, serviceUid]);

  async function apply(next: { liked: boolean; favorite: boolean }) {
    if (busy.current) return;
    busy.current = true;
    const prev = state;
    const prevCount = count;
    setState({ ...prev, ...next });
    setCount(prevCount + (next.liked ? 1 : 0) - (prev.liked ? 1 : 0));
    try {
      const saved = await saveReaction(serviceUid, next);
      setState(saved);
      if (next.favorite && !prev.favorite && trackUid) {
        trackEvent({ entityType: 'service', entityId: trackUid, event: 'favorite' });
      }
    } catch {
      setState(prev);
      setCount(prevCount);
      toast.error('Não foi possível salvar. Tente novamente.');
    } finally {
      busy.current = false;
    }
  }

  const toggleLike = () =>
    requireAuth(() =>
      apply(state.liked ? { liked: false, favorite: false } : { liked: true, favorite: state.favorite })
    );
  const toggleFavorite = () =>
    requireAuth(() =>
      apply(state.favorite ? { liked: state.liked, favorite: false } : { liked: true, favorite: true })
    );

  const like = config?.like;
  const favorite = config?.favorite;
  if (!like && !favorite) return null;

  const LikeIcon = resolveLucideIcon(like?.icon) ?? ThumbsUp;
  const FavIcon = resolveLucideIcon(favorite?.icon) ?? Heart;

  return (
    <div className="flex gap-2">
      {like && (
        <Button variant="outline" className="flex-1" onClick={toggleLike} aria-pressed={state.liked}>
          <LikeIcon className={state.liked ? 'mr-2 h-4 w-4 fill-current' : 'mr-2 h-4 w-4'} />
          {state.liked ? (like.labelActive ?? like.label ?? 'Gostei') : (like.label ?? 'Gostei')}
          {count > 0 && <span className="ml-1 text-muted-foreground">{count}</span>}
        </Button>
      )}
      {favorite && (
        <Button
          variant="outline"
          className="flex-1"
          onClick={toggleFavorite}
          aria-pressed={state.favorite}
        >
          <FavIcon className={state.favorite ? 'mr-2 h-4 w-4 fill-current' : 'mr-2 h-4 w-4'} />
          {state.favorite
            ? (favorite.labelActive ?? favorite.label ?? 'Favoritado')
            : (favorite.label ?? 'Favoritar')}
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
