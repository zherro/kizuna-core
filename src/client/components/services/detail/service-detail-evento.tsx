import type { ReactNode } from 'react';
import Link from 'next/link';
import { CopyValueButton } from './copy-value-button';
import { TrackedContactLink } from '../../../analytics/ad-tracking';
import {
  CalendarDays,
  ChevronRight,
  Clapperboard,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Mic2,
  Phone,
  Ticket,
  Users,
  Layers,
  Wallet,
} from 'lucide-react';
import { Fact, Section } from './service-detail-cinema';
import { AdDescription } from './ad-description';
import { VenueCard } from './venue-card';
import { humanizeSlug } from './ad-extra-fields-format';
import type { ServiceDetailVariantComponent, ServiceSalePoint } from './service-detail-types';
import {
  eventClassification,
  eventDateParts,
  eventDayFromExpiresAt,
  formatEventExpiry,
  eventPriceInfo,
  eventoHeaderTags,
  formatBRL,
  formatEventDay,
  formatEventWhen,
  isEventOver,
  eventCityFromAddress,
  eventPlaceMapUrl,
  resolveEventPlace,
  isFreeEvent,
  mapsSearchUrl,
  parseNames,
  parseSalePoints,
  parseSessionDays,
  parseTickets,
  ticketDisplay,
  safeHttpUrl,
  telHref,
  textField,
  whatsappHref,
  type EventTicket,
} from './evento-helpers';

export { eventoHeaderTags };

const BUY_LINK_CLASS =
  'inline-flex min-h-[38px] items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-bold text-brand-foreground transition hover:opacity-90';

const CARD_CLASS =
  'rounded-[var(--ui-radius-card,1rem)] border-[length:var(--ui-border-w-card,1px)] border-border bg-card shadow-[shadow:var(--ui-shadow-item,0_0_#0000)]';

function EndedBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
      Encerrado
    </span>
  );
}

/**
 * Card de "Onde comprar": o lugar (foto, título, cidade; link para a página dele quando há `venue`,
 * só o texto quando não) e, se o ponto tem `link` http(s) próprio, o botão "Bora comprar ingresso".
 * O `link_ingresso` geral do evento nunca vira botão aqui.
 */
