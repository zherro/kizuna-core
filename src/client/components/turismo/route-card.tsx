import Link from 'next/link';
import { Clock, Route as RouteIcon, MapPin } from 'lucide-react';
import { dificuldadeInfo, paradasLabel } from './turismo-labels';
import { FOCUS_RING, TurismoMedia } from './turismo-media';

export type RouteCardItem = {
  href: string;
  title: string;
  summary?: string;
  /** Tema da rota (ex.: "Natureza"): vira o chapéu sobre a foto. */
  tema?: string | null;
  /** Texto livre (ex.: "1 dia", "meio período"). */
  duracao?: string | null;
  /** `facil | moderado | dificil`; outro valor não aparece. */
  dificuldade?: string | null;
  paradas: number;
  photo?: string | null;
};

/** Três pontos que se enchem conforme o nível; o texto fica ao lado, então o ícone é decorativo. */
function Level({ level }: { level: number }) {
  return (
    <span aria-hidden="true" className="flex gap-0.5">
      {[1, 2, 3].map((n) => (
        <span key={n} className={`h-1.5 w-1.5 rounded-full ${n <= level ? 'bg-primary' : 'bg-border'}`} />
      ))}
    </span>
  );
}

/** Cartão de roteiro: foto, tema, duração; abaixo título, resumo, dificuldade e nº de paradas. */
export function RouteCard({ item }: { item: RouteCardItem }) {
  const dif = dificuldadeInfo(item.dificuldade);
  return (
    <Link
      href={item.href}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm shadow-black/5 transition-shadow hover:shadow-md ${FOCUS_RING}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <TurismoMedia src={item.photo} icon={RouteIcon} />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-1/2"
          style={{ backgroundImage: 'linear-gradient(to top, rgb(0 0 0 / 0.55), transparent)' }}
        />
        {item.tema ? (
          <span className="absolute left-3 top-3 inline-flex max-w-[80%] items-center rounded-full bg-primary px-2.5 py-1 text-xs font-bold leading-none text-primary-foreground">
            <span className="truncate">{item.tema}</span>
          </span>
        ) : null}
        {item.duracao ? (
          <span className="absolute bottom-3 left-3 inline-flex max-w-[90%] items-center gap-1.5 text-xs font-semibold text-white">
            <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{item.duracao}</span>
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-display text-lg font-black leading-snug tracking-tight decoration-primary decoration-2 underline-offset-4 group-hover:underline group-focus-visible:underline">
          {item.title}
        </h3>
        {item.summary ? <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{item.summary}</p> : null}
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs font-semibold text-foreground/80">
          {dif ? (
            <span className="inline-flex items-center gap-1.5">
              <Level level={dif.level} />
              {dif.label}
            </span>
          ) : null}
          {item.paradas > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
              {paradasLabel(item.paradas)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
