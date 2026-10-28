'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LatLng } from '../../../shared/maps';
import { useCurrentPosition } from '../../hooks/use-current-position';
import { pinKey, type MapPinRow, type SearchArea } from './map-api';
import type { MapGroupStyles } from './map-styles';
import { PlaceBar } from './place-bar';
import { PlaceDetailPanel } from './place-detail';
import { PlaceSheet } from './place-sheet';
import { PlacesMap, type MapFocusRequest, type MapPlace } from './places-map';
import { usePlaceDetail } from './use-place-detail';
import { useMapPins } from './use-map-pins';
import { thumbUrl } from '../services/service-helpers';

export const DEFAULT_MAP_CENTER: LatLng = { lat: -15.601, lng: -56.097 };

export type PlacesExplorerProps = {
  /** Onde o mapa abre (padrão: Cuiabá). */
  center?: LatLng;
  zoom?: number;
  /** Estilo do pino por `category_group_slug` (cor, ícone, legenda). */
  groupStyles?: MapGroupStyles;
  /** Base das RPCs (padrão `/api/resources`). */
  endpoint?: string;
  routeEndpoint?: string;
  className?: string;
};

export function toMapPlace(row: MapPinRow): MapPlace {
  return {
    id: pinKey(row),
    uid: row.uid,
    title: row.title,
    kicker: [row.venue, row.city].filter(Boolean).join(' · ') || undefined,
    lat: row.latitude,
    lng: row.longitude,
    groupSlug: row.category_group_slug,
    imageUrl: row.cover_file_id ? thumbUrl(row.cover_file_id) : null,
    city: row.city,
    state: row.state,
  };
}

/**
 * Tela de mapa completa: `PlacesMap` + busca de pinos por raio + barra do topo do pino selecionado
 * + painel de detalhe sob demanda + "Perto de mim". Ocupa o espaço que o pai der (`data-fill` no
 * layout do site). A posição do aparelho só é pedida no clique de "Perto de mim" (ou de "Calcular
 * rota"), nunca ao montar; o mapa abre no `center` e a busca só começa depois de medir o quadro.
 */
export function PlacesExplorer({
  center = DEFAULT_MAP_CENTER,
  zoom = 14,
  groupStyles,
  endpoint,
  routeEndpoint,
  className,
}: PlacesExplorerProps) {
  const [area, setArea] = useState<SearchArea | null>(null);
  const [selected, setSelected] = useState<MapPlace | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [focus, setFocus] = useState<MapFocusRequest | null>(null);
  const geo = useCurrentPosition();
  const { pins, loading, error, loaded } = useMapPins(area, { endpoint });
  const { state: detail, retry } = usePlaceDetail(sheetOpen ? (selected?.uid ?? null) : null, endpoint);

  // O pino selecionado continua desenhado mesmo se sair do cache.
  const places = useMemo(() => {
    const list = pins.map(toMapPlace);
    return selected && !list.some((p) => p.id === selected.id) ? [...list, selected] : list;
  }, [pins, selected]);

  // Centra no usuário assim que a posição chega (ou muda).
  useEffect(() => {
    if (geo.position) setFocus((f) => ({ lat: geo.position!.lat, lng: geo.position!.lng, nonce: (f?.nonce ?? 0) + 1 }));
  }, [geo.position]);

  const locate = () => {
    // Já sabemos onde está: só centra de novo, sem pedir outra vez.
    if (geo.position) setFocus((f) => ({ lat: geo.position!.lat, lng: geo.position!.lng, nonce: (f?.nonce ?? 0) + 1 }));
    else geo.request();
  };

  const select = (id: string | null) => {
    setSelected(id ? (places.find((p) => p.id === id) ?? null) : null);
    if (!id) setSheetOpen(false);
  };

  const locateMessage =
    geo.status === 'denied'
      ? 'Sem acesso à sua localização. Libere nas configurações do navegador.'
      : geo.status === 'unavailable'
        ? 'Não deu para pegar sua localização agora.'
        : null;

  const notice = error
    ? 'Não deu para carregar os lugares agora. Mova o mapa para tentar de novo.'
    : loading
      ? 'Buscando lugares…'
      : loaded && pins.length === 0
        ? 'Ainda estamos marcando os lugares no mapa.'
        : null;

  return (
    <div data-fill className={className ?? 'relative min-h-[max(30rem,calc(100dvh-4rem-var(--mobile-tab-h,0px)))] flex-1'}>
      <div className="absolute inset-0">
        <PlacesMap
          places={places}
          selectedId={selected?.id ?? null}
          onSelect={select}
          groupStyles={groupStyles}
          initialCenter={center}
          initialZoom={zoom}
          onAreaChange={setArea}
          userPosition={geo.position}
          focusRequest={focus}
          onLocate={locate}
          locating={geo.status === 'asking'}
          locateMessage={locateMessage}
          notice={notice}
          topSlot={
            selected ? (
              <PlaceBar
                key={selected.id}
                place={selected}
                routeEndpoint={routeEndpoint}
                onMore={() => setSheetOpen(true)}
                onClose={() => select(null)}
              />
            ) : null
          }
        />
      </div>
      {selected ? (
        <PlaceSheet open={sheetOpen} onOpenChange={setSheetOpen} title={selected.title}>
          <PlaceDetailPanel place={selected} state={detail} onRetry={retry} />
        </PlaceSheet>
      ) : null}
    </div>
  );
}
