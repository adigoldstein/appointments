import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '@app/shared/api';
import { SessionStore } from './session.store';
import { TokenRefreshService } from './token-refresh.service';

const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiBaseUrl = inject(API_BASE_URL);
  const sessionStore = inject(SessionStore);
  const tokenRefresh = inject(TokenRefreshService);
  const router = inject(Router);

  const isBackendRequest = req.url.startsWith(apiBaseUrl);
  const isPublicAuthEndpoint = PUBLIC_AUTH_PATHS.some(
    (path) => req.url === `${apiBaseUrl}${path}`,
  );

  if (!isBackendRequest || isPublicAuthEndpoint) {
    return next(req);
  }

  const accessToken = sessionStore.accessToken();
  const authReq = accessToken
    ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      const isUnauthorized = error instanceof HttpErrorResponse && error.status === 401;

      if (!isUnauthorized || !sessionStore.isAuthenticated()) {
        return throwError(() => error);
      }

      return tokenRefresh.refreshAccessToken().pipe(
        switchMap((newAccessToken) =>
          next(req.clone({ setHeaders: { Authorization: `Bearer ${newAccessToken}` } })),
        ),
        catchError((refreshError: unknown) => {
          router.navigateByUrl('/auth');
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
