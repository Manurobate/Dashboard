import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormControl, FormGroupDirective, NgForm, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const newPassword = control.get('newPassword')?.value as string | undefined;
  const confirmPassword = control.get('confirmPassword')?.value as string | undefined;
  if (newPassword && confirmPassword && newPassword !== confirmPassword) {
    return { passwordMismatch: true };
  }
  return null;
}

// Montre le champ en erreur si le contrôle lui-même est invalide OU si le groupe a l'erreur passwordMismatch
class PasswordMismatchStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const submitted = form?.submitted ?? false;
    const ownError = !!(control?.invalid && (control.dirty || control.touched || submitted));
    const groupMismatch = !!(control?.touched && control?.parent?.hasError('passwordMismatch'));
    return ownError || groupMismatch;
  }
}

@Component({
  selector: 'app-account-change-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss'],
})
export class ChangePasswordComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
    },
    { validators: passwordMatchValidator },
  );

  readonly isLoading = signal(false);
  readonly generalError = signal<string | null>(null);
  readonly passwordMismatchMatcher = new PasswordMismatchStateMatcher();

  constructor() {
    // Efface l'erreur serveur dès que l'utilisateur retape dans le champ
    this.form.get('currentPassword')!.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      const ctrl = this.form.get('currentPassword')!;
      if (ctrl.hasError('serverError')) {
        ctrl.updateValueAndValidity({ emitEvent: false });
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.isLoading()) return;

    this.isLoading.set(true);
    this.generalError.set(null);

    const { currentPassword, newPassword, confirmPassword } = this.form.getRawValue();
    this.authService.updatePassword(currentPassword, newPassword, confirmPassword).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.snackBar.open('Mot de passe mis à jour', undefined, { duration: 3000 });
        void this.router.navigate(['/links']);
      },
      error: (err: unknown) => {
        const status = (err as { status?: number })?.status;
        if (status === 401) {
          this.form.get('currentPassword')?.setErrors({ serverError: true });
        } else {
          this.generalError.set('Une erreur est survenue');
        }
        this.isLoading.set(false);
      },
    });
  }
}
