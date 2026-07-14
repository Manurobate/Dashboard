import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { HttpErrorResponse, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { authErrorInterceptor } from './auth-error.interceptor';
import { AuthService } from '../services/auth.service';

describe('authErrorInterceptor', () => {
  let router: { navigate: ReturnType<typeof vi.fn> };
  let authService: { refreshToken: ReturnType<typeof vi.fn> };

  function setup(pathname: string): void {
    router = { navigate: vi.fn() };
    authService = { refreshToken: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService },
        { provide: DOCUMENT, useValue: { location: { pathname } } },
      ],
    });
  }

  function run(req: HttpRequest<unknown>, next: HttpHandlerFn) {
    return TestBed.runInInjectionContext(() => authErrorInterceptor(req, next));
  }

  it('sur une route publique /share, propage le 401 sans refresh ni redirection', () => {
    setup('/share/abc123');
    const req = new HttpRequest('GET', '/api/auth/me');
    const next: HttpHandlerFn = () => throwError(() => new HttpErrorResponse({ status: 401 }));

    let caught: unknown;
    run(req, next).subscribe({ error: (e) => (caught = e) });

    expect(caught).toBeInstanceOf(HttpErrorResponse);
    expect(authService.refreshToken).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('sur une route protégée, un 401 non rafraîchissable redirige vers /login', () => {
    setup('/dashboard');
    authService.refreshToken.mockReturnValue(of(false));
    const req = new HttpRequest('GET', '/api/auth/me');
    const next: HttpHandlerFn = () => throwError(() => new HttpErrorResponse({ status: 401 }));

    run(req, next).subscribe();

    expect(authService.refreshToken).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
