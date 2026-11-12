import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TriliumEmbedComponent } from './trilium-embed.component';
import { AuthService, AuthUser } from '../../core/services/auth.service';

const baseUser: AuthUser = {
  id: 1,
  username: 'test',
  name: 'Test User',
  role: 'user',
  mustChangePassword: false,
  isActive: true,
  triliumUrl: 'https://trilium.example.com',
  notesEnabled: true,
};

describe('TriliumEmbedComponent', () => {
  const currentUser = signal<AuthUser | null>(baseUser);

  beforeEach(async () => {
    currentUser.set(baseUser);
    await TestBed.configureTestingModule({
      imports: [TriliumEmbedComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: { currentUser } }],
    }).compileComponents();
  });

  afterEach(() => vi.useRealTimers());

  async function render() {
    const fixture = TestBed.createComponent(TriliumEmbedComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('affiche une iframe pointant vers triliumUrl', async () => {
    const { el } = await render();
    const iframe = el.querySelector('iframe');
    expect(iframe).toBeTruthy();
    expect(iframe!.getAttribute('src')).toBe('https://trilium.example.com');
    expect(iframe!.getAttribute('title')).toBe('Trilium Notes');
  });

  it('affiche la barre de chargement jusqu’au load', async () => {
    const { fixture, el } = await render();
    expect(el.querySelector('mat-progress-bar')).toBeTruthy();
    el.querySelector('iframe')!.dispatchEvent(new Event('load'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('mat-progress-bar')).toBeNull();
  });

  it.each([null, '', '   '])('état non configuré pour triliumUrl=%j', async (url) => {
    currentUser.set({ ...baseUser, triliumUrl: url });
    const { el } = await render();
    expect(el.querySelector('iframe')).toBeNull();
    expect(el.querySelector('.empty-state')?.textContent).toContain(
      'Aucune instance Trilium configurée',
    );
    expect(el.querySelector('a[mat-stroked-button]')?.getAttribute('href')).toContain('/settings');
  });

  it('état vide 08 : tuile avec icône SVG, texte existant, CTA avec icône settings', async () => {
    currentUser.set({ ...baseUser, triliumUrl: null });
    const { el } = await render();
    expect(el.querySelector('.empty-tile svg')).toBeTruthy();
    expect(el.querySelector('.empty-hint')?.textContent?.trim()).toBe(
      "Renseignez l'URL de votre instance dans vos paramètres.",
    );
    const cta = el.querySelector('a.empty-cta') as HTMLElement;
    expect(cta.textContent).toContain('Configurer dans Paramètres');
    expect(cta.querySelector('mat-icon')?.textContent?.trim()).toBe('settings');
  });

  it('configuré : iframe dans la carte, barre de chargement hors de la carte', async () => {
    const { el } = await render();
    expect(el.querySelector('.notes-frame iframe')).toBeTruthy();
    expect(el.querySelector('.notes-page > mat-progress-bar')).toBeTruthy();
  });

  it.each(['javascript:alert(1)', 'ftp://x', 'pas une url'])(
    'rejette l’URL non http(s) %s (sécurité)',
    async (url) => {
      currentUser.set({ ...baseUser, triliumUrl: url });
      const { el } = await render();
      expect(el.querySelector('iframe')).toBeNull();
      expect(el.querySelector('.empty-state')).toBeTruthy();
    },
  );

  it('trim l’URL avant utilisation', async () => {
    currentUser.set({ ...baseUser, triliumUrl: '  https://trilium.example.com  ' });
    const { el } = await render();
    expect(el.querySelector('iframe')!.getAttribute('src')).toBe('https://trilium.example.com');
  });

  it('réinitialise le chargement et le timeout quand triliumUrl change', async () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(TriliumEmbedComponent);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    // Premier chargement en timeout → aide affichée, barre masquée.
    await vi.advanceTimersByTimeAsync(15000);
    fixture.detectChanges();
    expect(el.querySelector('.frame-help')).toBeTruthy();

    // Changement d'URL → barre réaffichée, aide masquée, nouveau timer armé.
    currentUser.set({ ...baseUser, triliumUrl: 'https://autre.example.com' });
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
    expect(el.querySelector('iframe')!.getAttribute('src')).toBe('https://autre.example.com');
    expect(el.querySelector('mat-progress-bar')).toBeTruthy();
    expect(el.querySelector('.frame-help')).toBeNull();

    await vi.advanceTimersByTimeAsync(15000);
    fixture.detectChanges();
    expect(el.querySelector('.frame-help')).toBeTruthy();
  });

  it('affiche l’aide après 15 s sans load', async () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(TriliumEmbedComponent);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.frame-help')).toBeNull();
    await vi.advanceTimersByTimeAsync(15000);
    fixture.detectChanges();
    expect(el.querySelector('.frame-help')).toBeTruthy();
    expect(el.querySelector('mat-progress-bar')).toBeNull();
  });
});
