import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminService } from './admin.service';

type DialogState = 'form' | 'password-reveal';

@Component({
  selector: 'app-create-user-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule,
  ],
  templateUrl: './create-user-dialog.component.html',
  styleUrl: './create-user-dialog.component.scss',
})
export class CreateUserDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<CreateUserDialogComponent>);
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);

  readonly state = signal<DialogState>('form');
  readonly isSubmitting = signal(false);
  readonly tempPassword = signal('');
  readonly conflictError = signal(false);
  readonly genericError = signal(false);

  readonly form = this.fb.group({
    username: ['', [Validators.required, Validators.email]],
    name: ['', [Validators.required, Validators.maxLength(255)]],
  });

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) return;
    this.conflictError.set(false);
    this.genericError.set(false);
    this.isSubmitting.set(true);

    const { username, name } = this.form.value;
    this.adminService.createUser(username!, name!).subscribe({
      next: (response) => {
        this.tempPassword.set(response.temporaryPassword);
        this.dialogRef.disableClose = true;
        this.state.set('password-reveal');
        this.isSubmitting.set(false);
        this.adminService.loadUsers().subscribe({ error: () => {} });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        if (err.status === 409) {
          // markAsTouched active l'errorState Angular Material (invalid && touched)
          // ce qui permet la projection ng-content du mat-error dans le subscript wrapper
          this.form.controls.username.setErrors({ conflict: true });
          this.form.controls.username.markAsTouched();
          this.conflictError.set(true);
        } else {
          this.genericError.set(true);
        }
      },
    });
  }

  copyPassword(): void {
    navigator.clipboard.writeText(this.tempPassword()).catch(() => {});
  }

  close(): void {
    this.dialogRef.close();
  }
}
