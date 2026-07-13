import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { BehaviorSubject, EMPTY, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshSubject = new BehaviorSubject<boolean | null>(null);

// Préfixes de routes publiques (accès sans authentification) : un 401 y est
// légitime (ex. l'appel de bootstrap /api/auth/me pour un visiteur non connecté)
// et ne doit déclencher ni refresh ni redirection vers /login.
const PUBLIC_ROUTE_PREFIXES = ['/share'];

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const doc = inject(DOCUMENT);

  // On lit location.pathname (et non router.url) car au bootstrap, la navigation
  // Angular initiale n'est pas encore résolue quand APP_INITIALIZER appelle me().
  const isPublicRoute = PUBLIC_ROUTE_PREFIXES.some((prefix) =>
    doc.location.pathname.startsWith(prefix),
  );

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status !== 401 ||
        isPublicRoute ||
        req.url.includes('/api/auth/refresh') ||
        req.url.includes('/api/auth/login') ||
        req.url.includes('/api/auth/update-password')
      ) {
        return throwError(() => error);
      }

      if (isRefreshing) {
        return refreshSubject.pipe(
          filter((v): v is boolean => v !== null),
          take(1),
          switchMap((success) => (success ? next(req) : EMPTY)),
        );
      }

      isRefreshing = true;
      refreshSubject.next(null);

      return authService.refreshToken().pipe(
        switchMap((success) => {
          isRefreshing = false;
          refreshSubject.next(success);
          if (!success) {
            void router.navigate(['/login']);
            return EMPTY;
          }
          return next(req);
        }),
        catchError((err) => {
          isRefreshing = false;
          refreshSubject.next(false);
          void router.navigate(['/login']);
          return throwError(() => err);
        }),
      );
    }),
  );
};
