import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of } from 'rxjs';
import { AdminService } from './admin.service';
import { ResetPasswordDialogComponent } from './reset-password-dialog.component';

describe('ResetPasswordDialogComponent (22a/22b)', () => {
  let fixture: ComponentFixture<ResetPasswordDialogComponent>;
  let el: HTMLElement;
  const adminService = { resetPassword: vi.fn(), loadUsers: vi.fn(() => of([])) };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResetPasswordDialogComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: MAT_DIALOG_DATA, useValue: { userId: 2, username: 'clara@example.com' } },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
        { provide: AdminService, useValue: adminService },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ResetPasswordDialogComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('confirmation : « Annuler » en pilule douce, « Réinitialiser » plein, sans color="warn"', () => {
    const [cancel, confirm] = Array.from(el.querySelectorAll('mat-dialog-actions button'));
    expect(cancel.textContent?.trim()).toBe('Annuler');
    expect(cancel.classList).toContain('dialog-cancel');
    expect(confirm.textContent?.trim()).toBe('Réinitialiser');
    expect(confirm.classList).toContain('dialog-confirm');
    expect(el.querySelector('[color="warn"]')).toBeNull();
    expect(el.querySelector('strong')?.textContent).toBe('clara@example.com');
  });

  it('révélation : mot de passe dans la boîte, copie et « Fermer »', () => {
    adminService.resetPassword.mockReturnValue(of({ temporaryPassword: 'Abc-123' }));
    fixture.componentInstance.confirm();
    fixture.detectChanges();
    expect(el.querySelector('.temp-password-box .temp-password-value')?.textContent).toBe(
      'Abc-123',
    );
    expect(el.querySelector('button[aria-label="Copier le mot de passe"]')).toBeTruthy();
    expect(el.querySelector('mat-dialog-actions button')?.textContent?.trim()).toBe('Fermer');
  });
});
