'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchBar } from '../search/search-bar';
import { cn } from '../../../lib/utils';

export type HomeSearchProps = {
  city?: { name: string; state: string; ibge: string } | null;
  /** Mostra o botão do assistente; ele leva a /busca?ia=<texto>. */
  aiEnabled?: boolean;
  placeholder?: string;
  locationLabel?: string;
  /** aplica o container da home (max-w-[1600px]). Default true. */
  contained?: boolean;
  className?: string;
};

/**
 * Campo de busca da home: o mesmo `SearchBar` da /busca. Ao enviar, navega para
 * `/busca?q=<texto>` (com a cidade, se vier em `city`); com o assistente, para `/busca?ia=<texto>`.
 * Texto vazio vai para `/busca` sem parâmetro de texto.
 */
export function HomeSearch({
  city,
  aiEnabled = false,
  placeholder,
  locationLabel,
  contained = true,
  className,
}: HomeSearchProps) {
  const router = useRouter();
  const [value, setValue] = useState('');

  const cityQuery = city
    ? `state=${city.state}&cityId=${city.ibge}&cityName=${encodeURIComponent(city.name)}`
    : '';

  const go = (key: 'q' | 'ia', text: string) => {
    const t = text.trim();
    const parts = [t ? `${key}=${encodeURIComponent(t)}` : '', cityQuery].filter(Boolean);
    router.push(parts.length ? `/busca?${parts.join('&')}` : '/busca');
  };

  const bar = (
    <SearchBar
      value={value}
      onChange={setValue}
      onSubmit={(text) => go('q', text)}
      placeholder={placeholder ?? (aiEnabled ? 'Descreva o que você precisa…' : undefined)}
      locationLabel={locationLabel}
      onLocationClick={() => go('q', value)}
      assistant={aiEnabled ? { onClick: (text) => go('ia', text) } : undefined}
      className={className}
    />
  );

  if (!contained) return bar;
  return <div className={cn('mx-auto w-full max-w-[1600px] px-4 sm:px-6')}>{bar}</div>;
}
