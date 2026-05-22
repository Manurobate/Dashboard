import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { AdminService, UserListItem } from './admin.service';
import { AuthService } from '../core/services/auth.service';
import { CreateUserDialogComponent } from './create-user-dialog.component';
import { ResetPasswordDialogComponent, ResetPasswordDialogData } from './reset-password-dialog.component';
import { ConfirmDestructiveDialogComponent, ConfirmDestructiveDialogData } from './confirm-destructive-dialog.component';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.scss',
})
export class AdminPanelComponent implements OnInit {
  protected readonly adminService = inject(AdminService);
  protected readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly displayedColumns = ['username', 'name', 'role', 'isActive', 'mustChangePassword', 'actions'];
  readonly isActioning = signal(false);

  ngOnInit(): void {
    this.adminService.loadUsers().subscribe();
  }

  openCreateUserDialog(): void {
    this.dialog.open(CreateUserDialogComponent, { width: '400px', maxWidth: '95vw', disableClose: false });
  }

  openResetPasswordDialog(user: UserListItem): void {
    this.dialog.open(ResetPasswordDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      disableClose: false,
      data: { userId: user.id, username: user.username } satisfies ResetPasswordDialogData,
    });
  }

  enableUser(user: UserListItem): void {
    this.isActioning.set(true);
    this.adminService.enableUser(user.id).pipe(
      finalize(() => this.isActioning.set(false)),
    ).subscribe({
      next: () => {
        this.snackBar.open('Compte réactivé', 'Fermer', { duration: 3000 });
        this.adminService.loadUsers().subscribe({ error: () => {} });
      },
      error: () => {
        this.snackBar.open('Impossible de réactiver le compte', 'Fermer', { duration: 4000 });
      },
    });
  }

  openDisableDialog(user: UserListItem): void {
    const ref = this.dialog.open<ConfirmDestructiveDialogComponent, ConfirmDestructiveDialogData, boolean>(
      ConfirmDestructiveDialogComponent,
      {
        width: '400px',
        maxWidth: '95vw',
        data: {
          title: `Désactiver ${user.username} ?`,
          message: "Le compte sera désactivé. L'utilisateur sera immédiatement déconnecté si sa session était active.",
          confirmLabel: 'Désactiver',
        } satisfies ConfirmDestructiveDialogData,
      },
    );
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.isActioning.set(true);
      this.adminService.disableUser(user.id).pipe(
        finalize(() => this.isActioning.set(false)),
      ).subscribe({
        next: () => {
          this.snackBar.open('Compte désactivé', 'Fermer', { duration: 3000 });
          this.adminService.loadUsers().subscribe({ error: () => {} });
        },
        error: () => {
          this.snackBar.open('Impossible de désactiver le compte', 'Fermer', { duration: 4000 });
        },
      });
    });
  }

  openDeleteDialog(user: UserListItem): void {
    const ref = this.dialog.open<ConfirmDestructiveDialogComponent, ConfirmDestructiveDialogData, boolean>(
      ConfirmDestructiveDialogComponent,
      {
        width: '400px',
        maxWidth: '95vw',
        data: {
          title: `Supprimer ${user.username} ?`,
          message: 'Cette action est irréversible. Le compte sera définitivement supprimé.',
          confirmLabel: 'Supprimer',
        } satisfies ConfirmDestructiveDialogData,
      },
    );
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.isActioning.set(true);
      this.adminService.deleteUser(user.id).pipe(
        finalize(() => this.isActioning.set(false)),
      ).subscribe({
        next: () => {
          this.snackBar.open('Compte supprimé', 'Fermer', { duration: 3000 });
          this.adminService.loadUsers().subscribe({ error: () => {} });
        },
        error: () => {
          this.snackBar.open('Impossible de supprimer le compte', 'Fermer', { duration: 4000 });
        },
      });
    });
  }
}
