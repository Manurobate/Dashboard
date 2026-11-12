import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { AuthService, AuthUser } from '../../core/services/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent (13-login)', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let el: HTMLElement;
  let authService: {
    currentUser: ReturnType<typeof signal<AuthUser | null>>;
    login: ReturnType<typeof vi.fn>;
  };
  const router = { navigate: vi.fn().mockResolvedValue(true) };

  beforeEach(async () => {
    authService = { currentUser: signal<AuthUser | null>(null), login: vi.fn() };
    router.navigate.mockClear();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  const submitWith = async (error: unknown) => {
    authService.login.mockRejectedValue(error);
    fixture.componentInstance.form.setValue({ username: 'a@b.fr', password: 'x' });
    await fixture.componentInstance.onSubmit();
    fixture.detectChanges();
  };

  it('affiche le logo, le titre et le sous-titre de la maquette', () => {
    expect(el.querySelector('img.login-logo')?.getAttribute('src')).toBe('icon-app.svg');
    expect(el.querySelector('h1.login-title')?.textContent?.trim()).toBe('Dashboard');
    expect(el.querySelector('.login-subtitle')?.textContent?.trim()).toBe(
      'Connexion à votre espace',
    );
  });

  it('relie chaque label visible à son champ', () => {
    const email = el.querySelector('input[autocomplete="email"]') as HTMLInputElement;
    const password = el.querySelector('input[autocomplete="current-password"]') as HTMLInputElement;
    expect(email.labels?.[0]?.textContent?.trim()).toBe('Adresse e-mail');
    expect(password.labels?.[0]?.textContent?.trim()).toBe('Mot de passe');
  });

  it('sans erreur : ni message ni bordure rouge', () => {
    expect(el.querySelector('.form-error')).toBeNull();
    expect(el.querySelector('.field-error-state')).toBeNull();
  });

  it('401 : message actuel sous le mot de passe, avec icône et bordure rouge', async () => {
    await submitWith({ status: 401 });
    const error = el.querySelector('p.form-error') as HTMLElement;
    expect(error.textContent).toContain('Email ou mot de passe incorrect');
    expect(error.querySelector('mat-icon')?.textContent?.trim()).toBe('error');
    expect(error.getAttribute('role')).toBe('alert');
    const password = el.querySelector('input[autocomplete="current-password"]') as HTMLElement;
    expect(password.closest('.field-error-state')).toBeTruthy();
    expect(password.getAttribute('aria-describedby')).toBe('login-error');
  });

  it('429 : message actuel, même rendu', async () => {
    await submitWith({ status: 429 });
    expect(el.querySelector('p.form-error')?.textContent).toContain('Trop de tentatives');
    expect(el.querySelector('.field-error-state')).toBeTruthy();
  });

  it('bouton « Connexion » plein, pleine largeur, sans couleur Material', () => {
    const button = el.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe('Connexion');
    expect(button.classList).toContain('ember-btn-block');
    expect(button.getAttribute('color')).toBeNull();
  });
});
