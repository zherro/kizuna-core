'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ServiceResult } from '../search/search-types';
import { fetchDeck, recordSwipe } from './swipe-api';
import { addAnonSkip, readAnonSkips } from './anon-skips';
import { SWIPE_BATCH, SWIPE_PREFETCH_AT, type SwipeAction, type SwipeDeckBody } from './swipe-types';

type Opts = {
  baseBody: Omit<SwipeDeckBody, 'p_exclude' | 'p_seed' | 'p_page_size'>;
  filterKey: string;
  loggedIn: boolean;
};

export function useSwipeDeck({ baseBody, filterKey, loggedIn }: Opts) {
  const [cards, setCards] = useState<ServiceResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [exhausted, setExhausted] = useState(false);
  const [generation, setGeneration] = useState(0);

  const seedRef = useRef(Math.random() * 2 - 1);
  const fetchingRef = useRef(false);
  const bodyRef = useRef(baseBody);
  bodyRef.current = baseBody;
  const loggedInRef = useRef(loggedIn);
  loggedInRef.current = loggedIn;
  const genRef = useRef(0);
  const cardsRef = useRef<ServiceResult[]>([]);

  const load = useCallback(async (queue: ServiceResult[]) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    const gen = genRef.current;
    const exclude = [
      ...queue.map((c) => c.uid),
      ...(loggedInRef.current ? [] : readAnonSkips()),
    ];
    try {
      const batch = await fetchDeck({
        ...bodyRef.current,
        p_seed: seedRef.current,
        p_page_size: SWIPE_BATCH,
        p_exclude: exclude.length ? exclude : null,
      });
      if (gen !== genRef.current) return; // filtro mudou no meio
      if (batch.length === 0) setExhausted(true);
      setCards((prev) => {
        const seen = new Set(prev.map((c) => c.uid));
        const next = [...prev, ...batch.filter((c) => !seen.has(c.uid))];
        cardsRef.current = next;
        return next;
      });
    } catch (err) {
      console.warn('[swipe] falha ao carregar deck', err);
    } finally {
      if (gen === genRef.current) {
        fetchingRef.current = false;
        setLoading(false);
      }
    }
  }, []);

  // reset ao mudar filtro (ou reset manual)
  useEffect(() => {
    genRef.current += 1;
    fetchingRef.current = false;
    seedRef.current = Math.random() * 2 - 1;
    cardsRef.current = [];
    setCards([]);
    setExhausted(false);
    setLoading(true);
    void load([]);
  }, [filterKey, generation, load]);

  // prefetch
  useEffect(() => {
    if (loading || exhausted || fetchingRef.current) return;
    if (cards.length <= SWIPE_PREFETCH_AT) void load(cards);
  }, [cards, loading, exhausted, load]);

  const decide = useCallback((action: SwipeAction) => {
    // Lê o card atual fora do updater de setCards: em StrictMode dev o updater roda 2x,
    // o que gravaria o swipe (ou o anon-skip) em duplicidade.
    const current = cardsRef.current[0];
    if (!current) return;
    if (loggedInRef.current) {
      recordSwipe([current.uid], action).catch((err) =>
        console.warn('[swipe] falha ao gravar swipe', err)
      );
    } else if (action === 'skip') {
      addAnonSkip(current.uid);
    }
    setCards((prev) => {
      const next = prev.slice(1);
      cardsRef.current = next;
      return next;
    });
  }, []);

  const reset = useCallback(() => setGeneration((g) => g + 1), []);

  return { cards, loading, exhausted, decide, reset };
}
