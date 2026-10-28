import Link from 'next/link';
import { Bed, Camera, MapPin, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { faixaLabel } from './turismo-labels';
import { FOCUS_RING, TurismoMedia } from './turismo-media';

export type TurismoPlaceItem = {
  href: string;
  title: string;
  /** Categoria do lugar (ex.: "Pousada", "Restaurante"). */
  kicker?: string;
  summary?: string;
  /** `dormir | comer | atracao`: decide o ícone do cartão sem foto e o filtro por tipo. */
  tipo: string;
  /** `$ | $$ | $$$` */
  faixaPreco?: string | null;
  /** Slug da região/distrito; o filtro troca pelo título. */
  regiao?: string | null;
  address?: string | null;
  photo?: string | null;
};

const TIPO_ICON: Record<string, LucideIcon> = { dormir: Bed, comer: UtensilsCrossed, atracao: Camera };

/** Cartão de lugar de turismo (dormir, comer, atração): foto, categoria, faixa de preço e endereço. */
export function PlaceCard({ item }: { item: TurismoPlaceItem }) {
  return (
    <Link
      href={item.href}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm shadow-black/5 transition-shadow hover:shadow-md ${FOCUS_RING}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <TurismoMedia src={item.photo} icon={TIPO_ICON[item.tipo] ?? MapPin} />
        {item.kicker ? (
          <span className="absolute left-3 top-3 inline-flex max-w-[80%] items-center rounded-full bg-foreground/85 px-2.5 py-1 text-xs font-bold leading-none text-background">
            <span className="truncate">{item.kicker}</span>
          </span>
        ) : null}
        {item.faixaPreco ? (
          <span
            title={faixaLabel(item.faixaPreco)}
            className="absolute right-3 top-3 inline-flex items-center rounded-full bg-background px-2.5 py-1 text-xs font-black leading-none text-primary"
          >
            <span aria-hidden="true">{item.faixaPreco}</span>
            <span className="sr-only">Faixa de preço: {faixaLabel(item.faixaPreco)}</span>
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-display text-lg font-black leading-snug tracking-tight decoration-primary decoration-2 underline-offset-4 group-hover:underline group-focus-visible:underline">
          {item.title}
        </h3>
        {item.summary ? <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{item.summary}</p> : null}
        {item.address ? (
          <p className="mt-auto flex items-start gap-1.5 pt-2 text-xs text-muted-foreground">
            <MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="line-clamp-1">{item.address}</span>
          </p>
        ) : null}
      </div>
    </Link>
  );
}
