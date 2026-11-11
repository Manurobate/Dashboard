import { Injectable, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export const ANIMATIONS_STORAGE_KEY = 'animations';
export const NO_MOTION_CLASS = 'no-motion';

/**
 * Réglage « Animations » (FR51, A16) : actif par défaut, désactivé au départ si le
 * système demande de réduire les animations et que l'utilisateur n'a rien choisi.
 * Un choix explicite est mémorisé sur l'appareil et prime sur le système.
 * Désactivé, `body.no-motion` neutralise animations et transitions (styles.scss).
 */
@Injectable({ providedIn: 'root' })
export class MotionService {
  private readonly doc = inject(DOCUMENT);
  private readonly _enabled = signal(true);
  readonly enabled = this._enabled.asReadonly();

  constructor() {
    const win = this.doc.defaultView;
    let saved: string | null = null;
    try {
      saved = win?.localStorage.getItem(ANIMATIONS_STORAGE_KEY) ?? null;
    } catch {
      /* localStorage inaccessible (navigation privée, SecurityError) */
    }
    let enabled: boolean;
    if (saved === 'on' || saved === 'off') {
      enabled = saved === 'on';
    } else {
      enabled = !(win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
    }
    this.apply(enabled);
  }

  setEnabled(enabled: boolean): void {
    this.apply(enabled);
    try {
      this.doc.defaultView?.localStorage.setItem(ANIMATIONS_STORAGE_KEY, enabled ? 'on' : 'off');
    } catch {
      /* localStorage inaccessible (navigation privée, quota) : choix gardé pour la session */
    }
  }

  private apply(enabled: boolean): void {
    this._enabled.set(enabled);
    this.doc.body.classList.toggle(NO_MOTION_CLASS, !enabled);
  }
}
