import { serverFetchResource } from '../postgrest-crud';
import { regionCitiesFor, type RegionConfig } from '../../shared/regions';

/** O mesmo anúncio numa cidade irmã — ex.: o filme em cartaz em VG quando a página é o de Cuiabá.
 * `places` = rótulos dos endereços lá (nomes dos cinemas). */
export type ServiceSibling = {
  uid: string;
  title: string;
  city: string | null;
  state: string | null;
  cityIbge: string;
  places: string[];
};

type SiblingService = { id: string | number; uid: string; title: string };
type SiblingAddress = {
  serviceId?: string | number;
  service_id?: string | number;
  cityIbge?: string | null;
  city_ibge?: string | null;
  city?: string | null;
  state?: string | null;
  label?: string | null;
};

const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/**
 * Irmãos do anúncio nas cidades irmãs da cidade dele (`regions`): outros `services` com a mesma
 * origem de importação (`extras.origem.fonte` + `id_filme` — um filme vira um anúncio por cidade)
 * que tenham endereço ativo numa irmã. Só recursos públicos (`services` + `service_addresses`,
 * RLS de leitura anônima), sem RPC. Sem origem/irmãs → `[]` sem ir ao banco; erro → `[]` (bloco
 * opcional da página).
 */
export async function fetchServiceSiblings(
  service: { id: string | number; uid: string; extras?: Record<string, unknown> | null },
  cityIbge: string | null | undefined,
  regions: RegionConfig[]
): Promise<ServiceSibling[]> {
  const origem = (service.extras?.origem ?? null) as Record<string, unknown> | null;
  const idFilme = text(origem?.id_filme);
  const fonte = text(origem?.fonte);
  const sisters = regionCitiesFor(regions, cityIbge).slice(1);
  if (!idFilme || sisters.length === 0) return [];

  try {
    const now = new Date().toISOString().slice(0, 19) + 'Z';
    const others = await serverFetchResource<SiblingService>(
      'services',
      {
        active: 'true',
        status: 'active',
        'extras->origem->>id_filme': idFilme,
        ...(fonte ? { 'extras->origem->>fonte': fonte } : {}),
      },
      {
        auth: null,
        limit: 50,
        where: { uid: `neq.${service.uid}`, or: `(expires_at.is.null,expires_at.gt.${now})` },
      }
    );
    if (others.length === 0) return [];

    const addresses = await serverFetchResource<SiblingAddress>(
      'service_addresses',
      { active: 'true' },
      {
        auth: null,
        limit: 50,
        where: {
          service_id: `in.(${others.map((o) => o.id).join(',')})`,
          city_ibge: `in.(${sisters.join(',')})`,
        },
      }
    );

    const byId = new Map(others.map((o) => [String(o.id), o]));
    const groups = new Map<string, ServiceSibling>();
    for (const a of addresses) {
      const other = byId.get(String(a.serviceId ?? a.service_id ?? ''));
      const ibge = text(a.cityIbge ?? a.city_ibge);
      if (!other || !ibge) continue;
      const key = `${other.uid}:${ibge}`;
      const group = groups.get(key) ?? {
        uid: other.uid,
        title: other.title,
        city: text(a.city),
        state: text(a.state),
        cityIbge: ibge,
        places: [],
      };
      const label = text(a.label);
      if (label && !group.places.includes(label)) group.places.push(label);
      groups.set(key, group);
    }
    return [...groups.values()]
      .map((g) => ({ ...g, places: [...g.places].sort((x, y) => x.localeCompare(y, 'pt-BR')) }))
      .sort(
        (x, y) =>
          sisters.indexOf(x.cityIbge) - sisters.indexOf(y.cityIbge) ||
          x.title.localeCompare(y.title, 'pt-BR')
      );
  } catch {
    return [];
  }
}
