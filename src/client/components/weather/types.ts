// Tipos do plugin weather — compartilhados entre a rota /api/weather (casca) e o widget.

export type WeatherCity = { name: string; latitude: number; longitude: number };

/** Bloco "weather" do kizuna.config.json. */
export type WeatherConfig = {
  cities: WeatherCity[];
  timezone?: string;
  apiUrl?: string;
  cacheSeconds?: number;
  rotateSeconds?: number;
  pastDays?: number;
  forecastDays?: number;
};

export type WeatherDay = { date: string; code: number; max: number; min: number; rain: number };

export type WeatherCityData = {
  name: string;
  current: { temperature: number; code: number; isDay: boolean };
  daily: WeatherDay[];
};

export type WeatherResponse = {
  rotateSeconds: number;
  /** Data de hoje (YYYY-MM-DD) no fuso configurado — destaca o dia no modal. */
  today: string;
  cities: WeatherCityData[];
};
