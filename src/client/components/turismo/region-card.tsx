import Link from 'next/link';
import { Mountain } from 'lucide-react';
import { FOCUS_RING, TurismoMedia } from './turismo-media';

export type RegionCardItem = {
  href: string;
  title: string;
  summary?: string;
  photo?: string | null;
};

/** Cartão de região/distrito: foto cheia com o nome por cima e o resumo curto. */
export function RegionCard({ item }: { item: RegionCardItem }) {
  return (
    <Link
      href={item.href}
      className={`group relative isolate flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl bg-muted shadow-sm shadow-black/10 ${FOCUS_RING}`}
    >
      <TurismoMedia src={item.photo} icon={Mountain} />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ backgroundImage: 'linear-gradient(to top, rgb(0 0 0 / 0.82) 0%, rgb(0 0 0 / 0.4) 45%, transparent 80%)' }}
      />
      <div className="relative z-10 p-4">
        <h3 className="font-display text-xl font-black leading-tight tracking-tight text-white decoration-2 underline-offset-4 group-hover:underline group-focus-visible:underline">
          {item.title}
        </h3>
        {item.summary ? <p className="mt-1 line-clamp-2 text-sm leading-5 text-white/85">{item.summary}</p> : null}
      </div>
    </Link>
  );
}
