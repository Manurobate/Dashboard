import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of } from 'rxjs';
import { AdminService } from './admin.service';
import { CreateUserDialogComponent } from './create-user-dialog.component';

describe('CreateUserDialogComponent (21a/21b)', () => {
  let fixture: ComponentFixture<CreateUserDialogComponent>;
  let el: HTMLElement;
  const adminService = { createUser: vi.fn(), loadUsers: vi.fn(() => of([])) };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateUserDialogComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
        { provide: AdminService, useValue: adminService },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CreateUserDialogComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('formulaire : labels au-dessus avec astérisque, reliés aux champs', () => {
    const email = el.querySelector('input[formcontrolname="username"]') as HTMLInputElement;
    const name = el.querySelector('input[formcontrolname="name"]') as HTMLInputElement;
    expect(email.labels?.[0]?.textContent?.trim()).toBe('Adresse e-mail*');
    expect(name.labels?.[0]?.textContent?.trim()).toBe("Nom d'affichage*");
    expect(email.labels?.[0]?.querySelector('.field-required')).toBeTruthy();
    expect(email.getAttribute('aria-required')).toBe('true');
  });

  it('actions : « Annuler » en pilule douce, « Créer » plein, sans couleur Material', () => {
    const [cancel, create] = Array.from(el.querySelectorAll('mat-dialog-actions button'));
    expect(cancel.textContent?.trim()).toBe('Annuler');
    expect(cancel.classList).toContain('dialog-cancel');
    expect(create.textContent?.trim()).toBe('Créer');
    expect(create.classList).toContain('dialog-confirm');
    expect(el.querySelector('[color]')).toBeNull();
  });
});
