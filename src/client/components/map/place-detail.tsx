'use client';

import Link from 'next/link';
import { AtSign, Banknote, Calendar, Clock, Globe, MapPin, MessageCircle, Phone, type LucideIcon } from 'lucide-react';
import { serviceHref } from '../../../shared/city-routing/city-slug';
import { htmlToText } from '../ai-review/api';
import { FactSheet } from '../content/fact-sheet';
import { fileUrl, thumbUrl } from '../services/service-helpers';
import { detailFacts, formatEventStart, type DetailFact } from './map-format';
import type { MapPlaceDetail } from './map-api';
import type { MapPlace } from './places-map';
import type { PlaceDetailState } from './use-place-detail';

const FACT_ICONS: Record<DetailFact['key'], LucideIcon> = {
  telefone: Phone,
  whatsapp: MessageCircle,
  instagram: AtSign,
  site: Globe,
  horario: Clock,
  preco: Banknote,
};

function photosOf(d: MapPlaceDetail): string[] {
  const ids = [d.cover_file_id, ...(d.image_file_ids ?? [])].filter((id): id is string => !!id);
  return [...new Set(ids)].slice(0, 8);
}

function Skeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Carregando detalhes" className="mx-auto max-w-3xl space-y-5 motion-safe:animate-pulse">
      <div className="h-6 w-2/3 rounded bg-muted" />
      <div className="h-48 rounded-2xl bg-muted md:h-64" />
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-11/12 rounded bg-muted" />
        <div className="h-4 w-3/4 rounded bg-muted" />
      </div>
      <div className="h-40 rounded-2xl bg-muted" />
    </div>
  );
}

const BUTTON =
  'inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/**
 * Conteúdo do painel "Ver mais": esqueleto enquanto carrega, anúncio indisponível (resposta vazia),
 * erro com "Tentar de novo" e o detalhe pronto (fotos, categoria, data, endereço, ficha, descrição
 * e link para a página completa). A descrição vem do banco e é mostrada como texto, nunca como HTML.
 */
export function PlaceDetailPanel({
  place,
  state,
  onRetry,
}: {
  place: MapPlace;
  state: PlaceDetailState;
  onRetry: () => void;
}) {
  if (state.status === 'loading') return <Skeleton />;

  if (state.status === 'error') {
    return (
      <div role="alert" className="mx-auto max-w-3xl space-y-4">
        <p className="text-base text-foreground">Não deu para carregar os detalhes agora.</p>
        <button type="button" onClick={onRetry} className={BUTTON}>
          Tentar de novo
        </button>
      </div>
    );
  }

  if (state.status === 'empty') {
    return (
      <div role="status" className="mx-auto max-w-3xl">
        <p className="text-base text-foreground">Este lugar não está mais disponível.</p>
      </div>
    );
  }

  const d = state.detail;
  const photos = photosOf(d);
  const when = formatEventStart(d.event_start);
  const where = [d.venue, d.address].filter(Boolean).join(' · ') || null;
  const description = d.description ? htmlToText(d.description) : '';
  const dicas = d.facts?.dicas?.trim();
  const href = serviceHref({ uid: d.uid, city: d.city ?? place.city, state: d.state ?? place.state });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {d.category ? <p className="text-sm font-medium text-muted-foreground">{d.category}</p> : null}
      {photos.length > 0 ? (
        <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
          {photos.map((id, i) => (
            <li key={id} className="shrink-0 snap-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={i === 0 ? fileUrl(id) : thumbUrl(id)}
                alt={i === 0 ? d.title : ''}
                loading={i === 0 ? 'eager' : 'lazy'}
                className="h-48 w-auto max-w-[80vw] rounded-2xl bg-muted object-cover md:h-64"
              />
            </li>
          ))}
        </ul>
      ) : null}
      <FactSheet
        title="Informações"
        rows={[
          { icon: Calendar, label: 'Quando', value: when },
          { icon: MapPin, label: 'Onde', value: where },
          ...detailFacts(d).map((f) => ({ icon: FACT_ICONS[f.key], label: f.label, value: f.value, href: f.href })),
        ]}
      />
      {description ? <p className="whitespace-pre-line text-base leading-7 text-foreground">{description}</p> : null}
      {dicas ? (
        <section className="rounded-2xl border border-border p-5">
          <h3 className="text-base font-bold text-foreground">Dicas</h3>
          <p className="mt-2 whitespace-pre-line text-base leading-7 text-foreground">{dicas}</p>
        </section>
      ) : null}
      <Link href={href} className={BUTTON}>
        Abrir página completa
      </Link>
    </div>
  );
}
