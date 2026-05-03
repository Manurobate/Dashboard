import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  EMPTY,
  catchError,
  filter,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshSubject = new BehaviorSubject<boolean | null>(null);

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || req.url.includes('/api/auth/refresh') || req.url.includes('/api/auth/login') || req.url.includes('/api/auth/update-password')) {
        return throwError(() => error);
      }

      if (isRefreshing) {
        return refreshSubject.pipe(
          filter((v): v is boolean => v !== null),
          take(1),
          switchMap(success => success ? next(req) : EMPTY),
        );
      }

      isRefreshing = true;
      refreshSubject.next(null);

      return authService.refreshToken().pipe(
        switchMap(success => {
          isRefreshing = false;
          refreshSubject.next(success);
          if (!success) {
            void router.navigate(['/login']);
            return EMPTY;
          }
          return next(req);
        }),
        catchError(err => {
          isRefreshing = false;
          refreshSubject.next(false);
          void router.navigate(['/login']);
          return throwError(() => err);
        }),
      );
    }),
  );
};
