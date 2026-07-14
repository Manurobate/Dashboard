import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { NotesSettingsComponent } from './notes-settings.component';
import { AuthService, AuthUser } from '../../core/services/auth.service';

const mockUser: AuthUser = {
  id: 1,
  username: 'test',
  name: 'Test User',
  role: 'user',
  mustChangePassword: false,
  isActive: true,
  triliumUrl: null,
  notesEnabled: false,
};

describe('NotesSettingsComponent', () => {
  let component: NotesSettingsComponent;
  let fixture: ComponentFixture<NotesSettingsComponent>;
  let authService: {
    currentUser: ReturnType<typeof signal<AuthUser | null>>;
    updateNotesSettings: ReturnType<typeof vi.fn>;
  };
  let snackBar: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authService = {
      currentUser: signal<AuthUser | null>(mockUser),
      updateNotesSettings: vi.fn(),
    };
    snackBar = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [NotesSettingsComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: AuthService, useValue: authService },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotesSettingsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('pré-remplit le formulaire depuis authService.currentUser()', () => {
    authService.currentUser.set({
      ...mockUser,
      notesEnabled: true,
      triliumUrl: 'https://trilium.example.fr',
    });
    fixture.detectChanges();

    expect(component.form.controls.notesEnabled.value).toBe(true);
    expect(component.form.controls.triliumUrl.value).toBe('https://trilium.example.fr');
  });

  it('masque le champ URL quand notesEnabled est false', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('input[formcontrolname="triliumUrl"]')).toBeNull();
  });

  it('affiche le champ URL quand notesEnabled est true', () => {
    fixture.detectChanges();
    component.form.controls.notesEnabled.setValue(true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('input[formcontrolname="triliumUrl"]')).not.toBeNull();
  });

  it('onSubmit — succès : appelle updateNotesSettings et affiche le snackbar de succès', () => {
    authService.updateNotesSettings.mockReturnValue(
      of({ notesEnabled: true, triliumUrl: 'https://trilium.example.fr' }),
    );
    fixture.detectChanges();

    component.form.setValue({
      notesEnabled: true,
      triliumUrl: 'https://trilium.example.fr',
    });
    component.onSubmit();

    expect(authService.updateNotesSettings).toHaveBeenCalledWith({
      notesEnabled: true,
      triliumUrl: 'https://trilium.example.fr',
    });
    expect(snackBar.open).toHaveBeenCalledWith('Paramètres sauvegardés', undefined, {
      duration: 3000,
    });
    expect(component.isLoading()).toBe(false);
  });

  it('onSubmit — envoie triliumUrl=null quand le champ est vide', () => {
    authService.updateNotesSettings.mockReturnValue(of({ notesEnabled: false, triliumUrl: null }));
    fixture.detectChanges();

    component.form.setValue({ notesEnabled: false, triliumUrl: '' });
    component.onSubmit();

    expect(authService.updateNotesSettings).toHaveBeenCalledWith({
      notesEnabled: false,
      triliumUrl: null,
    });
  });

  it('onSubmit — erreur : affiche le snackbar d’erreur', () => {
    authService.updateNotesSettings.mockReturnValue(throwError(() => new Error('fail')));
    fixture.detectChanges();

    component.onSubmit();

    expect(snackBar.open).toHaveBeenCalledWith(
      'Impossible de sauvegarder les paramètres',
      undefined,
      { duration: 4000 },
    );
    expect(component.isLoading()).toBe(false);
  });
});
