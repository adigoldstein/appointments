import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { RouteReuseStrategy, provideRouter } from '@angular/router';
import { ActingContextReuseStrategy } from '@app/shared/acting-context';
import { API_BASE_URL } from '@app/shared/api';
import { authInterceptor } from '@app/shared/auth';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimationsAsync(),
    provideRouter(appRoutes),
    { provide: RouteReuseStrategy, useClass: ActingContextReuseStrategy },
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: API_BASE_URL,
      useValue: '/api',
    },
  ],
};
