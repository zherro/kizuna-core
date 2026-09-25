'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { HeartOff } from 'lucide-react';
import { useAuth } from '../../providers/auth-provider';
import { RequireAuthProvider, useRequireAuth } from '../auth/require-auth';
import { fetchLiked, recordSwipe } from './swipe-api';
import { coverUrl, priceLabel } from './swipe-card';
import type { LikedItem } from './swipe-types';

const PAGE_SIZE = 24;

type Props = { discoverHref?: string };

/**
 * Lista de curtidos. Cuida da própria autenticação (sem ProtectedRoute): sob o layout público a
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

function SwipeLikedInner({ discoverHref = '/descobrir' }: Props) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.user_id ?? null;
  const requireAuth = useRequireAuth();
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

  const unlike = (uid: string) => {
    setItems((prev) => prev.filter((i) => i.uid !== uid));
    recordSwipe([uid], 'unlike').catch((err) => console.warn('[swipe] falha ao descurtir', err));
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
        <h1 className="font-serif text-2xl font-bold text-foreground">Curtidos</h1>
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
      <h1 className="font-serif text-2xl font-bold text-foreground">Curtidos</h1>

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

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.uid} className="relative overflow-hidden rounded-2xl border border-border bg-card">
            <Link href={`/anuncios/${i.uid}`}>
              {coverUrl(i.cover_file_id) ? (
                <img src={coverUrl(i.cover_file_id)!} alt={i.title} className="h-32 w-full object-cover" loading="lazy" />
              ) : (
                <div className="h-32 w-full bg-muted" />
              )}
              <div className="p-3">
                {i.category ? <p className="text-xs text-muted-foreground">{i.category}</p> : null}
                <p className="line-clamp-2 text-sm font-semibold text-foreground">{i.title}</p>
                <p className="mt-1 text-xs font-medium text-foreground">{priceLabel(i)}</p>
              </div>
            </Link>
            <button
              type="button"
              aria-label={`Descurtir ${i.title}`}
              onClick={() => unlike(i.uid)}
              className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 text-destructive shadow"
            >
              <HeartOff className="h-4 w-4" />
            </button>
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
