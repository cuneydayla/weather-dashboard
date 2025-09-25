import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GeolocService {
  coords = signal<{ lat: number; lon: number } | null>(null);

  getOnce(): Promise<{ lat: number; lon: number }> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          this.coords.set(c);
          resolve(c);
        },
        (err) => reject(err),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  onGranted(callback: () => void) {
    if (navigator.permissions?.query) {
      // @ts-ignore
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status: any) => {
          status.onchange = () => {
            if (status.state === 'granted') callback();
          };
        })
        .catch(() => {});
    }
  }
}
