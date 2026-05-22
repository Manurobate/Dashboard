import { Injectable, signal, effect } from '@angular/core';

export interface GridSettings {
  columns: number;
  cardWidth: number;
  gapH: number;
  gapV: number;
}

const DEFAULTS: GridSettings = { columns: 3, cardWidth: 280, gapH: 16, gapV: 16 };
const STORAGE_KEY = 'links-grid-settings';

@Injectable({ providedIn: 'root' })
export class LinksGridSettingsService {
  readonly gridSettings = signal<GridSettings>(this.loadFromStorage());

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.gridSettings()));
      } catch {
        // Storage quota exceeded or private browsing write restriction — ignore
      }
    });
  }

  private loadFromStorage(): GridSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw) as Partial<GridSettings>;
      return {
        columns: this.clamp(parsed.columns, 1, 6, DEFAULTS.columns),
        cardWidth: this.clamp(parsed.cardWidth, 200, 600, DEFAULTS.cardWidth),
        gapH: this.clamp(parsed.gapH, 8, 48, DEFAULTS.gapH),
        gapV: this.clamp(parsed.gapV, 8, 48, DEFAULTS.gapV),
      };
    } catch {
      return { ...DEFAULTS };
    }
  }

  private clamp(value: unknown, min: number, max: number, fallback: number): number {
    if (typeof value !== 'number' || !isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, value));
  }

  updateSettings(partial: Partial<GridSettings>): void {
    this.gridSettings.update((s) => ({ ...s, ...partial }));
  }
}
