import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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

const mockAuthService = {
  currentUser: signal<AuthUser | null>(mockUser),
  logout: vi.fn(),
};

describe('TopBarComponent', () => {
  beforeEach(async () => {
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
});
