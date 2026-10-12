import type { ReactNode } from 'react';
import {
  CalendarDays,
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
  Wallet,
} from 'lucide-react';
import { Badge, Fact, Section } from './service-detail-cinema';
import type { ServiceDetailVariantComponent } from './service-detail-types';
import {
  eventClassification,
  eventDateParts,
  eventPriceInfo,
  eventoHeaderTags,
  formatBRL,
  formatEventDay,
  formatEventWhen,
  isEventOver,
  isFreeEvent,
  mapsSearchUrl,
  parseNames,
  parseSessionDays,
  parseTickets,
  safeHttpUrl,
  splitEventAddress,
  telHref,
  textField,
  whatsappHref,
  type EventTicket,
} from './evento-helpers';

export { eventoHeaderTags };

const BUY_LINK_CLASS =
  'inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-xs font-bold text-brand-foreground transition hover:opacity-90';

const CARD_CLASS =
  'rounded-[var(--ui-radius-card,1rem)] border-[length:var(--ui-border-w-card,1px)] border-border bg-card shadow-[shadow:var(--ui-shadow-item,0_0_#0000)]';

function EndedBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
      Encerrado
    </span>
  );
}

function TicketCard({ ticket }: { ticket: EventTicket }) {
  const meta = [ticket.tipo, ticket.lote, ticket.pessoas != null ? `${ticket.pessoas} ${ticket.pessoas === 1 ? 'pessoa' : 'pessoas'}` : null]
    .filter((v): v is string => v != null);
  const value = ticket.valor == null ? null : ticket.valor > 0 ? formatBRL(ticket.valor) : 'Gratuito';
  return (
    <li className={`flex flex-col gap-1 p-4 ${CARD_CLASS}`}>
      {ticket.setor && (
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{ticket.setor}</div>
      )}
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0 font-bold leading-snug">{ticket.titulo ?? ticket.tipo ?? 'Ingresso'}</div>
        {value && <div className="shrink-0 text-lg font-black leading-none text-brand">{value}</div>}
      </div>
      {meta.length > 0 && <div className="text-xs text-muted-foreground">{meta.join(' · ')}</div>}
      {ticket.comprar && <div className="mt-1 text-xs text-muted-foreground">{ticket.comprar}</div>}
    </li>
  );
}

/**
 * Sidebar da variant `"evento"` — troca a caixa de preço por: data em destaque, título, local e
 * "a partir de" (+ link de compra). Só lg+ (`hidden lg:block`, aplicado por quem chama); no mobile o
 * conteúdo principal já mostra tudo.
 */
export const ServiceDetailEventoSidebar: ServiceDetailVariantComponent = ({ service, extraFields }) => {
  const answers = extraFields?.answers ?? {};
  const date = eventDateParts(answers.data_inicio);
  const endereco = textField(answers.endereco);
  const place = endereco ? splitEventAddress(endereco) : null;
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
            <span className="font-semibold text-foreground">{place.name}</span>
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
        <a href={buyUrl} target="_blank" rel="noopener noreferrer" className={`mt-4 ${BUY_LINK_CLASS}`}>
          <Ticket className="h-3.5 w-3.5" /> Comprar ingresso
        </a>
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
export const ServiceDetailEvento: ServiceDetailVariantComponent = ({ service, extraFields, hue }) => {
  const answers = extraFields?.answers ?? {};

  const when = formatEventWhen(answers);
  const classificacao = eventClassification(answers);
  const realizador = textField(answers.realizador);
  const tickets = parseTickets(answers.ingressos);
  const price = eventPriceInfo({
    free: isFreeEvent(answers),
    startingPrice: service.startingPrice,
    priceUnit: service.priceUnit,
    tickets,
  });
  const artists = parseNames(answers.artistas);
  const sessionDays = parseSessionDays(answers.sessoes, answers.data_inicio);
  const salePoints = parseNames(answers.pontos_de_venda);
  const endereco = textField(answers.endereco);
  const place = endereco ? splitEventAddress(endereco) : null;
  const buyUrl = safeHttpUrl(answers.link_ingresso);
  const siteUrl = safeHttpUrl(answers.link);
  const telefone = textField(answers.contato_telefone);
  const whatsapp = textField(answers.contato_whatsapp);
  const email = textField(answers.contato_email);
  const over = isEventOver(answers, service.expiresAt);

  type FactItem = { icon: ReactNode; label: string; value: string };
  const factsRaw: (FactItem | null)[] = [
    when ? { icon: <CalendarDays className="h-4 w-4" />, label: 'Data', value: when } : null,
    classificacao ? { icon: <Clapperboard className="h-4 w-4" />, label: 'Classificação', value: classificacao } : null,
    realizador ? { icon: <Users className="h-4 w-4" />, label: 'Realização', value: realizador } : null,
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
          {artists.map((name) => (
            <Badge key={name}>{name}</Badge>
          ))}
        </div>
      )}

      {/* Descrição: só no mobile — no desktop a sidebar já mostra título/data/local. */}
      {service.description && (
        <div className="lg:hidden">
          <Section title="Sobre o evento" hue={hue}>
            <p className="text-sm leading-relaxed text-muted-foreground">{service.description}</p>
          </Section>
        </div>
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
            <a
              href={buyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${tickets.length > 0 ? 'mt-4 ' : ''}${BUY_LINK_CLASS}`}
            >
              <Ticket className="h-3.5 w-3.5" /> Comprar ingresso
            </a>
          )}
        </Section>
      )}

      {salePoints.length > 0 && (
        <Section title="Onde comprar" hue={hue}>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {salePoints.map((name) => (
              <li key={name} className={`flex items-center gap-3 px-4 py-3 ${CARD_CLASS}`}>
                <Ticket className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="font-semibold leading-snug">{name}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {place && endereco && (
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
              href={mapsSearchUrl(endereco)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Ver no mapa
            </a>
          </div>
        </Section>
      )}

      {(hasContact || siteUrl) && (
        <Section title="Contato" hue={hue}>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {telefone && (
              <a href={telHref(telefone)} className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground">
                <Phone className="h-4 w-4" /> {telefone}
              </a>
            )}
            {whatsapp && (
              <a
                href={whatsappHref(whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp {whatsapp}
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground">
                <Mail className="h-4 w-4" /> {email}
              </a>
            )}
            {siteUrl && (
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" /> Site do evento
              </a>
            )}
          </div>
        </Section>
      )}
    </>
  );
};
