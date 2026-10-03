'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Moon,
  Sun,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useUserLocation } from '../../hooks/use-user-location';
import { useViewingCity } from '../viewing-city';
import { SelectPopover } from '../ui-better-soft/select-popover';
import type { WeatherResponse } from './types';

// Códigos WMO (Open-Meteo) → ícone + descrição.
function describe(code: number, isDay = true): { icon: LucideIcon; label: string } {
  if (code === 0) return { icon: isDay ? Sun : Moon, label: 'Céu limpo' };
  if (code <= 2) return { icon: isDay ? CloudSun : Cloud, label: 'Poucas nuvens' };
  if (code === 3) return { icon: Cloud, label: 'Nublado' };
  if (code <= 48) return { icon: CloudFog, label: 'Neblina' };
  if (code <= 57) return { icon: CloudDrizzle, label: 'Garoa' };
  if (code <= 67 || (code >= 80 && code <= 82)) return { icon: CloudRain, label: 'Chuva' };
  if (code <= 77 || code === 85 || code === 86) return { icon: CloudSnow, label: 'Neve' };
  return { icon: CloudLightning, label: 'Tempestade' };
}

function dayLabel(date: string, today: string) {
  const diff = Math.round(
    (new Date(`${date}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86400000
  );
  if (diff === -1) return 'Ontem';
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  const label = new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1).replace('-feira', '');
}

function normalize(name: string) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

export type WeatherWidgetProps = {
  /** Rota da casca do plugin weather. Default: '/api/weather'. */
  endpoint?: string;
  /** @deprecated sem efeito — o botão mostra só ícone + temperatura (o nome da cidade saiu). */
  mini?: boolean;
  /**
   * Modal de previsão ao clicar. `false` = só mostra a temperatura, sem clique (config
   * `weather.forecastModal`). Default: `true`.
   */
  forecastModal?: boolean;
};

/**
 * Plugin weather — ícone + temperatura no header (mobile e desktop), sempre na mesma cidade que o
 * topo mostra: a cidade em exibição da URL (`useViewingCity`) ou, sem ela, a salva do usuário
 * (`useUserLocation`); cai na primeira de "weather.cities" se ela não estiver na lista. O nome da
 * cidade não aparece aqui — o seletor de cidade do topo já mostra. Com `forecastModal` (default),
 * o clique abre um modal com ontem, hoje (destacado) e os próximos dias, e um select para
 * consultar outras cidades — escolha local ao modal, não muda a cidade do header.
 */
export function WeatherWidget({
  endpoint = '/api/weather',
  forecastModal = true,
}: WeatherWidgetProps = {}) {
  const [data, setData] = useState<WeatherResponse | null>(null);
  const { location } = useUserLocation();
  const viewing = useViewingCity();
  const [selected, setSelected] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    fetch(endpoint)
      .then((res) => (res.ok ? res.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, [endpoint]);

  if (!data || data.cities.length === 0) return null;

  const headerCityName = viewing?.cityName ?? location?.cityName;
  const userCityIndex = headerCityName
    ? data.cities.findIndex((c) => normalize(c.name) === normalize(headerCityName))
    : -1;
  const index = Math.max(userCityIndex, 0);

  const city = data.cities[index];
  const now = describe(city.current.code, city.current.isDay);
  const NowIcon = now.icon;

  const modalCity = data.cities[selected];
  const modalNow = describe(modalCity.current.code, modalCity.current.isDay);
  const ModalIcon = modalNow.icon;

  const label = `${city.name}: ${city.current.temperature}°C, ${now.label}`;
  const chipClass =
    'flex h-9 min-w-0 items-center gap-1.5 rounded-full bg-secondary px-3 text-sm text-secondary-foreground';
  const chipContent = (
    <>
      <NowIcon className="h-4 w-4 text-primary" />
      <span className="font-semibold">{city.current.temperature}°</span>
    </>
  );

  if (!forecastModal) {
    return (
      <span role="img" aria-label={label} title={label} className={chipClass}>
        {chipContent}
      </span>
    );
  }

  function openModal() {
    setSelected(index);
    dialogRef.current?.showModal();
  }

  function closeModal() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        aria-label={`${label}. Ver previsão`}
        title={label}
        className={cn(chipClass, 'transition-colors hover:bg-secondary/80')}
      >
        {chipContent}
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => e.target === dialogRef.current && closeModal()}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-[var(--ui-radius-card,1rem)] border-[length:var(--ui-border-w-card,1px)] border-border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <div className="p-5">
          <div className="flex items-center justify-between gap-3">
            <SelectPopover
              value={selected}
              options={data.cities.map((c, i) => ({ value: i, label: c.name }))}
              onChange={setSelected}
              ariaLabel="Cidade"
              className="font-semibold"
            />
            <button
              type="button"
              onClick={closeModal}
              aria-label="Fechar"
              className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <ModalIcon className="h-10 w-10 text-primary" />
            <div>
              <p className="text-4xl font-bold leading-none">{modalCity.current.temperature}°C</p>
              <p className="mt-1 text-sm text-muted-foreground">{modalNow.label} agora</p>
            </div>
          </div>

          <ul className="mt-4 space-y-1">
            {modalCity.daily.map((day) => {
              const { icon: Icon, label } = describe(day.code);
              const isToday = day.date === data.today;
              const isPast = day.date < data.today;
              return (
                <li
                  key={day.date}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
                    isToday && 'bg-primary/10 ring-1 ring-primary/40',
                    isPast && 'opacity-60'
                  )}
                >
                  <span className={cn('w-20', isToday ? 'font-bold text-primary' : 'font-medium')}>
                    {dayLabel(day.date, data.today)}
                  </span>
                  <Icon className="h-5 w-5 shrink-0 text-primary" aria-label={label} />
                  <span className="flex w-12 items-center gap-0.5 text-xs text-info">
                    <Droplets className="h-3 w-3" />
                    {day.rain}%
                  </span>
                  <span className="ml-auto tabular-nums">
                    <span className="font-semibold">{day.max}°</span>
                    <span className="ml-2 text-muted-foreground">{day.min}°</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </dialog>
    </>
  );
}
