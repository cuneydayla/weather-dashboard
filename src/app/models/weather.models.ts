export type Units = 'metric' | 'imperial';

export interface CurrentWeather {
  city: string;
  country: string;
  dt: number;
  temp: number;
  humidity: number;
  wind: number;
  description: string;
  icon: string;
  lat: number;
  lon: number;
  sunrise: number;
  sunset: number;
  timezoneOffset: number;

  precipitation?: number;
  aqi?: number;
}

export interface DailyForecast {
  date: string;
  min: number;
  max: number;
  icon: string;
  description: string;
}

export interface HourlyPoint {
  time: string;
  temp: number;
  icon: string;
  description: string;
}

export interface SearchQuery {
  raw: string;
  isZip: boolean;
  country?: string;
}
