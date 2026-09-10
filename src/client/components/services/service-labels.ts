// Display labels for the `services` plugin enums (`service_status` / `service_location` /
// `price_unit`). The labels live with the plugin whose enums they name.
// i18n(track-e): services.enums.*  (pt-BR inline for now)

export const SERVICE_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  active: 'Ativo',
  paused: 'Pausado',
  archived: 'Arquivado',
};

export const SERVICE_LOCATION_LABEL: Record<string, string> = {
  no_cliente: 'No cliente',
  no_estabelecimento: 'No estabelecimento',
  remoto: 'A Distância',
};

export const PRICE_UNIT_LABEL: Record<string, string> = {
  quote: 'sob consulta',
  service: 'por serviço',
  hour: 'por hora',
  fixed: 'fixo',
  unit: 'por unidade',
  visit: 'por visita',
  m2_metro_quadrado: 'por m²',
  project: 'por projeto',
  package: 'por pacote',
  monthly: 'mensal',
  day: 'por diária',
  km: 'por km',
};
