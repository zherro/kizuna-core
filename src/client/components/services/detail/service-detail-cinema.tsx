import type { ReactNode } from 'react';
import { hueGradient } from './category-style';
import type { ServiceDetailVariantComponent } from './service-detail-types';

type CinemaSession = {
  id_origem?: string;
  data?: string; // AAAA-MM-DD
  horario?: string; // HH:MM
  sala?: string;
  tipo?: string[];
  url_compra?: string;
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asSessions(value: unknown): CinemaSession[] {
  if (!Array.isArray(value)) return [];
  return value.filter((s): s is CinemaSession => typeof s === 'object' && s != null);
}

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' });
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

/**
 * Variant `"cinema"` — em vez da faixa de facts genérica, mostra os dados do filme (duração,
 * classificação, gêneros/formatos/idiomas) e agrupa `answers.sessoes[]` por data, cada uma com
 * horário/sala/tipo e link de compra. Sem preço: o anúncio só divulga a sessão, quem vende o
 * ingresso é o link `url_compra` (ingresso.com). Vem do de-para `cinema` v1 (payload ingresso.com)
 * — ver `plugins/services/0005_services_public_detail.sql` pra como `answers` chega até aqui.
 */
export const ServiceDetailCinema: ServiceDetailVariantComponent = ({ service, extraFields, hue }) => {
  const answers = extraFields?.answers ?? {};

  const tituloOriginal = asString(answers.detalhes_titulo_original);
  const classificacao = asString(answers.detalhes_classificacao_indicativa);
  const distribuidora = asString(answers.detalhes_distribuidora);
  const duracaoMin = asNumber(answers.detalhes_duracao_min);
  const anoLancamento = asNumber(answers.detalhes_ano_lancamento);
  const generos = asStringArray(answers.detalhes_genero);
  const idiomas = asStringArray(answers.detalhes_idiomas);
  const formatos = asStringArray(answers.detalhes_formatos);
  const trailerUrl = asString(answers.detalhes_trailer_url);
  const sessoes = asSessions(answers.sessoes);

  const sessionsByDate = new Map<string, CinemaSession[]>();
  for (const session of sessoes) {
    if (!session.data) continue;
    const list = sessionsByDate.get(session.data) ?? [];
    list.push(session);
    sessionsByDate.set(session.data, list);
  }

  const factParts = [
    duracaoMin != null ? `${duracaoMin} min` : null,
    classificacao,
    anoLancamento != null ? String(anoLancamento) : null,
    distribuidora,
    tituloOriginal && tituloOriginal !== service.title ? `Título original: ${tituloOriginal}` : null,
  ].filter((part): part is string => Boolean(part));

  return (
    <>
      {factParts.length > 0 && (
        <div className="mt-8 text-sm text-muted-foreground">{factParts.join(' · ')}</div>
      )}

      {(generos.length > 0 || idiomas.length > 0 || formatos.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {generos.map((g) => (
            <Badge key={`genero-${g}`}>{g}</Badge>
          ))}
          {idiomas.map((i) => (
            <Badge key={`idioma-${i}`}>{i}</Badge>
          ))}
          {formatos.map((f) => (
            <Badge key={`formato-${f}`}>{f}</Badge>
          ))}
        </div>
      )}

      {trailerUrl && (
        <a
          href={trailerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm font-semibold text-brand hover:underline"
        >
          Ver trailer
        </a>
      )}

      {service.description && (
        <Section title="Sinopse" hue={hue}>
          <p className="text-sm leading-relaxed text-muted-foreground">{service.description}</p>
        </Section>
      )}

      {sessionsByDate.size > 0 && (
        <Section title="Sessões" hue={hue}>
          <div className="space-y-6">
            {[...sessionsByDate.entries()]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, sessions]) => (
                <div key={date}>
                  <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {formatDateLabel(date)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sessions
                      .sort((a, b) => (a.horario ?? '').localeCompare(b.horario ?? ''))
                      .map((session) => {
                        const card = (
                          <div className="flex min-w-[7.5rem] flex-col gap-1 rounded-2xl border border-border bg-card px-3 py-2 text-sm transition hover:border-brand">
                            <span className="font-bold">{session.horario ?? '--:--'}</span>
                            {session.sala && (
                              <span className="text-xs text-muted-foreground">{session.sala}</span>
                            )}
                            {session.tipo && session.tipo.length > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                {session.tipo.join(' · ')}
                              </span>
                            )}
                          </div>
                        );
                        return session.url_compra ? (
                          <a
                            key={session.id_origem ?? `${date}-${session.horario}-${session.sala}`}
                            href={session.url_compra}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {card}
                          </a>
                        ) : (
                          <div key={session.id_origem ?? `${date}-${session.horario}-${session.sala}`}>
                            {card}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
          </div>
        </Section>
      )}

      {sessoes.length === 0 && (
        <p className="mt-8 text-sm text-muted-foreground">Sem sessões cadastradas no momento.</p>
      )}

      {sessoes.some((s) => s.url_compra) && (
        <p className="mt-4 text-xs text-muted-foreground">
          Clique numa sessão pra comprar o ingresso no site do cinema.
        </p>
      )}
    </>
  );
};
