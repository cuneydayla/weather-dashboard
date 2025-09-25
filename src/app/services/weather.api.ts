import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import {
  DailyForecast,
  CurrentWeather,
  HourlyPoint,
  Units,
} from '../models/weather.models';
import { environment } from '../../environments/environment';
import { RUNTIME_ENV } from '../app.config';

@Injectable({ providedIn: 'root' })
export class WeatherApi {
  private http = inject(HttpClient);
  private base = 'https://api.openweathermap.org/data/2.5';

  private key(): string {
    return (RUNTIME_ENV.OWM_API_KEY || environment.owmApiKey || '').trim();
  }

  private params(units: Units) {
    return new HttpParams().set('appid', this.key()).set('units', units);
  }

  searchCurrentByCoords(lat: number, lon: number, units: Units) {
    const params = this.params(units).set('lat', lat).set('lon', lon);
    return this.http
      .get<any>(`${this.base}/weather`, { params })
      .pipe(map((j) => this.toCurrent(j)));
  }

  searchCurrentByCity(city: string, units: Units): Observable<CurrentWeather> {
    const params = this.params(units).set('q', city);
    return this.http
      .get<any>(`${this.base}/weather`, { params })
      .pipe(map((json) => this.toCurrent(json)));
  }

  searchCurrentByZip(
    zip: string,
    country: string,
    units: Units
  ): Observable<CurrentWeather> {
    const params = this.params(units).set('zip', `${zip},${country}`);
    return this.http
      .get<any>(`${this.base}/weather`, { params })
      .pipe(map((json) => this.toCurrent(json)));
  }

  forecast5d(
    cityOrCoords: { city?: string; lat?: number; lon?: number },
    units: Units
  ) {
    let params = this.params(units);
    if (cityOrCoords.city) params = params.set('q', cityOrCoords.city);
    if (cityOrCoords.lat != null && cityOrCoords.lon != null) {
      params = params.set('lat', cityOrCoords.lat).set('lon', cityOrCoords.lon);
    }
    return this.http
      .get<any>(`${this.base}/forecast`, { params })
      .pipe(map((json) => this.toForecast(json)));
  }

  getAQI(lat: number, lon: number) {
    const params = new HttpParams()
      .set('appid', this.key())
      .set('lat', lat)
      .set('lon', lon);
    return this.http
      .get<any>(`${this.base}/air_pollution`, { params })
      .pipe(map((j) => j?.list?.[0]?.main?.aqi as number | undefined));
  }

  private toCurrent(j: any): CurrentWeather {
    const rain1h = j.rain?.['1h'] ?? 0;
    const snow1h = j.snow?.['1h'] ?? 0;
    return {
      city: j.name,
      country: j.sys?.country || '',
      dt: j.dt * 1000,
      temp: j.main?.temp,
      humidity: j.main?.humidity,
      wind: j.wind?.speed,
      description: j.weather?.[0]?.description || '',
      icon: j.weather?.[0]?.icon || '01d',
      lat: j.coord?.lat,
      lon: j.coord?.lon,
      sunrise: (j.sys?.sunrise ?? 0) * 1000,
      sunset: (j.sys?.sunset ?? 0) * 1000,
      timezoneOffset: j.timezone ?? 0,
      precipitation: rain1h || snow1h ? rain1h || snow1h : 0,
    };
  }

  private toForecast(j: any): {
    daily: DailyForecast[];
    hourly: HourlyPoint[];
  } {
    const byDay = new Map<
      string,
      { min: number; max: number; icon: string; description: string }
    >();
    const hourly: HourlyPoint[] = [];

    for (const item of j.list || []) {
      const date = new Date(item.dt * 1000);
      const dayKey = date.toISOString().slice(0, 10);
      const temp = item.main?.temp;
      const icon = item.weather?.[0]?.icon || '01d';
      const description = item.weather?.[0]?.description || '';

      if (hourly.length < 8) {
        hourly.push({
          time: date.toTimeString().slice(0, 5),
          temp,
          icon,
          description,
        });
      }

      const day = byDay.get(dayKey) || {
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY,
        icon,
        description,
      };
      day.min = Math.min(day.min, temp);
      day.max = Math.max(day.max, temp);
      byDay.set(dayKey, { ...day, icon, description });
    }

    const daily: DailyForecast[] = Array.from(byDay.entries())
      .map(([date, v]) => ({
        date,
        min: Math.round(v.min),
        max: Math.round(v.max),
        icon: v.icon,
        description: v.description,
      }))
      .slice(0, 5);

    return { daily, hourly };
  }
}
