import type { ReactNode } from 'react';
import {
  CalendarClock,
  CalendarDays,
  Clapperboard,
  Clock,
  ExternalLink,
  Film,
  Phone,
  PlayCircle,
  Ticket,
  TriangleAlert,
} from 'lucide-react';
import { hueGradient } from './category-style';
import type { ServiceDetailVariantComponent } from './service-detail-types';
import { TrailerPlayer } from './trailer-player';

type CinemaItem = {
  id_cinema?: string;
  nome?: string;
  telefone?: string;
  site?: string;
  link_ingresso?: string;
  idiomas?: string[];
  formatos?: string[];
  expira_em?: string;
  active?: boolean;
};

const DISPLAY_TIME_ZONE = 'America/Sao_Paulo';

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asCinemas(value: unknown): CinemaItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((c): c is CinemaItem => typeof c === 'object' && c != null);
}

/** Extrai o id do vídeo de links do YouTube (watch, youtu.be, embed, shorts). `null` = link não é YouTube válido. */
function youtubeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^(www|m)\./, '');
    let id: string | null = null;
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0] ?? null;
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v');
      else {
        const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/);
        id = m?.[1] ?? null;
      }
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Idiomas/formatos (Dublado, Legendado, 3D…) dos cinemas em cartaz — aparecem junto dos gêneros, sob o título. */
export function cinemaHeaderTags(extraFields: { answers?: Record<string, unknown> } | null | undefined): string[] {
  const now = Date.now();
  const tags = asCinemas(extraFields?.answers?.cinemas)
    .filter((c) => c.active !== false)
    .filter((c) => {
      const until = parseDate(c.expira_em);
      return !until || until.getTime() >= now;
    })
    .flatMap((c) => [...asStringArray(c.idiomas), ...asStringArray(c.formatos)]);
  return Array.from(new Set(tags));
}

function parseDate(iso: string | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatUntil(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: DISPLAY_TIME_ZONE,
  });
}

/** Uma célula da faixa de facts (duração, classificação, ano, distribuidora) — mesmo estilo da
 * variant `"service"`, pra não inventar um padrão visual novo. */
function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[var(--ui-radius-card,1rem)] bg-muted/60 p-4">
      <div className="flex items-center gap-1.5 text-brand">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="mt-1.5 text-sm font-bold leading-snug">{value}</div>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      {children}
    </span>
  );
}

