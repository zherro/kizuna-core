const round = (n: number) => Number(n.toFixed(6));

/**
 * URL da incorporação do OpenStreetMap (sem chave): caixa de `span` graus ao redor do ponto, com
 * marcador. `span` padrão 0,006 grau (cerca de 650 m).
 */
export function osmEmbedUrl({ lat, lng, span = 0.006 }: { lat: number; lng: number; span?: number }): string {
  const half = span / 2;
  const bbox = [lng - half, lat - half, lng + half, lat + half].map(round).join(',');
  const params = [
    `bbox=${encodeURIComponent(bbox)}`,
    'layer=mapnik',
    `marker=${encodeURIComponent(`${lat},${lng}`)}`,
  ];
  return `https://www.openstreetmap.org/export/embed.html?${params.join('&')}`;
}

/** Página do OpenStreetMap com o ponto marcado (link "ver mapa maior" e atribuição). */
export function osmViewUrl({ lat, lng }: { lat: number; lng: number }): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
}
