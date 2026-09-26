'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ServiceResult } from '../search/search-types';
import { fetchDeck, recordSwipe } from './swipe-api';
import { SWIPE_BATCH, SWIPE_PREFETCH_AT, type SwipeDecision, type SwipeDeckBody } from './swipe-types';

type Opts = {
  baseBody: Omit<SwipeDeckBody, 'p_exclude' | 'p_seed' | 'p_page_size'>;
  filterKey: string;
  loggedIn: boolean;
};

export function useSwipeDeck({ baseBody, filterKey, loggedIn }: Opts) {
  const [cards, setCards] = useState<ServiceResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [exhausted, setExhausted] = useState(false);
  const [error, setError] = useState(false);
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
    // Anônimo não tem controle de passados (pode ver repetido); só a fila local sai do lote.
    const exclude = queue.map((c) => c.uid);
    try {
      const batch = await fetchDeck({
        ...bodyRef.current,
        p_seed: seedRef.current,
        p_page_size: SWIPE_BATCH,
        p_exclude: exclude.length ? exclude : null,
      });
      if (gen !== genRef.current) return; // filtro mudou no meio
      setError(false);
      const prevQueue = cardsRef.current;
      const seen = new Set(prevQueue.map((c) => c.uid));
      const newItems = batch.filter((c) => !seen.has(c.uid));
      if (newItems.length === 0) {
        // lote vazio, ou não-vazio mas 100% duplicado da fila: sem itens novos,
        // não há progresso possível — encerra para não reentrar em loop de prefetch.
        setExhausted(true);
      } else {
        const next = [...prevQueue, ...newItems];
        cardsRef.current = next;
        setCards(next);
      }
    } catch (err) {
      console.warn('[swipe] falha ao carregar deck', err);
      // erro não é "acabou": não marca exhausted; o prefetch para até um reset() (Tentar de novo)
      if (gen === genRef.current) setError(true);
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
    setError(false);
    setLoading(true);
    void load([]);
  }, [filterKey, generation, load]);

  // prefetch
  useEffect(() => {
    if (loading || exhausted || error || fetchingRef.current) return;
    if (cards.length <= SWIPE_PREFETCH_AT) void load(cards);
  }, [cards, loading, exhausted, error, load]);

  /**
   * Decide o card do topo. `opts.loggedIn` força a gravação no servidor mesmo que o hook ainda
   * não tenha re-renderizado com o usuário — caso da ação pendente executada logo após o login
   * pelo modal (setUser e onSuccess no mesmo tick).
   */
  const decide = useCallback((action: SwipeDecision, opts?: { loggedIn?: boolean }) => {
    // Avança cardsRef de forma síncrona (fora do updater de setCards) antes de qualquer
    // outra coisa: isso garante que duas chamadas de decide() no mesmo tick (mesmo eventos
    // síncronos, sem render entre elas) operem sobre cards diferentes — a segunda já vê a
    // fila com o primeiro item removido, em vez de ler o mesmo cardsRef.current[0] duas vezes.
    const [current, ...rest] = cardsRef.current;
    if (!current) return;
    cardsRef.current = rest;
    if (loggedInRef.current || opts?.loggedIn) {
      recordSwipe([current.uid], action).catch((err) =>
        console.warn('[swipe] falha ao gravar swipe', err)
      );
    }
    setCards(rest);
  }, []);

  /** Tira um item da fila local sem gravar nada (ex.: já gravado por fora). Devolve o card ou null. */
  const drop = useCallback((uid: string): ServiceResult | null => {
    const found = cardsRef.current.find((c) => c.uid === uid) ?? null;
    if (found) {
      const rest = cardsRef.current.filter((c) => c.uid !== uid);
      cardsRef.current = rest;
      setCards(rest);
    }
    return found;
  }, []);

  const reset = useCallback(() => setGeneration((g) => g + 1), []);

  return { cards, loading, exhausted, error, decide, drop, reset };
}
