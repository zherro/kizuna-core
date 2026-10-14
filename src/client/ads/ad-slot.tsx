'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  AD_FORMAT_SPECS,
  AD_SLOT_CATALOG,
  GOOGLE_CREATIVE_ID,
  buildCandidates,
  pickWeighted,
  routePattern,
  type AdCandidate,
  type AdFormat,
} from '../../shared/ads';
import { loadAdPool, trackAd } from './ads-api';
import { GoogleAd } from './google-ad';
import { useVisibleFor } from './use-visible-once';

export type AdSlotProps = {
  slot: string;
  city?: string | null;
  adsenseClient?: string;
  allowGoogle?: boolean;
  maxPerPage?: number;
  className?: string;
  /** true: sem container de página (largura do pai, sem padding/max-width) — para itens de lista. */
  inline?: boolean;
};

// Contador por página: zerado quando o pathname muda.
const counter = { path: null as string | null, count: 0 };
export function __resetAdSlotCounter() {
  counter.path = null;
  counter.count = 0;
}

const FOCUS_RING =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

type Picked = { cand: AdCandidate; n: number };

/**
 * Espaço publicitário: criativo próprio (imagem/gif) ou Google AdSense, sorteado por peso.
 * Primeiro render é `null` (sem divergência de hidratação); sem candidatos, colapsa.
 */
export function AdSlot({ slot, city, adsenseClient, allowGoogle = true, maxPerPage = 3, className, inline = false }: AdSlotProps) {
  const pathname = usePathname() ?? '/';
  const page = routePattern(pathname);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [format, setFormat] = useState<AdFormat>('banner');
  const poolRef = useRef<AdCandidate[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const def = AD_SLOT_CATALOG.find((s) => s.slug === slot);
    if (!def) return;

    let cancelled = false;
    let reserved = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    void loadAdPool().then((pool) => {
      if (cancelled) return;
      const cfg = pool.slots.find((s) => s.slug === slot);
      if (!cfg || !cfg.enabled) return;
      const cands = buildCandidates({
        slot: cfg,
        format: def.format,
        creatives: pool.creatives,
        city,
        googleReady: allowGoogle && !!adsenseClient,
      });
      const first = pickWeighted(cands);
      if (!first) return;
      if (counter.path !== pathname) {
        counter.path = pathname;
        counter.count = 0;
      }
      if (counter.count >= maxPerPage) return;
      counter.count += 1;
      reserved = true;
      poolRef.current = cands;
      setFormat(def.format);
      setPicked({ cand: first, n: 0 });
      if (cfg.rotateSeconds > 0 && cands.length >= 2) {
        timer = setInterval(() => {
          if (document.visibilityState !== 'visible') return;
          setPicked((cur) => {
            const others = cur ? poolRef.current.filter((c) => c !== cur.cand) : poolRef.current;
            const next = pickWeighted(others.length > 0 ? others : poolRef.current);
            return next ? { cand: next, n: (cur?.n ?? 0) + 1 } : cur;
          });
        }, cfg.rotateSeconds * 1000);
      }
    });
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      if (reserved && counter.path === pathname && counter.count > 0) counter.count -= 1;
    };
  }, [slot, city, adsenseClient, allowGoogle, maxPerPage, pathname]);

  const cand = picked?.cand ?? null;
  const creativeId = cand ? (cand.type === 'own' ? cand.creative.id : GOOGLE_CREATIVE_ID) : null;

  useVisibleFor(
    boxRef,
    { ratio: 0.5, ms: 1000 },
    () => {
      if (creativeId) trackAd({ slot, creativeId, page, event: 'impression' });
    },
    picked ? `${creativeId}:${picked.n}` : null,
    !!picked,
  );

  if (!picked || !cand) return null;

  return (
    <aside
      aria-label="Publicidade"
      data-ad-kind={cand.type === 'google' ? 'google' : cand.creative.kind}
      className={`${inline ? 'w-full' : 'mx-auto w-full max-w-[1600px] px-4 sm:px-6'} ${className ?? ''}`.trim()}
    >
      <div
        ref={boxRef}
        className="relative overflow-hidden rounded-2xl bg-muted"
        style={{ minHeight: AD_FORMAT_SPECS[format].minHeight }}
      >
        <span className="absolute left-3 top-3 z-10 inline-flex items-center rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-white">
          Patrocinado
        </span>
        {cand.type === 'own' ? (
          <a
            href={cand.creative.linkUrl}
            target="_blank"
            rel="sponsored noopener noreferrer"
            onClick={() => trackAd({ slot, creativeId: cand.creative.id, page, event: 'click' })}
            className={`block h-full w-full ${FOCUS_RING}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- criativos externos, tamanhos variados */}
            <img
              src={cand.creative.imageUrl}
              alt={cand.creative.alt}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
              style={{ minHeight: AD_FORMAT_SPECS[format].minHeight }}
            />
          </a>
        ) : (
          <GoogleAd client={adsenseClient ?? ''} adUnit={cand.adUnit} />
        )}
      </div>
    </aside>
  );
}
