import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { TopBarComponent } from './top-bar.component';
import { routes } from '../../../app.routes';
import { AuthService, AuthUser } from '../../services/auth.service';

const mockUser: AuthUser = {
  id: 1,
  username: 'test',
  name: 'Test User',
  role: 'user',
  mustChangePassword: false,
  isActive: true,
  triliumUrl: null,
  notesEnabled: true,
};

const currentUser = signal<AuthUser | null>(mockUser);
const mockAuthService = {
  currentUser,
  logout: vi.fn(),
};

describe('TopBarComponent', () => {
  beforeEach(async () => {
    currentUser.set(mockUser);
    await TestBed.configureTestingModule({
      imports: [TopBarComponent],
      providers: [provideRouter(routes), { provide: AuthService, useValue: mockAuthService }],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(TopBarComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display app title', async () => {
    const fixture = TestBed.createComponent(TopBarComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.app-title')?.textContent).toContain('Dashboard');
  });

  it('should have aria-label on theme toggle button', async () => {
    const fixture = TestBed.createComponent(TopBarComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const themeBtn = compiled.querySelectorAll('button[mat-icon-button]')[0];
    const label = themeBtn?.getAttribute('aria-label');
    expect(['Activer le thème clair', 'Activer le thème sombre']).toContain(label);
  });

  it('should have aria-label on user menu button', async () => {
    const fixture = TestBed.createComponent(TopBarComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const userBtn = compiled.querySelectorAll('button[mat-icon-button]')[1];
    expect(userBtn?.getAttribute('aria-label')).toBe('Menu utilisateur');
  });

  it('should render 3 navigation links', async () => {
    const fixture = TestBed.createComponent(TopBarComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const navLinks = compiled.querySelectorAll('a[mat-tab-link]');
    expect(navLinks.length).toBe(3);
  });

  it('masque les onglets tant que le mot de passe doit être changé (14-mdp-force)', async () => {
    currentUser.set({ ...mockUser, mustChangePassword: true });
    const fixture = TestBed.createComponent(TopBarComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('nav.desktop-nav')).toBeNull();
    expect(compiled.querySelector('button.theme-toggle')).toBeTruthy();
    expect(compiled.querySelector('button[aria-label="Menu utilisateur"]')).toBeTruthy();
  });

  const initial = async (user: Partial<AuthUser>): Promise<string | undefined> => {
    currentUser.set({ ...mockUser, ...user });
    const fixture = TestBed.createComponent(TopBarComponent);
    await fixture.whenStable();
    return (fixture.nativeElement as HTMLElement)
      .querySelector('.avatar-initial')
      ?.textContent?.trim();
  };

  it('should show the uppercase initial of the name', async () => {
    expect(await initial({ name: 'manu' })).toBe('M');
  });

  it('should fall back to the username initial', async () => {
    expect(await initial({ name: '', username: 'zoe@x.fr' })).toBe('Z');
  });

  it('should fall back to ? when name and username are empty', async () => {
    expect(await initial({ name: '', username: '' })).toBe('?');
  });

  it('should show Administration only for admins', async () => {
    for (const [role, expected] of [
      ['admin', true],
      ['user', false],
    ] as const) {
      currentUser.set({ ...mockUser, role });
      const fixture = TestBed.createComponent(TopBarComponent);
      await fixture.whenStable();
      (fixture.nativeElement as HTMLElement)
        .querySelector<HTMLElement>('button.user-avatar')
        ?.click();
      await fixture.whenStable();
      const items = Array.from(document.querySelectorAll('.mat-mdc-menu-item')).map((e) =>
        e.textContent?.trim(),
      );
      expect(items.length).toBeGreaterThan(0);
      expect(items.some((t) => t?.includes('Administration'))).toBe(expected);
      fixture.destroy();
    }
  });

  it('passe en mini top bar (classe public-view) sur une vue publique /share/*', async () => {
    currentUser.set(null);
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(TopBarComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.classList.contains('public-view')).toBe(false);

    await router.navigateByUrl('/share/abc123');
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.classList.contains('public-view')).toBe(true);
    expect(host.querySelector('.desktop-nav')).toBeFalsy();
    expect(host.querySelector('.theme-toggle')).toBeTruthy();

    await router.navigateByUrl('/login');
    fixture.detectChanges();
    expect(host.classList.contains('public-view')).toBe(false);
  });

  it('garde la navigation du propriétaire connecté sur /share/*, en mini top bar', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(TopBarComponent);
    await router.navigateByUrl('/share/abc123');
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.classList.contains('public-view')).toBe(true);
    expect(host.querySelector('.desktop-nav')).toBeTruthy();
  });
});
