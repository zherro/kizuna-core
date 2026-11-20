/**
 * Regra da detecção por IP, a MESMA no navegador (`useUserLocation`) e no servidor (rota
 * `/api/location/ip` que já devolve a cidade resolvida, numa ida só): o que o provedor de IP
 * devolveu vira o par UF + cidade que segue para o `resolve`.
 */

/** Países da América Latina e Caribe (ISO 3166-1 alpha-2) — IP fora daqui não é usado. */
export const LATIN_AMERICA_COUNTRY_CODES: ReadonlySet<string> = new Set([
  'AR',
  'BO',
  'BR',
  'CL',
  'CO',
  'CR',
  'CU',
  'DO',
  'EC',
  'SV',
  'GT',
  'HN',
  'MX',
  'NI',
  'PA',
  'PY',
  'PE',
  'PR',
  'UY',
  'VE', // América Latina "central"
  'BZ',
  'GY',
  'SR',
  'GF', // vizinhos geográficos da região (Belize, Guianas)
  'HT',
  'JM',
  'TT',
  'BS',
  'BB', // Caribe
]);

/**
 * IP fora da América Latina (VPN, acesso de fora): a região do provedor não faz sentido pra um
 * marketplace brasileiro — detecta como São Paulo, que o `resolve` troca pela cidade padrão
 * (ou por nada, com `outsideList: "prompt"`) se não estiver na lista.
 */
export const FOREIGN_IP_FALLBACK = { stateCode: 'SP', cityName: 'São Paulo' } as const;

export type IpLookupResult = {
  stateCode?: string;
  cityName?: string;
  countryCode?: string;
};

/**
 * UF + cidade a validar no `resolve`, a partir da resposta do provedor de IP. `null` = nada
 * aproveitável (sem resposta, ou país da região sem UF): o `resolve` vai sem UF e devolve a cidade
 * padrão do projeto, se houver.
 */
export function ipDetectionTarget(
  data: IpLookupResult | null | undefined
): { stateCode: string; cityName: string } | null {
  if (!data) return null;
  if (!data.countryCode || !LATIN_AMERICA_COUNTRY_CODES.has(data.countryCode)) {
    return { ...FOREIGN_IP_FALLBACK };
  }
  if (data.stateCode) return { stateCode: data.stateCode, cityName: data.cityName ?? '' };
  return null;
}
