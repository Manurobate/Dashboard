import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { AuthService } from '../../core/services/auth.service';
import { ChangePasswordComponent } from './change-password.component';

describe('ChangePasswordComponent — compte (15-mdp-compte)', () => {
  let fixture: ComponentFixture<ChangePasswordComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangePasswordComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: AuthService, useValue: { updatePassword: vi.fn() } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ChangePasswordComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('carte titrée, trois champs reliés à leurs labels existants', () => {
    expect(el.querySelector('h1.form-card-title')?.textContent?.trim()).toBe(
      'Changer le mot de passe',
    );
    const labels = Array.from(el.querySelectorAll<HTMLInputElement>('input[type="password"]')).map(
      (input) => input.labels?.[0]?.textContent?.trim(),
    );
    expect(labels).toEqual([
      'Mot de passe actuel',
      'Nouveau mot de passe',
      'Confirmer le nouveau mot de passe',
    ]);
  });

  it('bouton plein pleine largeur, sans couleur Material', () => {
    const button = el.querySelector('button[type="submit"]') as HTMLElement;
    expect(button.textContent?.trim()).toBe('Changer le mot de passe');
    expect(button.classList).toContain('ember-btn-block');
    expect(button.getAttribute('color')).toBeNull();
  });
});
