import { Injectable, signal } from '@angular/core';
import type { Units } from '../models/weather.models';

const KEY = 'unitPreference';

@Injectable({ providedIn: 'root' })
export class UnitService {
  unit = signal<Units>(this.getInitial());

  private getInitial(): Units {
    const saved = localStorage.getItem(KEY);
    return saved === 'imperial' ? 'imperial' : 'metric';
  }

  setUnit(u: Units) {
    this.unit.set(u);
    localStorage.setItem(KEY, u);
  }

  toggle() {
    this.setUnit(this.unit() === 'metric' ? 'imperial' : 'metric');
  }
}
