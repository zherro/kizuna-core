type LocationFields = {
  city?: string | null;
  state?: string | null;
  address_count?: number | null;
};

/**
 * Etiqueta de local do cartão: "Cuiabá", "Cuiabá +2" (mais endereços) ou "MT" quando só há UF.
 * Retorna `null` sem cidade nem UF (RPC antiga ou serviço remoto sem endereço).
 */
export function formatLocationLabel(r: LocationFields): string | null {
  const city = r.city?.trim();
  const state = r.state?.trim();
  const base = city || state;
  if (!base) return null;
  const extra = Number(r.address_count ?? 0) - 1;
  return extra > 0 ? `${base} +${extra}` : base;
}
