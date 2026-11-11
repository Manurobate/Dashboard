import { Injectable, signal, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export const THEME_STORAGE_KEY = 'theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly _isDark = signal(false);
  readonly isDark = this._isDark.asReadonly();
  /** Préférence mémorisée, à restaurer à la fin d'un forçage (vue publique). */
  private storedDark = false;

  constructor() {
    let saved: string | null = null;
    try {
      saved = this.doc.defaultView?.localStorage.getItem(THEME_STORAGE_KEY) ?? null;
    } catch {
      /* localStorage inaccessible (navigation privée, SecurityError) */
    }
    const dark = saved === 'dark';
    this.storedDark = dark;
    this._isDark.set(dark);
    this.applyTheme(dark);
  }

  toggle(): void {
    const next = !this._isDark();
    this.storedDark = next;
    this._isDark.set(next);
    this.applyTheme(next);
    try {
      this.doc.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
    } catch {
      /* localStorage inaccessible (navigation privée, quota) */
    }
  }

  /**
   * Affiche le thème clair sans toucher à la préférence mémorisée (vue publique,
   * clair par défaut pour les visiteurs). `isDark()` reflète le thème affiché :
   * un clic sur le bouton bascule et mémorise comme ailleurs.
   */
  forceLight(): void {
    this._isDark.set(false);
    this.applyTheme(false);
  }

  /** Réapplique la préférence mémorisée (fin de la vue publique). */
  restorePreference(): void {
    this._isDark.set(this.storedDark);
    this.applyTheme(this.storedDark);
  }

  private applyTheme(dark: boolean): void {
    this.doc.body.classList.toggle('dark-theme', dark);
  }
}
