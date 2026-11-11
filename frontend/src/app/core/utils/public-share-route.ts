import { Signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

/** Vrai sur une vue publique de partage (`/share/...`). */
export function isPublicShareUrl(url: string): boolean {
  return url === '/share' || url.startsWith('/share/');
}

/**
 * Signal « la route courante est une vue publique de partage », pour adapter la
 * coque (top bar de 56px, footer de version masqué, maquette 11).
 * À appeler dans un contexte d'injection.
 */
export function injectIsPublicShareRoute(): Signal<boolean> {
  const router = inject(Router);
  return toSignal(
    router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => isPublicShareUrl(router.url)),
    ),
    { initialValue: isPublicShareUrl(router.url) },
  );
}
