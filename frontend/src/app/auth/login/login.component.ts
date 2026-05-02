import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    if (this.authService.currentUser()) {
      void this.router.navigate(['/links']);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const { username, password } = this.form.getRawValue();
      await this.authService.login(username, password);
      await this.router.navigate(['/links']);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 429) {
        this.errorMessage.set('Trop de tentatives, réessaie dans quelques instants');
      } else {
        this.errorMessage.set('Identifiant ou mot de passe incorrect');
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
