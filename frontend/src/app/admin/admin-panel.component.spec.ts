import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of } from 'rxjs';
import { AuthService, AuthUser } from '../core/services/auth.service';
import { AdminService, UserListItem } from './admin.service';
import { AdminPanelComponent } from './admin-panel.component';
import { CreateUserDialogComponent } from './create-user-dialog.component';
import { ResetPasswordDialogComponent } from './reset-password-dialog.component';

const me: AuthUser = {
  id: 1,
  username: 'admin@example.com',
  name: 'Admin',
  role: 'admin',
  mustChangePassword: false,
  isActive: true,
  triliumUrl: null,
  notesEnabled: false,
};

const user = (over: Partial<UserListItem>): UserListItem => ({
  id: 2,
  username: 'clara@example.com',
  name: 'Clara',
  role: 'user',
  mustChangePassword: false,
  isActive: true,
  createdAt: '',
  updatedAt: '',
  ...over,
});

describe('AdminPanelComponent (09-admin)', () => {
  let fixture: ComponentFixture<AdminPanelComponent>;
  let el: HTMLElement;
  const users = signal<UserListItem[]>([]);

  beforeEach(async () => {
    users.set([
      user({ id: 1, username: me.username, name: 'Admin', role: 'admin' }),
      user({ id: 2 }),
      user({ id: 3, username: 'sophie@example.com', name: 'Sophie', mustChangePassword: true }),
      user({ id: 4, username: 'thomas@example.com', name: 'Thomas', isActive: false }),
    ]);
    await TestBed.configureTestingModule({
      imports: [AdminPanelComponent],
      providers: [
        provideAnimationsAsync(),
        {
          provide: AdminService,
          useValue: {
            users,
            isLoading: signal(false),
            error: signal<string | null>(null),
            loadUsers: vi.fn(() => of([])),
          },
        },
        { provide: AuthService, useValue: { currentUser: signal<AuthUser | null>(me) } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AdminPanelComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  const rows = () => Array.from(el.querySelectorAll<HTMLElement>('table tr.mat-mdc-row'));

  it('titre et « Nouvel utilisateur » sur la même ligne, bouton plein sans couleur Material', () => {
    const header = el.querySelector('.admin-header') as HTMLElement;
    expect(header.querySelector('h1')?.textContent?.trim()).toBe(
      'Administration — Comptes utilisateurs',
    );
    const button = header.querySelector('button') as HTMLElement;
    expect(button.textContent).toContain('Nouvel utilisateur');
    expect(button.querySelector('mat-icon')?.textContent?.trim()).toBe('person_add');
    expect(button.getAttribute('color')).toBeNull();
  });

  it('rôle en pastille, libellé brut conservé', () => {
    const [adminRow, userRow] = rows();
    const adminChip = adminRow.querySelector('.role-chip') as HTMLElement;
    expect(adminChip.textContent?.trim()).toBe('admin');
    expect(adminChip.classList).toContain('role-chip-admin');
    const userChip = userRow.querySelector('.role-chip') as HTMLElement;
    expect(userChip.textContent?.trim()).toBe('user');
    expect(userChip.classList).not.toContain('role-chip-admin');
  });

  it('statut en point + texte, `.badge-inactive` conservé pour un compte inactif', () => {
    expect(rows()[1].querySelector('.status-indicator.badge-active')?.textContent?.trim()).toBe(
      'Actif',
    );
    expect(rows()[3].querySelector('.badge-inactive')?.textContent?.trim()).toBe('Inactif');
  });

  it('mot de passe temporaire : « Oui » en pastille avec cadenas, sinon « Non »', () => {
    const chip = rows()[2].querySelector('.temp-chip') as HTMLElement;
    expect(chip.textContent).toContain('Oui');
    expect(chip.querySelector('mat-icon')?.textContent?.trim()).toBe('lock');
    expect(rows()[1].querySelector('.temp-no')?.textContent?.trim()).toBe('Non');
  });

  it('actions : icônes de la maquette, aria-label et logique inchangés', () => {
    const [mine, active, , inactive] = rows();
    expect(mine.querySelectorAll('button').length).toBe(0);
    const icons = (row: HTMLElement) =>
      Array.from(row.querySelectorAll('.row-action mat-icon')).map((i) => i.textContent?.trim());
    expect(icons(active)).toEqual(['key', 'block', 'delete']);
    expect(icons(inactive)).toEqual(['key', 'check', 'delete']);
    expect(active.querySelector('[aria-label="Réinitialiser le mot de passe"]')).toBeTruthy();
    expect(inactive.querySelector('[aria-label="Réactiver le compte"]')).toBeTruthy();
  });

  it('pas de réinitialisation pour un autre admin', () => {
    users.set([user({ id: 5, role: 'admin' })]);
    fixture.detectChanges();
    expect(rows()[0].querySelector('[aria-label="Réinitialiser le mot de passe"]')).toBeNull();
  });

  it('dialogs ouverts avec le style Ember et les largeurs des maquettes', () => {
    const open = vi
      .spyOn((fixture.componentInstance as any).dialog, 'open')
      .mockReturnValue({ afterClosed: () => of(undefined) } as never);
    fixture.componentInstance.openCreateUserDialog();
    expect(open).toHaveBeenCalledWith(
      CreateUserDialogComponent,
      expect.objectContaining({ width: '440px', panelClass: 'ember-form-dialog' }),
    );
    fixture.componentInstance.openResetPasswordDialog(users()[1]);
    expect(open).toHaveBeenCalledWith(
      ResetPasswordDialogComponent,
      expect.objectContaining({ width: '460px', panelClass: 'ember-form-dialog' }),
    );
  });
});
