import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { BottomNavComponent } from './bottom-nav.component';
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
};

describe('BottomNavComponent', () => {
  beforeEach(async () => {
    mockAuthService.currentUser.set(mockUser);
    await TestBed.configureTestingModule({
      imports: [BottomNavComponent],
      providers: [provideRouter(routes), { provide: AuthService, useValue: mockAuthService }],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(BottomNavComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render 3 navigation items', async () => {
    const fixture = TestBed.createComponent(BottomNavComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const items = compiled.querySelectorAll('.bottom-nav-item');
    expect(items.length).toBe(3);
  });

  it('should have aria-label on each nav link', async () => {
    const fixture = TestBed.createComponent(BottomNavComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const items = compiled.querySelectorAll('a.bottom-nav-item');
    items.forEach((item) => {
      expect(item.getAttribute('aria-label')).toBeTruthy();
    });
  });

  it('should navigate to /dashboard, /recipes, /notes', async () => {
    const fixture = TestBed.createComponent(BottomNavComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('a.bottom-nav-item');
    expect(links[0].getAttribute('href')).toContain('/dashboard');
    expect(links[1].getAttribute('href')).toContain('/recipes');
    expect(links[2].getAttribute('href')).toContain('/notes');
  });

  it('should hide the Notes item when notesEnabled is false', async () => {
    mockAuthService.currentUser.set({ ...mockUser, notesEnabled: false });
    const fixture = TestBed.createComponent(BottomNavComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const items = compiled.querySelectorAll('.bottom-nav-item');
    expect(items.length).toBe(2);
  });
});
