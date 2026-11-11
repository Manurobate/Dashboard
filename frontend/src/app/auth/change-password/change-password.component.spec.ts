import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ChangePasswordComponent } from './change-password.component';

describe('ChangePasswordComponent — mot de passe imposé (14-mdp-force)', () => {
  let fixture: ComponentFixture<ChangePasswordComponent>;
  let el: HTMLElement;
  const authService = { changePassword: vi.fn() };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangePasswordComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ChangePasswordComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('titre, sous-titre et aide « 8 caractères minimum. »', () => {
    expect(el.querySelector('h1.form-card-title')?.textContent?.trim()).toBe(
      'Choisissez un nouveau mot de passe',
    );
    expect(el.querySelector('.form-card-subtitle')?.textContent?.trim()).toBe(
      'Première connexion — définissez votre mot de passe personnel pour continuer.',
    );
    expect(el.querySelector('mat-hint')?.textContent?.trim()).toBe('8 caractères minimum.');
  });

  it('labels reliés aux champs', () => {
    const inputs = el.querySelectorAll<HTMLInputElement>('input[type="password"]');
    expect(inputs[0].labels?.[0]?.textContent?.trim()).toBe('Nouveau mot de passe');
    expect(inputs[1].labels?.[0]?.textContent?.trim()).toBe('Confirmer le mot de passe');
  });

  it('erreur serveur : bandeau au-dessus des champs, message inchangé', () => {
    authService.changePassword.mockReturnValue(
      throwError(() => ({ status: 500, error: { message: 'Impossible pour le moment' } })),
    );
    fixture.componentInstance.form.setValue({
      newPassword: 'Password123',
      confirmPassword: 'Password123',
    });
    fixture.componentInstance.onSubmit();
    fixture.detectChanges();

    const banner = el.querySelector('p.form-error.form-error-banner') as HTMLElement;
    expect(banner.textContent).toContain('Impossible pour le moment');
    expect(banner.getAttribute('role')).toBe('alert');
    const form = el.querySelector('form') as HTMLElement;
    expect(banner.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
