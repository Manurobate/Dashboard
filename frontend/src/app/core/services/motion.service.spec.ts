import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { ANIMATIONS_STORAGE_KEY, MotionService } from './motion.service';

describe('MotionService', () => {
  let mockDocument: Document;
  let getItem: ReturnType<typeof vi.fn>;
  let setItem: ReturnType<typeof vi.fn>;
  let reduceMotion: boolean;

  beforeEach(() => {
    reduceMotion = false;
    getItem = vi.fn().mockReturnValue(null);
    setItem = vi.fn();
    mockDocument = {
      body: document.createElement('body'),
      defaultView: {
        localStorage: { getItem, setItem },
        matchMedia: vi.fn((query: string) => ({
          matches: query === '(prefers-reduced-motion: reduce)' && reduceMotion,
        })),
      },
    } as unknown as Document;

    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: mockDocument }],
    });
  });

  const noMotion = () => mockDocument.body.classList.contains('no-motion');

  it('premier lancement sans préférence système : animations actives', () => {
    const service = TestBed.inject(MotionService);
    expect(service.enabled()).toBe(true);
    expect(noMotion()).toBe(false);
  });

  it('système « réduire les animations » sans choix : désactivées', () => {
    reduceMotion = true;
    const service = TestBed.inject(MotionService);
    expect(service.enabled()).toBe(false);
    expect(noMotion()).toBe(true);
  });

  it('un choix mémorisé « on » prime sur le système', () => {
    reduceMotion = true;
    getItem.mockReturnValue('on');
    const service = TestBed.inject(MotionService);
    expect(service.enabled()).toBe(true);
    expect(noMotion()).toBe(false);
  });

  it('un choix mémorisé « off » désactive les animations', () => {
    getItem.mockReturnValue('off');
    const service = TestBed.inject(MotionService);
    expect(service.enabled()).toBe(false);
    expect(noMotion()).toBe(true);
  });

  it('une valeur inconnue est ignorée (repli sur le système)', () => {
    getItem.mockReturnValue('peut-être');
    expect(TestBed.inject(MotionService).enabled()).toBe(true);
  });

  it('setEnabled() applique la classe et mémorise le choix', () => {
    const service = TestBed.inject(MotionService);
    service.setEnabled(false);
    expect(service.enabled()).toBe(false);
    expect(noMotion()).toBe(true);
    expect(setItem).toHaveBeenCalledWith(ANIMATIONS_STORAGE_KEY, 'off');

    service.setEnabled(true);
    expect(noMotion()).toBe(false);
    expect(setItem).toHaveBeenLastCalledWith(ANIMATIONS_STORAGE_KEY, 'on');
  });

  it('localStorage inaccessible : pas d’erreur, choix gardé pour la session', () => {
    getItem.mockImplementation(() => {
      throw new Error('SecurityError');
    });
    setItem.mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const service = TestBed.inject(MotionService);
    expect(service.enabled()).toBe(true);
    expect(() => service.setEnabled(false)).not.toThrow();
    expect(service.enabled()).toBe(false);
    expect(noMotion()).toBe(true);
  });
});
