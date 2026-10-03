'use client';

import { useEffect, useState, type ComponentProps } from 'react';
import type { ServiceResult } from '../../search/search-types';
import { ServiceCarouselSection } from './service-carousel-section';

/** Fisher–Yates, sem mutar a entrada. */
export function shuffleServices<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * `ServiceCarouselSection` que embaralha um pool no navegador e mostra `limit` itens. Para páginas
 * ISR (home): o HTML em cache traz os primeiros `limit` do pool (SEO/primeira pintura) e cada visita
 * troca por uma amostra aleatória depois de montar — sem isso todo visitante vê a mesma ordem até o
 * próximo revalidate.
 */
export function ShuffledServiceCarouselSection({
  services,
  limit,
  ...props
}: ComponentProps<typeof ServiceCarouselSection> & { limit: number }) {
  const [visible, setVisible] = useState<ServiceResult[]>(() => services.slice(0, limit));

  useEffect(() => {
    setVisible(shuffleServices(services).slice(0, limit));
  }, [services, limit]);

  return <ServiceCarouselSection {...props} services={visible} />;
}
