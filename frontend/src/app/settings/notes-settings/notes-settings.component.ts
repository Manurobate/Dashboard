import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { TriliumService } from './trilium.service';

@Component({
  selector: 'app-notes-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './notes-settings.component.html',
  styleUrl: './notes-settings.component.scss',
})
export class NotesSettingsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly triliumService = inject(TriliumService);

  readonly form = this.fb.nonNullable.group({
    notesEnabled: [false],
    triliumUrl: [''],
  });

  readonly isLoading = signal(false);
  readonly isTesting = signal(false);
  readonly testResult = signal<'success' | 'error' | null>(null);

  private pingSub?: Subscription;

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.form.patchValue({
        notesEnabled: user.notesEnabled,
        triliumUrl: user.triliumUrl ?? '',
      });
    }

    this.form.controls.triliumUrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        // Annule un test en cours : sa réponse concernerait une URL qui n'est plus dans le champ
        this.pingSub?.unsubscribe();
        this.testResult.set(null);
      });
  }

  canTest(): boolean {
    return !!this.form.controls.triliumUrl.value.trim() && !this.isTesting();
  }

  onTest(): void {
    const url = this.form.controls.triliumUrl.value.trim();
    if (!url) return;

    this.pingSub?.unsubscribe();
    this.isTesting.set(true);
    this.testResult.set(null);
    this.pingSub = this.triliumService
      .ping(url)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isTesting.set(false)),
      )
      .subscribe({
        next: (res) => this.testResult.set(res.reachable ? 'success' : 'error'),
        error: () => this.testResult.set('error'),
      });
  }

  onSubmit(): void {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    const { notesEnabled, triliumUrl } = this.form.getRawValue();
    this.authService
      .updateNotesSettings({ notesEnabled, triliumUrl: triliumUrl || null })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: () => {
          this.snackBar.open('Paramètres sauvegardés', undefined, { duration: 3000 });
        },
        error: () => {
          this.snackBar.open('Impossible de sauvegarder les paramètres', undefined, {
            duration: 4000,
            panelClass: 'snackbar-error',
          });
        },
      });
  }
}
