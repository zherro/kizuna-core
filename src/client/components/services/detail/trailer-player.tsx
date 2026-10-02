'use client';

import { useEffect, useState } from 'react';
import { PlayCircle } from 'lucide-react';

const SIZES = [
  { key: 'sm', label: 'Pequeno', className: 'max-w-sm' },
  { key: 'md', label: 'Médio', className: 'max-w-xl' },
  { key: 'lg', label: 'Grande', className: 'max-w-3xl' },
] as const;

type SizeKey = (typeof SIZES)[number]['key'];

const STORAGE_KEY = 'kizuna:trailer-size';

/**
 * Trailer embutido (YouTube) discreto: começa pequeno e, no desktop, o usuário escolhe o tamanho
 * (Pequeno/Médio/Grande) — a escolha fica no localStorage. No mobile o vídeo ocupa a largura toda.
 * O iframe só carrega depois do clique, pra não pesar a página.
 */
export function TrailerPlayer({ videoId }: { videoId: string }) {
  const [size, setSize] = useState<SizeKey>('sm');
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (SIZES.some((s) => s.key === saved)) setSize(saved as SizeKey);
    } catch {
      /* localStorage indisponível — fica no padrão */
    }
  }, []);

  function choose(next: SizeKey) {
    setSize(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignora */
    }
  }

  const current = SIZES.find((s) => s.key === size) ?? SIZES[0];

  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between gap-3 sm:max-w-3xl">
        <span className="text-xs font-semibold text-muted-foreground">Trailer</span>
        <div className="hidden items-center gap-1 sm:flex" role="group" aria-label="Tamanho do trailer">
          {SIZES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => choose(s.key)}
              aria-pressed={size === s.key}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
                size === s.key ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div
        className={`relative aspect-video w-full overflow-hidden rounded-[var(--ui-radius-card,1rem)] bg-muted transition-[max-width] ${current.className}`}
      >
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
            title="Trailer"
            allow="autoplay; accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 flex items-center justify-center"
            aria-label="Assistir trailer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-80 transition group-hover:opacity-100"
            />
            <PlayCircle className="relative h-12 w-12 text-white drop-shadow" />
          </button>
        )}
      </div>
    </div>
  );
}
