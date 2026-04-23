import { Injectable, signal, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export const THEME_STORAGE_KEY = 'theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly _isDark = signal(false);
  readonly isDark = this._isDark.asReadonly();

  constructor() {
    let saved: string | null = null;
    try {
      saved = this.doc.defaultView?.localStorage.getItem(THEME_STORAGE_KEY) ?? null;
    } catch { /* localStorage inaccessible (navigation privée, SecurityError) */ }
    const dark = saved === 'dark';
    this._isDark.set(dark);
    this.applyTheme(dark);
  }

  toggle(): void {
    const next = !this._isDark();
    this._isDark.set(next);
    this.applyTheme(next);
    try {
      this.doc.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
    } catch { /* localStorage inaccessible (navigation privée, quota) */ }
  }

  private applyTheme(dark: boolean): void {
    this.doc.body.classList.toggle('dark-theme', dark);
  }
}
