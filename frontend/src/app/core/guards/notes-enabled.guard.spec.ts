import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { notesEnabledGuard } from './notes-enabled.guard';
import { AuthService, AuthUser } from '../services/auth.service';

const baseUser: AuthUser = {
  id: 1,
  username: 'test',
  name: 'Test User',
  role: 'user',
  mustChangePassword: false,
  isActive: true,
  triliumUrl: null,
  notesEnabled: true,
};

describe('notesEnabledGuard', () => {
  const currentUser = signal<AuthUser | null>(null);
  const me = vi.fn();
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  const run = () =>
    TestBed.runInInjectionContext(() => notesEnabledGuard(route, state)) as Promise<
      boolean | UrlTree
    >;

  beforeEach(() => {
    currentUser.set(null);
    me.mockReset();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { currentUser, me } }],
    });
  });

  it('autorise quand notesEnabled = true', async () => {
    currentUser.set(baseUser);
    expect(await run()).toBe(true);
    expect(me).not.toHaveBeenCalled();
  });

  it('redirige vers /dashboard quand notesEnabled = false', async () => {
    currentUser.set({ ...baseUser, notesEnabled: false });
    const result = await run();
    expect(result instanceof UrlTree).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/dashboard');
  });

  it('appelle me() quand le signal est vide et autorise si activé', async () => {
    me.mockResolvedValue(baseUser);
    expect(await run()).toBe(true);
    expect(me).toHaveBeenCalledTimes(1);
  });

  it('appelle me() quand le signal est vide et redirige vers /dashboard si désactivé', async () => {
    me.mockResolvedValue({ ...baseUser, notesEnabled: false });
    const result = await run();
    expect(me).toHaveBeenCalledTimes(1);
    expect(result instanceof UrlTree).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/dashboard');
  });

  it('redirige vers /login quand me() renvoie null', async () => {
    me.mockResolvedValue(null);
    const result = await run();
    expect(result instanceof UrlTree).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login');
  });

  it('redirige vers /login quand me() échoue', async () => {
    me.mockRejectedValue(new Error('401'));
    const result = await run();
    expect(result instanceof UrlTree).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login');
  });
});
