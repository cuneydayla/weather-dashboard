import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
export interface RuntimeEnv { OWM_API_KEY?: string }
export const RUNTIME_ENV: RuntimeEnv = (window as any).__env || {};
export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideHttpClient()]
};
