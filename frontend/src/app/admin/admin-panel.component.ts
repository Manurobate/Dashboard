import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AdminService, UserListItem } from './admin.service';
import { CreateUserDialogComponent } from './create-user-dialog.component';
import { ResetPasswordDialogComponent, ResetPasswordDialogData } from './reset-password-dialog.component';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatChipsModule,
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
  private readonly dialog = inject(MatDialog);

  readonly displayedColumns = ['username', 'name', 'role', 'isActive', 'mustChangePassword', 'actions'];

  ngOnInit(): void {
    this.adminService.loadUsers().subscribe();
  }

  openCreateUserDialog(): void {
    this.dialog.open(CreateUserDialogComponent, { width: '400px', disableClose: false });
  }

  openResetPasswordDialog(user: UserListItem): void {
    this.dialog.open(ResetPasswordDialogComponent, {
      width: '420px',
      disableClose: false,
      data: { userId: user.id, username: user.username } satisfies ResetPasswordDialogData,
    });
  }
}
