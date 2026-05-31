import { TestBed } from '@angular/core/testing';
import { LinksGridSettingsService } from './links-grid-settings.service';

describe('LinksGridSettingsService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });
  afterEach(() => localStorage.clear());

  it('utilise les valeurs par défaut si localStorage est vide', () => {
    const svc = TestBed.inject(LinksGridSettingsService);
    expect(svc.gridSettings()).toEqual({ columns: 3, cardWidth: 280, gapH: 16, gapV: 16 });
  });

  it('restaure les paramètres depuis localStorage', () => {
    localStorage.setItem(
      'links-grid-settings',
      JSON.stringify({ columns: 5, cardWidth: 350, gapH: 24, gapV: 24 }),
    );
    const svc = TestBed.inject(LinksGridSettingsService);
    expect(svc.gridSettings()).toEqual({ columns: 5, cardWidth: 350, gapH: 24, gapV: 24 });
  });

  it('updateSettings() met à jour le signal et persiste dans localStorage', () => {
    const svc = TestBed.inject(LinksGridSettingsService);
    TestBed.flushEffects();
    svc.updateSettings({ columns: 5 });
    TestBed.flushEffects();
    expect(svc.gridSettings().columns).toBe(5);
    const stored = JSON.parse(localStorage.getItem('links-grid-settings')!);
    expect(stored.columns).toBe(5);
  });

  it('retourne les valeurs par défaut si le localStorage est corrompu', () => {
    localStorage.setItem('links-grid-settings', '{invalid-json}');
    const svc = TestBed.inject(LinksGridSettingsService);
    expect(svc.gridSettings()).toEqual({ columns: 3, cardWidth: 280, gapH: 16, gapV: 16 });
  });
});
