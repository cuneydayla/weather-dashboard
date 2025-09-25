import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GeolocService {
  coords = signal<{ lat: number; lon: number } | null>(null);

  requestOnce() {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        this.coords.set({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        }),
      (_err) => this.coords.set(null),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }
}
