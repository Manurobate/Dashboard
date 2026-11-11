import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { AuthService, AuthUser } from '../core/services/auth.service';
import { ProfileComponent } from './profile.component';

const mockUser: AuthUser = {
  id: 1,
  username: 'manu@example.com',
  name: 'Manu',
  role: 'admin',
  mustChangePassword: false,
  isActive: true,
  triliumUrl: null,
  notesEnabled: false,
};

describe('ProfileComponent (16-profile)', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let el: HTMLElement;
  const router = { navigate: vi.fn().mockResolvedValue(true) };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideAnimationsAsync(),
        {
          provide: AuthService,
          useValue: { currentUser: signal<AuthUser | null>(mockUser), updateProfile: vi.fn() },
        },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProfileComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('titre « Mon profil »', () => {
    expect(el.querySelector('h1.form-card-title')?.textContent?.trim()).toBe('Mon profil');
  });

  it('e-mail en lecture seule, label existant et pastille « lecture seule »', () => {
    const email = el.querySelector('#profile-email') as HTMLInputElement;
    expect(email.readOnly).toBe(true);
    expect(email.value).toBe('manu@example.com');
    const label = email.labels?.[0] as HTMLLabelElement;
    expect(label.textContent).toContain('Adresse email');
    expect(label.querySelector('.readonly-chip')?.textContent?.trim()).toBe('lecture seule');
  });

  it('nom d’affichage relié à son label', () => {
    const name = el.querySelector('input[formcontrolname="name"]') as HTMLInputElement;
    expect(name.labels?.[0]?.textContent?.trim()).toBe("Nom d'affichage");
    expect(name.value).toBe('Manu');
  });

  it('« Changer le mot de passe » bordé accentué, « Sauvegarder » plein', () => {
    const [change, save] = Array.from(el.querySelectorAll('.actions button')) as HTMLElement[];
    expect(change.textContent?.trim()).toBe('Changer le mot de passe');
    expect(change.classList).toContain('ember-btn-accent');
    expect(change.hasAttribute('mat-stroked-button')).toBe(true);
    expect(save.textContent?.trim()).toBe('Sauvegarder');
    expect(save.hasAttribute('mat-flat-button')).toBe(true);
    change.click();
    expect(router.navigate).toHaveBeenCalledWith(['/account/change-password']);
  });
});
