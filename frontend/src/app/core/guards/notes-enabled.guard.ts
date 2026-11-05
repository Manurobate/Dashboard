import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const notesEnabledGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  let user = authService.currentUser();
  if (!user) {
    try {
      user = await authService.me();
    } catch {
      return router.createUrlTree(['/login']);
    }
  }
  if (!user) return router.createUrlTree(['/login']);
  if (user.notesEnabled) return true;
  return router.createUrlTree(['/dashboard']);
};
