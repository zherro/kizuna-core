'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, ThumbsUp } from 'lucide-react';
import { useAuth } from '../../providers/auth-provider';
import { useToast } from '../../hooks/use-toast';
import { cn } from '../../../lib/utils';
import { RequireAuthProvider, useRequireAuth } from '../auth/require-auth';
import { ListingResultCard } from '../ui-better-soft/lists/listing-result-card';
import { toCardProps } from '../search/search-results-view';
import { setReaction, type ReactionKind } from '../services/detail/reaction-api';
import type { ServiceDetailConfig } from '../services/detail/category-style';
import { fetchLiked } from './swipe-api';
import type { LikedItem } from './swipe-types';

const PAGE_SIZE = 24;

type Props = {
  discoverHref?: string;
  /** Mesma config `serviceDetail` do /busca — só decide o estilo do card (ex. cinema). */
  serviceDetailConfig?: ServiceDetailConfig | null;
};

/**
 * Curtidos e favoritos juntos, no mesmo card da busca (`ListingResultCard`). Cada card tem os
 * toggles Gostei/Favorito; desligar os dois tira o item da lista (a linha vira `active = false`
 * e os totais do anúncio são atualizados no servidor). Cuida da própria autenticação (sem ProtectedRoute): sob o layout público a
 * sessão hidrata depois do primeiro render, e redirecionar antes disso mandava quem está logado
 * para /login. Espera `loading` do AuthProvider; anônimo vê um convite que abre o AuthModal.
 */
export function SwipeLikedPage(props: Props) {
  return (
    <RequireAuthProvider>
      <SwipeLikedInner {...props} />
    </RequireAuthProvider>
  );
}

function SwipeLikedInner({ discoverHref = '/descobrir', serviceDetailConfig }: Props) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.user_id ?? null;
  const requireAuth = useRequireAuth();
  const toast = useToast();
  const [items, setItems] = useState<LikedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async (c: string | null) => {
    setLoading(true);
    setError(false);
    try {
      const batch = await fetchLiked(c, PAGE_SIZE);
      setItems((prev) => (c === null ? batch : [...prev, ...batch]));
      setHasMore(batch.length === PAGE_SIZE);
    } catch (err) {
      console.warn('[swipe] falha ao carregar curtidos', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) return; // só busca com sessão (anônimo levaria 401)
    void load(cursor);
  }, [userId, cursor, attempt, load]);

  const toggle = async (item: LikedItem, kind: ReactionKind) => {
    const on = kind === 'like' ? !item.liked : !item.favorite;
    const next = { ...item, ...(kind === 'like' ? { liked: on } : { favorite: on }) };
    const apply = (row: LikedItem) =>
      setItems((prev) =>
        row.liked || row.favorite
          ? prev.map((i) => (i.uid === row.uid ? row : i))
          : prev.filter((i) => i.uid !== row.uid)
      );
    apply(next);
    try {
      await setReaction(item.uid, kind, on);
    } catch (err) {
      console.warn('[swipe] falha ao salvar reação', err);
      // desfaz: volta o item como estava, na posição dele (lista ordenada por liked_at desc)
      setItems((prev) =>
        [...prev.filter((i) => i.uid !== item.uid), item].sort((x, y) => (x.liked_at < y.liked_at ? 1 : -1))
      );
      toast.error('Não foi possível salvar. Tente novamente.');
    }
  };

  const loadMore = () => {
    const lastItem = items[items.length - 1];
    if (lastItem) {
      setCursor(lastItem.liked_at);
    }
  };

  if (authLoading) {
    return <div className="p-10 text-center text-sm text-muted-foreground">Carregando…</div>;
  }

  if (!userId) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-4">
        <h1 className="font-serif text-2xl font-bold text-foreground">Curtidos e favoritos</h1>
        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">Entre para ver seus curtidos.</p>
          <button
            type="button"
            // a lista carrega quando o usuário aparece no contexto; a ação só garante a 1ª página
            onClick={() => requireAuth(() => setCursor(null))}
            className="mt-4 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-4">
      <h1 className="font-serif text-2xl font-bold text-foreground">Curtidos e favoritos</h1>

      {!loading && error ? (
        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">Não foi possível carregar.</p>
          <button
            type="button"
            onClick={() => setAttempt((a) => a + 1)}
            className="mt-4 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Tentar de novo
          </button>
        </div>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">Você ainda não curtiu nada.</p>
          <Link href={discoverHref} className="mt-4 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            Descobrir
          </Link>
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-4 min-[500px]:grid-cols-2 min-[900px]:grid-cols-3">
        {items.map((i) => (
          <div key={i.uid} className="flex flex-col gap-2">
            <ListingResultCard {...toCardProps(i, serviceDetailConfig)} className="flex-1" />
            <div className="flex gap-2">
              <ReactionToggle
                active={i.liked}
                icon={ThumbsUp}
                label="Gostei"
                aria={i.liked ? `Descurtir ${i.title}` : `Curtir ${i.title}`}
                onClick={() => void toggle(i, 'like')}
              />
              <ReactionToggle
                active={i.favorite}
                icon={Heart}
                label={i.favorite ? 'Favorito' : 'Favoritar'}
                aria={i.favorite ? `Desfavoritar ${i.title}` : `Favoritar ${i.title}`}
                onClick={() => void toggle(i, 'favorite')}
              />
            </div>
          </div>
        ))}
      </div>

      {hasMore && !error ? (
        <div className="mt-6 text-center">
          <button type="button" disabled={loading} onClick={loadMore} className="rounded-full border border-border px-5 py-2 text-sm font-semibold">
            {loading ? 'Carregando…' : 'Carregar mais'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ReactionToggle({
  active,
  icon: Icon,
  label,
  aria,
  onClick,
}: {
  active: boolean;
  icon: typeof Heart;
  label: string;
  aria: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={aria}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
        active ? 'border-brand bg-brand/10 text-brand' : 'border-border text-muted-foreground hover:text-foreground'
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', active && 'fill-current')} />
      {label}
    </button>
  );
}