function Section({ title, hue, children }: { title: string; hue: number; children: ReactNode }) {
  return (
    <section className="mt-10 border-t border-border pt-8">
      <h2 className="flex items-center gap-3 font-display text-xl font-black tracking-tight">
        <span className="h-5 w-1 shrink-0 rounded-full" style={{ backgroundImage: hueGradient(hue) }} />
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CinemaCard({ cinema, until }: { cinema: CinemaItem; until: Date | null }) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--ui-radius-card,1rem)] border-[length:var(--ui-border-w-card,1px)] border-border bg-card p-4 shadow-[shadow:var(--ui-shadow-item,0_0_#0000)]">
      <div>
        <div className="font-bold leading-snug">{cinema.nome ?? 'Cinema'}</div>
        {until && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            <span>Em cartaz até {formatUntil(until)}</span>
          </div>
        )}
      </div>

      {(cinema.link_ingresso || cinema.telefone || cinema.site) && (
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-sm">
          {cinema.link_ingresso && (
            <a
              href={cinema.link_ingresso}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-xs font-bold text-brand-foreground transition hover:opacity-90"
            >
              <Ticket className="h-3.5 w-3.5" /> Comprar ingresso
            </a>
          )}
          {cinema.telefone && (
            <a
              href={`tel:${cinema.telefone.replace(/[^\d+]/g, '')}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <Phone className="h-3.5 w-3.5" /> {cinema.telefone}
            </a>
          )}
          {cinema.site && (
            <a
              href={cinema.site}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Site do cinema
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Conteúdo da sidebar pra variant `"cinema"` — substitui a caixa de preço (cinema não vende
 * ingresso aqui, só divulga): título do filme, gênero (as subcategorias do anúncio) e a sinopse.
 * Só aparece em telas lg+ (`hidden lg:block`, aplicado por quem chama) — no mobile a sidebar
 * empilha DEPOIS do conteúdo principal, que já mostra título/subcategorias/sinopse "normal"
 * (cabeçalho da página + seção "Sinopse"), então repetir aqui só duplicaria.
 */
export const ServiceDetailCinemaSidebar: ServiceDetailVariantComponent = ({
  service,
  extraFields,
  subcategoryNames,
}) => (
  <>
    <div className="text-4xl font-semibold leading-snug">{service.title}</div>
    {[...subcategoryNames, ...cinemaHeaderTags(extraFields)].length > 0 && (
      <div className="mt-3 flex flex-wrap gap-1.5">
        {[...subcategoryNames, ...cinemaHeaderTags(extraFields)].map((name) => (
          <Badge key={name}>{name}</Badge>
        ))}
      </div>
    )}
    {service.description && (
      <p className="mt-3 line-clamp-[8] text-base leading-relaxed text-muted-foreground">
        {service.description}
      </p>
    )}
  </>
);

/**
 * Variant `"cinema"` — um anúncio é um filme numa cidade: mostra os dados do filme, as tags
 * (pré-venda, idiomas, formatos) e a lista `answers.cinemas[]` com os cinemas onde ele está em
 * cartaz. Cinemas com `active: false` ou `expira_em` no passado ficam de fora. Gêneros são subcategorias e já
 * aparecem no cabeçalho da página. Ver `docs/integracoes/cinema-depara.md` no projeto consumidor.
 */
export const ServiceDetailCinema: ServiceDetailVariantComponent = ({ service, extraFields, hue }) => {
  const answers = extraFields?.answers ?? {};

  const tituloOriginal = asString(answers.detalhes_titulo_original);
  const classificacao = asString(answers.detalhes_classificacao_indicativa);
  const distribuidora = asString(answers.detalhes_distribuidora);
  const duracaoMin = asNumber(answers.detalhes_duracao_min);
  const anoLancamento = asNumber(answers.detalhes_ano_lancamento);
  const avisos = asStringArray(answers.detalhes_avisos_classificacao);
  // Idiomas/formatos já saem sob o título (`cinemaHeaderTags`) — não repetir aqui, mesmo que venham em `answers.tags`.
  const headerTagsLower = new Set(cinemaHeaderTags(extraFields).map((t) => t.toLowerCase()));
  const tags = asStringArray(answers.tags).filter((t) => !headerTagsLower.has(t.toLowerCase()));
  const trailerUrl = asString(answers.detalhes_trailer_url);

  const now = Date.now();
  const cinemas = asCinemas(answers.cinemas)
    .filter((cinema) => cinema.active !== false)
    .map((cinema) => ({ cinema, until: parseDate(cinema.expira_em) }))
    .filter(({ until }) => !until || until.getTime() >= now)
    .sort((a, b) => (a.cinema.nome ?? '').localeCompare(b.cinema.nome ?? '', 'pt-BR'));

  type FactItem = { icon: ReactNode; label: string; value: string };
  const factsRaw: (FactItem | null)[] = [
    duracaoMin != null ? { icon: <Clock className="h-4 w-4" />, label: 'Duração', value: `${duracaoMin} min` } : null,
    classificacao ? { icon: <Clapperboard className="h-4 w-4" />, label: 'Classificação', value: classificacao } : null,
    anoLancamento != null
      ? { icon: <CalendarDays className="h-4 w-4" />, label: 'Lançamento', value: String(anoLancamento) }
      : null,
    distribuidora ? { icon: <Film className="h-4 w-4" />, label: 'Distribuidora', value: distribuidora } : null,
  ];
  const facts: FactItem[] = factsRaw.filter((f): f is FactItem => f !== null);

  const trailerId = trailerUrl ? youtubeId(trailerUrl) : null;

  return (
    <>
      {facts.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {facts.map((f) => (
            <Fact key={f.label} icon={f.icon} label={f.label} value={f.value} />
          ))}
        </div>
      )}

      {tituloOriginal && tituloOriginal !== service.title && (
        <p className="mt-3 text-xs text-muted-foreground">Título original: {tituloOriginal}</p>
      )}

      {tags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      )}

      {avisos.length > 0 && (
        <div className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Contém: {avisos.join(', ')}</span>
        </div>
      )}

      {trailerId && <TrailerPlayer videoId={trailerId} />}

      {trailerUrl && !trailerId && (
        <a
          href={trailerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold transition hover:bg-muted"
        >
          <PlayCircle className="h-4 w-4" /> Ver trailer
        </a>
      )}

      {/* Sinopse: só no mobile aqui — no desktop ela já está na sidebar
          (`ServiceDetailCinemaSidebar`, `hidden lg:block`), então repetir ao lado duplicaria. */}
      {service.description && (
        <div className="lg:hidden">
          <Section title="Sinopse" hue={hue}>
            <p className="text-sm leading-relaxed text-muted-foreground">{service.description}</p>
          </Section>
        </div>
      )}

      <Section title="Onde assistir" hue={hue}>
        {cinemas.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {cinemas.map(({ cinema, until }, index) => (
              <CinemaCard key={cinema.id_cinema ?? `${cinema.nome}-${index}`} cinema={cinema} until={until} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum cinema com este filme em cartaz no momento.</p>
        )}
      </Section>
    </>
  );
};
