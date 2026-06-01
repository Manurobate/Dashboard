import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let mockDocument: Document;

  beforeEach(() => {
    mockDocument = {
      body: document.createElement('body'),
      defaultView: {
        localStorage: {
          getItem: vi.fn().mockReturnValue(null),
          setItem: vi.fn(),
        },
      },
    } as unknown as Document;

    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: mockDocument }],
    });
  });

  afterEach(() => {
    mockDocument.body.classList.remove('dark-theme');
  });

  it('devrait être créé', () => {
    service = TestBed.inject(ThemeService);
    expect(service).toBeTruthy();
  });

  it('isDark vaut false quand localStorage ne contient rien', () => {
    service = TestBed.inject(ThemeService);
    expect(service.isDark()).toBe(false);
  });

  it('isDark vaut true quand localStorage contient "dark"', () => {
    (mockDocument.defaultView!.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
      'dark',
    );
    service = TestBed.inject(ThemeService);
    expect(service.isDark()).toBe(true);
    expect(mockDocument.body.classList.contains('dark-theme')).toBe(true);
  });

  it('toggle() passe de light à dark et persiste dans localStorage', () => {
    service = TestBed.inject(ThemeService);
    service.toggle();
    expect(service.isDark()).toBe(true);
    expect(mockDocument.body.classList.contains('dark-theme')).toBe(true);
    expect(mockDocument.defaultView!.localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  it('toggle() passe de dark à light et persiste dans localStorage', () => {
    (mockDocument.defaultView!.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
      'dark',
    );
    service = TestBed.inject(ThemeService);
    service.toggle();
    expect(service.isDark()).toBe(false);
    expect(mockDocument.body.classList.contains('dark-theme')).toBe(false);
    expect(mockDocument.defaultView!.localStorage.setItem).toHaveBeenCalledWith('theme', 'light');
  });
});
