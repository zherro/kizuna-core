'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { HeartOff } from 'lucide-react';
import { fetchLiked, recordSwipe } from './swipe-api';
import { coverUrl, priceLabel } from './swipe-card';
import type { LikedItem } from './swipe-types';

const PAGE_SIZE = 24;

export function SwipeLikedPage({ discoverHref = '/descobrir' }: { discoverHref?: string }) {
  const [items, setItems] = useState<LikedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (c: string | null) => {
    setLoading(true);
    const batch = await fetchLiked(c, PAGE_SIZE);
    setItems((prev) => (c === null ? batch : [...prev, ...batch]));
    setHasMore(batch.length === PAGE_SIZE);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(cursor);
  }, [cursor, load]);

  const unlike = (uid: string) => {
    setItems((prev) => prev.filter((i) => i.uid !== uid));
    recordSwipe([uid], 'skip').catch((err) => console.warn('[swipe] falha ao descurtir', err));
  };

  const loadMore = () => {
    const lastItem = items[items.length - 1];
    if (lastItem) {
      setCursor(lastItem.liked_at);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-4">
      <h1 className="font-serif text-2xl font-bold text-foreground">Curtidos</h1>

      {!loading && items.length === 0 ? (
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

      {hasMore ? (
        <div className="mt-6 text-center">
          <button type="button" disabled={loading} onClick={loadMore} className="rounded-full border border-border px-5 py-2 text-sm font-semibold">
            {loading ? 'Carregando…' : 'Carregar mais'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
