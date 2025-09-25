import { Component, effect, HostBinding, inject, signal } from '@angular/core';
import {
  CurrentWeather,
  DailyForecast,
  HourlyPoint,
} from './models/weather.models';
import { GeolocService } from './services/geoloc.service';
import { UnitService } from './services/unit.service';
import { WeatherApi } from './services/weather.api';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  private api = inject(WeatherApi);
  private units = inject(UnitService);
  private geo = inject(GeolocService);

  unit = this.units.unit;
  query = '';

  loading = signal(false);
  error = signal('');

  current = signal<CurrentWeather | null>(null);
  daily = signal<DailyForecast[]>([]);
  hourly = signal<HourlyPoint[]>([]);

  constructor() {
    const last = localStorage.getItem('last');
    if (last?.startsWith('q:')) {
      this.query = last.slice(2);
      this.onSearch();
    } else if (last?.startsWith('geo:')) {
      const [lat, lon] = last.slice(4).split(',').map(Number);
      if (!Number.isNaN(lat) && !Number.isNaN(lon))
        this.fetchByCoords(lat, lon);
      else this.tryGeolocOnInit();
    } else {
      this.tryGeolocOnInit();
    }
  }

  onType() {
    this.error.set('');
  }

  toggleUnit() {
    this.units.toggle();
    const cur = this.current();
    if (cur) {
      this.fetchByCoords(cur.lat, cur.lon);
    } else if ((this.query || '').trim()) {
      this.onSearch();
    } else {
      this.tryGeolocOnInit();
    }
  }

  iconUrl(code: string) {
    return `https://openweathermap.org/img/wn/${code}@2x.png`;
  }

  useGeoloc(silent = false) {
    this.tryGeolocOnInit(silent);
  }

  async tryGeolocOnInit(silent = true) {
    this.loading.set(true);
    this.error.set('');
    try {
      const c = await this.geo.getOnce();
      this.fetchByCoords(c.lat, c.lon);
    } catch (e: any) {
      this.loading.set(false);
      if (!silent && e?.code !== 1) {
        this.error.set(this.msg(e));
      }
    }
  }

  onSearch() {
    const q = (this.query || '').trim();
    if (!q) {
      this.error.set('Please enter a city or zip.');
      return;
    }
    const isZip = /^\d{3,10}$/.test(q);
    this.loading.set(true);
    this.error.set('');
    const u = this.unit();

    const obs = isZip
      ? this.api.searchCurrentByZip(q, 'TR', u)
      : this.api.searchCurrentByCity(q, u);

    obs.subscribe({
      next: (cw) => {
        this.current.set(cw);
        localStorage.setItem('last', 'q:' + q);
        this.api.getAQI(cw.lat, cw.lon).subscribe((aqi) => {
          const cur = this.current();
          if (cur) this.current.set({ ...cur, aqi });
        });
        this.api.forecast5d({ city: `${cw.city},${cw.country}` }, u).subscribe({
          next: (f) => {
            this.daily.set(f.daily);
            this.hourly.set(f.hourly);
            this.loading.set(false);
          },
          error: (err) => {
            this.loading.set(false);
            this.error.set(this.msg(err));
          },
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(this.msg(err));
      },
    });
  }

  aqiLabel(aqi?: number) {
    switch (aqi) {
      case 1:
        return 'Good';
      case 2:
        return 'Fair';
      case 3:
        return 'Moderate';
      case 4:
        return 'Poor';
      case 5:
        return 'Very Poor';
      default:
        return '—';
    }
  }

  private fetchByCoords(lat: number, lon: number) {
    this.loading.set(true);
    this.error.set('');
    const u = this.unit();

    // fetch current + forecast in parallel
    forkJoin({
      current: this.api.searchCurrentByCoords(lat, lon, u),
      forecast: this.api.forecast5d({ lat, lon }, u),
    }).subscribe({
      next: ({ current, forecast }) => {
        this.current.set(current);
        localStorage.setItem('last', `geo:${lat},${lon}`);
        this.api.getAQI(current.lat, current.lon).subscribe((aqi) => {
          const cur = this.current();
          if (cur) this.current.set({ ...cur, aqi });
        });
        this.daily.set(forecast.daily);
        this.hourly.set(forecast.hourly);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(this.msg(err));
      },
    });
  }

  private msg(err: any) {
    if (err?.error?.message) return err.error.message;
    if (typeof err?.message === 'string') return err.message;
    return 'Something went wrong. Please try again.';
  }
}