function SalePointCard({ point }: { point: ServiceSalePoint }) {
  const { venue } = point;
  const buy = safeHttpUrl(point.link);
  const body = (
    <>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[calc(var(--ui-radius-card,1rem)-0.375rem)] bg-muted">
        {venue?.photo ? (
          <img src={venue.photo} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <Ticket aria-hidden className="h-4 w-4 text-muted-foreground" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold leading-snug group-hover:text-brand">{venue?.title ?? point.label}</span>
        {venue?.cityName && <span className="block truncate text-xs text-muted-foreground">{venue.cityName}</span>}
      </span>
      {venue && <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </>
  );
  const rowClass = 'group flex items-center gap-3 p-2.5 pr-3';
  return (
    <div className={`flex flex-col gap-2.5 p-2 ${CARD_CLASS}`}>
      {venue ? (
        <Link
          href={venue.href}
          className={`${rowClass} rounded-[calc(var(--ui-radius-card,1rem)-0.25rem)] transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand`}
        >
          {body}
        </Link>
      ) : (
        <div className={rowClass}>{body}</div>
      )}
      {buy && (
        <TrackedContactLink
          href={buy}
          target="_blank"
          rel="noopener noreferrer"
          className={`justify-center ${BUY_LINK_CLASS}`}
        >
          <Ticket className="h-4 w-4" /> Bora comprar ingresso
        </TrackedContactLink>
      )}
    </div>
  );
}

/** Card de ingresso: nome (setor) + preço em destaque; abaixo, o que inclui; por fim lotação e lote.
 * No mobile o preço desce para baixo do nome quando o nome é longo (flex-wrap), sem espremer o texto. */
function TicketCard({ ticket }: { ticket: EventTicket }) {
  const { name, detail, lote, people } = ticketDisplay(ticket);
  const value = ticket.valor == null ? null : ticket.valor > 0 ? formatBRL(ticket.valor) : 'Gratuito';
  return (
    <li className={`flex flex-col gap-2 p-4 ${CARD_CLASS}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="min-w-0 flex-1 basis-48 text-base font-bold leading-snug">{name}</h3>
        {value && <div className="shrink-0 text-lg font-black leading-tight text-brand">{value}</div>}
      </div>
      {detail && <p className="text-sm leading-relaxed text-muted-foreground">{detail}</p>}
      {(people || lote) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-foreground/80">
          {people && (
            <span className="inline-flex items-center gap-1.5">
              <Users aria-hidden className="h-3.5 w-3.5 text-muted-foreground" />
              {people}
            </span>
          )}
          {lote && (
            <span className="inline-flex items-center gap-1.5">
              <Layers aria-hidden className="h-3.5 w-3.5 text-muted-foreground" />
              {lote}
            </span>
          )}
        </div>
      )}
      {ticket.comprar && <div className="text-xs text-muted-foreground">{ticket.comprar}</div>}
    </li>
  );
}

/**
 * Sidebar da variant `"evento"` — troca a caixa de preço por: data em destaque, título, local e
 * "a partir de" (+ link de compra). Só lg+ (`hidden lg:block`, aplicado por quem chama); no mobile o
 * conteúdo principal já mostra tudo.
 */
export const ServiceDetailEventoSidebar: ServiceDetailVariantComponent = ({ service, extraFields, venue, location }) => {
  const answers = extraFields?.answers ?? {};
  const date = eventDateParts(eventDayFromExpiresAt(service.expiresAt) ?? answers.data_inicio);
  const place = resolveEventPlace(venue, location, answers.endereco);
  const tickets = parseTickets(answers.ingressos);
  const price = eventPriceInfo({
    free: isFreeEvent(answers),
    startingPrice: service.startingPrice,
    priceUnit: service.priceUnit,
    tickets,
  });
  const buyUrl = safeHttpUrl(answers.link_ingresso);
  const over = isEventOver(answers, service.expiresAt);

  return (
    <>
      <div className="flex items-start gap-4">
        {date && (
          <div className="flex shrink-0 flex-col items-center rounded-[var(--ui-radius-card,1rem)] bg-muted/60 px-3.5 py-2.5 text-center">
            <span className="font-display text-3xl font-black leading-none">{date.day}</span>
            <span className="mt-1 text-[11px] font-bold uppercase tracking-widest text-brand">{date.month}</span>
          </div>
        )}
        <div className="min-w-0">
          <div className="text-2xl font-semibold leading-snug">{service.title}</div>
          {over && (
            <div className="mt-2">
              <EndedBadge />
            </div>
          )}
        </div>
      </div>

      {place && (
        <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {/* Com lugar vinculado (`local_ref`), o nome leva à página dele — o endereço é o do lugar. */}
            {venue?.href ? (
              <Link href={venue.href} className="font-semibold text-foreground underline-offset-2 hover:text-brand hover:underline">
                {place.name}
              </Link>
            ) : (
              <span className="font-semibold text-foreground">{place.name}</span>
            )}
            {place.rest && <span className="block">{place.rest}</span>}
          </span>
        </div>
      )}

      <div className="mt-5">
        {price.caption && (
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{price.caption}</div>
        )}
        <div className="mt-1 text-3xl font-black leading-none tracking-tight text-brand">{price.amount}</div>
      </div>

      {buyUrl && !over && (
        <TrackedContactLink href={buyUrl} target="_blank" rel="noopener noreferrer" className={`mt-4 ${BUY_LINK_CLASS}`}>
          <Ticket className="h-4 w-4" /> Comprar ingresso
        </TrackedContactLink>
      )}
    </>
  );
};

/**
 * Variant `"evento"` — um anúncio é um evento (show, feira, festival): faixa de facts (data,
 * classificação, realizador, entrada), artistas, programação por dia, ingressos, onde comprar, local
 * e contato. Todo campo de `answers` é opcional: bloco sem dado some. Ver
 * `docs/integracoes/eventos-depara.md` no projeto consumidor.
 */
export const ServiceDetailEvento: ServiceDetailVariantComponent = ({ service, extraFields, hue, labels, organizer, venue, location, salePoints, artists: resolvedArtists, renderVenueCard }) => {
  const answers = extraFields?.answers ?? {};

  // "Acontece em" = `services.expires_at` (campo do service); sem validade, a data do formulário.
  const happensOn = eventDayFromExpiresAt(service.expiresAt);
  const when = happensOn ? formatEventExpiry(service.expiresAt) : formatEventWhen(answers);
  const classificacao = eventClassification(answers);
  const realizadorRaw = textField(answers.realizador);
  const realizador = realizadorRaw ? humanizeSlug(realizadorRaw) : null;
  const tickets = parseTickets(answers.ingressos);
  const price = eventPriceInfo({
    free: isFreeEvent(answers),
    startingPrice: service.startingPrice,
    priceUnit: service.priceUnit,
    tickets,
  });
  const artists: ServiceSalePoint[] =
    resolvedArtists ?? parseNames(answers.artistas).map((label) => ({ label, venue: null }));
  const sessionDays = parseSessionDays(answers.sessoes, answers.data_inicio);
  // Resolvidos pelo servidor quando houver; senão o texto cru do formulário.
  const salePointItems: ServiceSalePoint[] =
    salePoints ?? parseSalePoints(answers.pontos_de_venda).map((p) => ({ label: p.nome, venue: null, ...(p.link ? { link: p.link } : {}) }));
  const endereco = textField(answers.endereco);
  const place = resolveEventPlace(null, location, endereco);
  const buyUrl = safeHttpUrl(answers.link_ingresso);
  // A cidade fica visível junto do "Onde acontece": cityName do local; sem ele, a do endereço do evento.
  const venueWithCity =
    venue && !venue.cityName
      ? { ...venue, cityName: eventCityFromAddress(endereco) }
      : venue;
  // "Ver localização" do local: coordenadas do endereço do evento (copiado do lugar) quando houver;
  // senão a busca pelo nome + endereço + cidade do lugar.
  const venueMapUrl = venueWithCity
    ? location?.lat != null && location?.lng != null
      ? mapsSearchUrl(`${location.lat},${location.lng}`)
      : mapsSearchUrl(
          [venueWithCity.title, venueWithCity.address || location?.address, venueWithCity.cityName].filter(Boolean).join(', ')
        )
    : null;
  const siteUrl = safeHttpUrl(answers.link);
  const telefone = textField(answers.contato_telefone);
  const whatsapp = textField(answers.contato_whatsapp);
  const email = textField(answers.contato_email);
  const over = isEventOver(answers, service.expiresAt);

  type FactItem = { icon: ReactNode; label: string; value: ReactNode };
  // Casa resolvida pela tag `local:<slug>` → "Organizado por <casa>" (link); senão o `realizador` texto.
  // Organizador == local já aparece no "Onde acontece": não repete o link nos facts.
  const organizerIsVenue = !!venue && !!organizer && organizer.uid === venue.uid;
  const organizerFact: FactItem | null =
    !organizerIsVenue && organizer?.href && organizer.title
      ? {
          icon: <Users className="h-4 w-4" />,
          label: 'Organizado por',
          value: (
            <Link href={organizer.href} className="underline-offset-2 hover:text-brand hover:underline">
              {organizer.title}
            </Link>
          ),
        }
      : null;
  const factsRaw: (FactItem | null)[] = [
    when ? { icon: <CalendarDays className="h-4 w-4" />, label: happensOn ? 'Acontece em' : 'Data', value: when } : null,
    classificacao ? { icon: <Clapperboard className="h-4 w-4" />, label: 'Classificação', value: classificacao } : null,
    organizerFact ??
      (realizador ? { icon: <Users className="h-4 w-4" />, label: 'Realização', value: realizador } : null),
    {
      icon: <Wallet className="h-4 w-4" />,
      label: 'Entrada',
      value: price.caption ? `${price.caption} ${price.amount}` : price.amount,
    },
  ];
  const facts = factsRaw.filter((f): f is FactItem => f !== null);

  const hasContact = telefone || whatsapp || email;

  return (
    <>
      {facts.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {facts.map((f) => (
            <Fact key={f.label} icon={f.icon} label={f.label} value={f.value} />
          ))}
        </div>
      )}

      {over && (
        <div className="mt-4">
          <EndedBadge />
        </div>
      )}

      {artists.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-1.5">
          <Mic2 className="h-4 w-4 shrink-0 text-brand" />
          {artists.map((a, i) => (
            <Link
              key={`${a.venue?.uid ?? a.label}-${i}`}
              href={a.venue?.href ?? `/busca?q=${encodeURIComponent(a.label)}`}
              className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-brand hover:text-brand-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {a.venue?.title ?? a.label}
            </Link>
          ))}
        </div>
      )}

      {/* A sidebar (lg+) mostra só título/data/local/preço: a descrição fica aqui em todos os tamanhos. */}
      {service.description && (
        <Section title={labels.about} hue={hue}>
          <AdDescription text={service.description} />
        </Section>
      )}

      {sessionDays.length > 0 && (
        <Section title="Programação" hue={hue}>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {sessionDays.map((day) => (
              <li key={day.date ?? 'sem-data'} className={`p-4 ${CARD_CLASS}`}>
                {day.date && <div className="font-bold leading-snug">{formatEventDay(day.date)}</div>}
                <ul className="mt-2 space-y-1.5">
                  {day.times.map((t, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {t.abertura && (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 shrink-0" /> Portões {t.abertura}
                        </span>
                      )}
                      {t.inicio && (
                        <span className="font-semibold text-foreground">
                          {t.fim ? `${t.inicio} às ${t.fim}` : `Início ${t.inicio}`}
                        </span>
                      )}
                      {!t.inicio && t.fim && <span>Até {t.fim}</span>}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(tickets.length > 0 || buyUrl) && (
        <Section title="Ingressos" hue={hue}>
          {tickets.length > 0 && (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {tickets.map((t, i) => (
                <TicketCard key={`${t.titulo}-${t.setor}-${t.lote}-${i}`} ticket={t} />
              ))}
            </ul>
          )}
          {buyUrl && (
            <TrackedContactLink
              href={buyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${tickets.length > 0 ? 'mt-4 ' : ''}${BUY_LINK_CLASS}`}
            >
              <Ticket className="h-4 w-4" /> Comprar ingresso
            </TrackedContactLink>
          )}
        </Section>
      )}

      {venueWithCity && (renderVenueCard ? renderVenueCard({ venue: venueWithCity, mapUrl: venueMapUrl }) : <VenueCard venue={venueWithCity} hue={hue} mapUrl={venueMapUrl} />)}

      {salePointItems.length > 0 && (
        <Section title="Onde comprar" hue={hue}>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {salePointItems.map((p, i) => (
              <li key={`${p.venue?.uid ?? p.label}-${i}`}>
                <SalePointCard point={p} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(hasContact || siteUrl) && (
        <Section title="Contato" hue={hue}>
          <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {telefone && (
              <li className="flex items-center justify-between gap-2 rounded-[var(--ui-radius-card,1rem)] bg-muted/60 py-1 pl-4 pr-1.5">
                <TrackedContactLink href={telHref(telefone)} className="inline-flex min-w-0 items-center gap-1.5 py-1.5 font-semibold hover:text-brand">
                  <Phone className="h-4 w-4 shrink-0" /> <span className="truncate">{telefone}</span>
                </TrackedContactLink>
                <CopyValueButton value={telefone} label="telefone" />
              </li>
            )}
            {whatsapp && (
              <li className="flex items-center justify-between gap-2 rounded-[var(--ui-radius-card,1rem)] bg-muted/60 py-1 pl-4 pr-1.5">
                <TrackedContactLink
                  href={whatsappHref(whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-w-0 items-center gap-1.5 py-1.5 font-semibold hover:text-brand"
                >
                  <MessageCircle className="h-4 w-4 shrink-0" /> <span className="truncate">WhatsApp {whatsapp}</span>
                </TrackedContactLink>
                <CopyValueButton value={whatsapp} label="WhatsApp" />
              </li>
            )}
            {email && (
              <li className="flex items-center justify-between gap-2 rounded-[var(--ui-radius-card,1rem)] bg-muted/60 py-1 pl-4 pr-1.5">
                <TrackedContactLink href={`mailto:${email}`} className="inline-flex min-w-0 items-center gap-1.5 py-1.5 font-semibold hover:text-brand">
                  <Mail className="h-4 w-4 shrink-0" /> <span className="truncate" title={email}>{email}</span>
                </TrackedContactLink>
                <CopyValueButton value={email} label="e-mail" />
              </li>
            )}
            {siteUrl && (
              <li className="flex items-center justify-between gap-2 rounded-[var(--ui-radius-card,1rem)] bg-muted/60 py-1 pl-4 pr-1.5">
                <TrackedContactLink
                  href={siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-w-0 items-center gap-1.5 py-1.5 font-semibold hover:text-brand"
                >
                  <ExternalLink className="h-4 w-4 shrink-0" /> <span className="truncate">Site do evento</span>
                </TrackedContactLink>
                <CopyValueButton value={siteUrl} label="link do site" />
              </li>
            )}
          </ul>
        </Section>
      )}

      {!venue && place && (
        <Section title="Local" hue={hue}>
          <div className={`flex flex-col gap-3 p-4 ${CARD_CLASS}`}>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <div className="min-w-0">
                <div className="font-bold leading-snug">{place.name}</div>
                {place.rest && <div className="mt-0.5 text-sm text-muted-foreground">{place.rest}</div>}
              </div>
            </div>
            <a
              href={eventPlaceMapUrl(place)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 self-start py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Ver no mapa
            </a>
          </div>
        </Section>
      )}

    </>
  );
};
