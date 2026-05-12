import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { AdminService } from './admin.service';

type DialogState = 'confirm' | 'password-reveal';

export interface ResetPasswordDialogData {
  userId: number;
  username: string;
}

@Component({
  selector: 'app-reset-password-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './reset-password-dialog.component.html',
  styleUrl: './reset-password-dialog.component.scss',
})
export class ResetPasswordDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ResetPasswordDialogComponent>);
  readonly data = inject<ResetPasswordDialogData>(MAT_DIALOG_DATA);
  private readonly adminService = inject(AdminService);
  private readonly snackBar = inject(MatSnackBar);

  readonly state = signal<DialogState>('confirm');
  readonly isSubmitting = signal(false);
  readonly tempPassword = signal('');

  confirm(): void {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);

    this.adminService
      .resetPassword(this.data.userId)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (response) => {
          this.tempPassword.set(response.temporaryPassword);
          this.dialogRef.disableClose = true;
          this.state.set('password-reveal');
          this.adminService.loadUsers().subscribe({ error: () => {} });
        },
        error: (err: HttpErrorResponse) => {
          const message = err.error?.message ?? 'Impossible de réinitialiser le mot de passe';
          this.snackBar.open(message, 'Fermer', { duration: 4000 });
        },
      });
  }

  copyPassword(): void {
    navigator.clipboard.writeText(this.tempPassword()).catch(() => {
      this.snackBar.open('Impossible de copier dans le presse-papier', 'Fermer', {
        duration: 3000,
      });
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
