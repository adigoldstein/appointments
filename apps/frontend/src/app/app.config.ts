import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '@app/shared/api';
import { authInterceptor } from '@app/shared/auth';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimationsAsync(),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: API_BASE_URL,
      useValue: '/api',
    },
  ],
};
